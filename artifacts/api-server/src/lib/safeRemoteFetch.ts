import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

function isPrivateAddress(address: string): boolean {
  const normalized = address.toLowerCase().replace(/^::ffff:/, "");
  if (normalized === "::1" || normalized === "::" || normalized.startsWith("fe80:") || normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  if (isIP(normalized) !== 4) return false;
  const [a, b] = normalized.split(".").map(Number);
  return a === 0 || a === 10 || a === 127 ||
    (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) ||
    a >= 224;
}

export async function assertPublicHttpsUrl(raw: string, allowedHosts?: Set<string>): Promise<URL> {
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error("Remote URL is invalid"); }
  if (url.protocol !== "https:" || url.username || url.password || url.port) {
    throw new Error("Remote URL must be a credential-free HTTPS URL on port 443");
  }
  if (allowedHosts && !allowedHosts.has(url.hostname.toLowerCase())) {
    throw new Error("Remote host is not allowed");
  }
  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error("Remote URL resolves to a private or reserved network");
  }
  return url;
}

export async function safeRemoteFetch(
  raw: string,
  init: RequestInit = {},
  options: { allowedHosts?: Set<string>; maxRedirects?: number } = {},
): Promise<Response> {
  let current = raw;
  const maxRedirects = options.maxRedirects ?? 2;
  for (let redirect = 0; redirect <= maxRedirects; redirect++) {
    const checked = await assertPublicHttpsUrl(current, options.allowedHosts);
    const response = await fetch(checked, { ...init, redirect: "manual" });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get("location");
    if (!location || redirect === maxRedirects) throw new Error("Unsafe or excessive redirect");
    current = new URL(location, checked).toString();
  }
  throw new Error("Too many redirects");
}
