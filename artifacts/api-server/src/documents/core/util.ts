/** Shared, framework-free helpers for the adaptive document engine. */

import type { YachtProfile } from "../documentTypes";

/** HTML-escape any value for safe interpolation into a template string. */
export function esc(v: unknown): string {
  if (v == null) return "";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Coerce to a finite number or null. */
export function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Only https URLs are allowed as image sources (matches legacy templates). */
export function isHttps(u: unknown): u is string {
  return typeof u === "string" && /^https:\/\//i.test(u);
}

/** Ordered, de-duplicated list of usable (https) yacht photo URLs. */
export function photoList(y: YachtProfile): string[] {
  const out: string[] = [];
  if (isHttps(y.cover_photo_url)) out.push(y.cover_photo_url);
  if (Array.isArray(y.photo_urls)) {
    for (const p of y.photo_urls) if (isHttps(p) && !out.includes(p)) out.push(p);
  }
  if (isHttps(y.photo_url) && !out.includes(y.photo_url)) out.push(y.photo_url);
  return out;
}

export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export interface ImageValidationResult {
  /** Reachable image URLs, in the original input order. */
  valid: string[];
  /** Excluded URLs with a short machine reason (for logging / reporting). */
  rejected: { url: string; reason: string }[];
}

/**
 * Probe each https image URL so a broken/unreachable photo never reaches the
 * PDF as a "broken image" icon. A lightweight ranged GET (`bytes=0-0`) confirms
 * the URL responds and serves an `image/*` content-type. Anything else
 * (non-https, non-2xx, wrong content-type, timeout, network error) is rejected.
 * Result preserves original ordering so cover/hero selection stays deterministic.
 *
 * Used only by the adaptive proposal export. Failures are conservative: we would
 * rather drop a questionable photo than ship a broken thumbnail to a client.
 */
export async function validateImageUrls(
  urls: string[],
  timeoutMs = 6000,
): Promise<ImageValidationResult> {
  // Probe in parallel but collect per-index so both `valid` and `rejected`
  // stay in the original input order regardless of which probe settles first.
  const reasons = await Promise.all(
    urls.map(async (url): Promise<string | null> => {
      if (!isHttps(url)) return "not https";
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        const res = await fetch(url, {
          method: "GET",
          signal: ctrl.signal,
          headers: { Range: "bytes=0-0" },
        });
        if (!res.ok && res.status !== 206) return `http ${res.status}`;
        const ct = (res.headers.get("content-type") ?? "").toLowerCase();
        if (!/^image\//.test(ct)) return `content-type ${ct || "unknown"}`;
        return null;
      } catch (e) {
        return e instanceof Error && e.name === "AbortError" ? "timeout" : "fetch error";
      } finally {
        clearTimeout(timer);
      }
    }),
  );
  const valid: string[] = [];
  const rejected: { url: string; reason: string }[] = [];
  urls.forEach((url, i) => {
    const reason = reasons[i];
    if (reason == null) valid.push(url);
    else rejected.push({ url, reason });
  });
  return { valid, rejected };
}
