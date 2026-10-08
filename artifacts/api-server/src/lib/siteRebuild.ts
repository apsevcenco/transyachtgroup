import type { NextFunction, Request, Response } from "express";

import { logger } from "./logger.ts";

/**
 * The public site is prerendered at build time, so published content only reaches crawlers'
 * HTML after a rebuild. When an admin changes public content we ping the Render Deploy Hook
 * (env RENDER_DEPLOY_HOOK_URL), debounced so a burst of edits causes a single rebuild.
 */
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

let timer: NodeJS.Timeout | null = null;
let lastTriggeredAt = 0;

async function fireHook(url: string) {
  lastTriggeredAt = Date.now();
  try {
    const response = await fetch(url, { method: "POST", signal: AbortSignal.timeout(15_000) });
    logger.info({ status: response.status }, "Triggered site rebuild via deploy hook");
  } catch (err) {
    logger.warn({ err }, "Deploy hook call failed");
  }
}

export function scheduleSiteRebuild() {
  const url = process.env.RENDER_DEPLOY_HOOK_URL;
  if (!url) return;
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
