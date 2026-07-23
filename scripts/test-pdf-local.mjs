/**
 * Local test — generates a proposal PDF without needing the API server or DB.
 * Run from project root: node scripts/test-pdf-local.mjs
 * Output: scripts/scraper/output/test.pdf
 */
import path from "path";
import fs from "fs";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

// Import puppeteer-core from the api-server's node_modules (or hoisted root)
// Use pathToFileURL so Node ESM can handle Windows absolute paths.
const puppeteerPath = path.join(ROOT, "node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js");
let puppeteer;
if (fs.existsSync(puppeteerPath)) {
  const { default: p } = await import(pathToFileURL(puppeteerPath).href);
  puppeteer = p;
} else {
  // Try api-server's local node_modules
  const localPath = path.join(ROOT, "artifacts/api-server/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js");
  const { default: p } = await import(pathToFileURL(localPath).href);
  puppeteer = p;
}

async function main() {
  const outDir = path.join(ROOT, "scripts/scraper/output");
  fs.mkdirSync(outDir, { recursive: true });

  console.log("Chrome path:", CHROME);
  console.log("Launching Chrome...");

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  });

  const page = await browser.newPage();
  await page.setContent(
    `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px">
     <h1 style="color:#D4A843">TransYachtGroup PDF Engine Test</h1>
     <p>Chrome binary confirmed working.</p>
     <p>Generated: ${new Date().toISOString()}</p>
     </body></html>`,
    { waitUntil: "load" },
  );

  const pdf = await page.pdf({ format: "A4", printBackground: true });
  await browser.close();

  const outPath = path.join(outDir, "test.pdf");
  fs.writeFileSync(outPath, pdf);
  console.log("PDF written to:", outPath);
  console.log(`Size: ${(pdf.length / 1024).toFixed(1)} KB`);
}

main().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
