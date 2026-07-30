import chromium from "@sparticuz/chromium";
import puppeteer, { type Browser } from "puppeteer-core";
import { logger } from "../../lib/logger";
import fs from "fs";

// ─── executable path — resolved once, cached forever ────────────────────────

// @sparticuz/chromium decompresses ~100 MB to /tmp on first call. Doing this
// eagerly at module load means the binary is ready before the first HTTP
// request arrives, so the cold-start delay never blocks a user request.
let _execPathPromise: Promise<string> | null = null;

async function _doResolve(): Promise<string> {
  const fromEnv = [
    process.env["PUPPETEER_EXECUTABLE_PATH"],
    process.env["REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE"],
    process.env["CHROME_BIN"],
    process.env["GOOGLE_CHROME_BIN"],
  ];
  for (const c of fromEnv) {
    if (c && c.trim()) return c.trim();
  }

  try {
    const path = await chromium.executablePath();
    if (path) return path;
  } catch {
    // not available in this environment
  }

  const wellKnown = [
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/opt/google/chrome/chrome",
    "/opt/google/chrome/google-chrome",
    "/snap/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ];
  for (const p of wellKnown) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {
      // ignore
    }
  }

  throw new Error(
    "No Chromium executable found. " +
      "Set PUPPETEER_EXECUTABLE_PATH to a Chrome/Chromium binary, " +
      "or ensure @sparticuz/chromium is installed.",
  );
}

function resolveExecutablePath(): Promise<string> {
  if (!_execPathPromise) {
    _execPathPromise = _doResolve().catch((e) => {
      _execPathPromise = null; // allow retry after a transient failure
      throw e;
    });
  }
  return _execPathPromise;
}

// Pre-warm: kick off binary extraction at module load so the first PDF request
// doesn't pay the decompression cost.
resolveExecutablePath().catch(() => undefined);

// ─── renderer ────────────────────────────────────────────────────────────────

export interface RenderPdfOptions {
  /** Keep the historical 95% scale by default; Fleet Offer uses exact A4 geometry. */
  scale?: number;
  /** Optional fixed-page layout guard used by legally constrained documents. */
  layoutGuard?: {
    selector: string;
    expectedElements: number;
  };
}

/** Render an HTML string to an A4 PDF Buffer via headless Chromium. */
export async function renderPdf(
  html: string,
  options: RenderPdfOptions = {},
): Promise<Buffer> {
  const executablePath = await resolveExecutablePath();
  logger.info({ executablePath }, "PDF render: launching browser");
  let browser: Browser | null = null;
  try {
    browser = await puppeteer.launch({
      executablePath,
      headless: chromium.headless,
      args: [
        ...chromium.args,
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
      timeout: 30000,
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load", timeout: 20000 });
    // Wait for embedded base64 @font-face fonts before printing.
    // Bounded at 5 s so a font failure never hangs the render.
    await page
      .evaluate(
        `new Promise((resolve) => {
          var f = (self.document && self.document.fonts) || null;
          var done = (f && f.ready) ? f.ready : Promise.resolve();
          var guard = setTimeout(resolve, 5000);
          Promise.resolve(done).then(function () { clearTimeout(guard); resolve(); });
        })`,
      )
      .catch(() => undefined);
    if (options.layoutGuard) {
      const result = await page.evaluate(
        ({
          selector,
          expectedElements,
        }: {
          selector: string;
          expectedElements: number;
        }) => {
          const browserGlobal = globalThis as unknown as {
            document: {
              querySelectorAll: (selector: string) => ArrayLike<{
                scrollHeight: number;
                clientHeight: number;
              }>;
            };
          };
          const elements = Array.from(
            browserGlobal.document.querySelectorAll(selector),
          );
          return {
            count: elements.length,
            expectedElements,
            overflowing: elements
              .map((element, index) => ({
                index,
                scrollHeight: element.scrollHeight,
                clientHeight: element.clientHeight,
              }))
              .filter((item) => item.scrollHeight > item.clientHeight + 1),
          };
        },
        options.layoutGuard,
      );
      if (
        result.count !== result.expectedElements ||
        result.overflowing.length
      ) {
        throw new Error(
          `PDF layout validation failed: expected ${result.expectedElements} ${options.layoutGuard.selector} elements, ` +
            `found ${result.count}; overflowing=${JSON.stringify(result.overflowing)}`,
        );
      }
    }
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      scale: options.scale ?? 0.95,
      timeout: 60000,
    });
    return Buffer.from(pdf);
  } catch (err) {
    logger.error(
      { err: err instanceof Error ? err.message : String(err) },
      "PDF render failed",
    );
    throw err;
  } finally {
    if (browser) await browser.close().catch(() => undefined);
  }
}
