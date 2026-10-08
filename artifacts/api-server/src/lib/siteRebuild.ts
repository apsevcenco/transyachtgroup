import type { NextFunction, Request, Response } from "express";

import { logger } from "./logger.ts";

/**
 * The public site is prerendered at build time, so published content only reaches crawlers'
 * HTML after a rebuild. When an admin changes public content we ping the Render Deploy Hook
 * (env RENDER_DEPLOY_HOOK_URL), debounced so a burst of edits causes a single rebuild.
 */
const SITE_URL = "https://www.transyachtgroup.com";
// IndexNow keys are public by design: the key file is served at SITE_URL/<key>.txt.
const INDEXNOW_KEY = process.env.INDEXNOW_KEY || "300b6b772991d08eee65772ab2e16711";
const INDEXNOW_DELAY_MS = 12 * 60 * 1000; // give the rebuilt site time to go live first
const DEBOUNCE_MS = 5 * 60 * 1000;
const MIN_INTERVAL_MS = 10 * 60 * 1000;

// Admin actions that do not change what is shown publicly.
const NON_PUBLISHING = new Set([
  "generate", "generate-cover", "translate-draft", "audit", "fix-seo", "plan", "search-metrics",
  "import", "competitors", "analyze", "opportunities", "daily",
]);

const CONTENT_PATH = /^\/(?:admin\/(?:guides|news|answers|vehicles)|vehicles|content)(?:\/[^/]+)*$/;

/** True when an API request of this method/path can change publicly visible content. */
export function changesPublicContent(method: string, rawPath: string): boolean {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase())) return false;
  const path = rawPath.split("?")[0].replace(/^\/api(?=\/)/, "").replace(/\/+$/, "");
  if (!CONTENT_PATH.test(path)) return false;
  return !path.split("/").some((segment) => NON_PUBLISHING.has(segment));
}

async function sitemapLocs(url: string): Promise<string[]> {
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return [...(await response.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}

/** Tell Bing & other IndexNow engines about every public URL (a few hundred at most). */
export async function submitIndexNow() {
  try {
    const children = await sitemapLocs(`${SITE_URL}/sitemap.xml`);
    const lists = await Promise.all(children.map((child) => sitemapLocs(child).catch(() => [] as string[])));
    const urlList = [...new Set([`${SITE_URL}/`, ...lists.flat()])].filter((u) => u.startsWith(`${SITE_URL}/`)).slice(0, 10_000);
    const response = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host: new URL(SITE_URL).host, key: INDEXNOW_KEY, keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`, urlList }),
      signal: AbortSignal.timeout(20_000),
    });
    logger.info({ status: response.status, urls: urlList.length }, "Submitted URLs to IndexNow");
  } catch (err) {
    logger.warn({ err }, "IndexNow submission failed");
  }
}

let indexNowTimer: NodeJS.Timeout | null = null;
function scheduleIndexNow(delayMs: number) {
  if (indexNowTimer) clearTimeout(indexNowTimer);
  indexNowTimer = setTimeout(() => {
    indexNowTimer = null;
    void submitIndexNow();
  }, delayMs);
  indexNowTimer.unref?.();
}

let timer: NodeJS.Timeout | null = null;
let lastTriggeredAt = 0;

async function fireHook(url: string) {
  lastTriggeredAt = Date.now();
  try {
    const response = await fetch(url, { method: "POST", signal: AbortSignal.timeout(15_000) });
    logger.info({ status: response.status }, "Triggered site rebuild via deploy hook");
    scheduleIndexNow(INDEXNOW_DELAY_MS);
  } catch (err) {
    logger.warn({ err }, "Deploy hook call failed");
  }
}

export function scheduleSiteRebuild() {
  const url = process.env.RENDER_DEPLOY_HOOK_URL;
  if (!url) {
    scheduleIndexNow(DEBOUNCE_MS); // no rebuild to wait for; still tell search engines
    return;
  }
  if (timer) clearTimeout(timer);
  const wait = Math.max(DEBOUNCE_MS, lastTriggeredAt + MIN_INTERVAL_MS - Date.now());
  timer = setTimeout(() => {
    timer = null;
    void fireHook(url);
  }, wait);
  timer.unref?.();
}

export function siteRebuildMiddleware(req: Request, res: Response, next: NextFunction) {
  res.on("finish", () => {
    if (res.statusCode < 400 && changesPublicContent(req.method, req.originalUrl)) scheduleSiteRebuild();
  });
  next();
}
