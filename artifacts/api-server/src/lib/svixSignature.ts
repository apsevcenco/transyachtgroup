import { createHmac, timingSafeEqual } from "node:crypto";

// Resend signs webhooks with Svix: HMAC-SHA256 over `${id}.${timestamp}.${body}`
// keyed with the base64 part of the "whsec_..." secret. The header can carry
// several space-separated "v1,<base64>" signatures (key rotation).
export function verifySvixSignature(input: {
  secret: string;
  id?: string;
  timestamp?: string;
  signatureHeader?: string;
  body: Buffer | string;
  toleranceSeconds?: number;
  now?: number;
}): boolean {
  const { secret, id, timestamp, signatureHeader, body } = input;
  if (!secret || !id || !timestamp || !signatureHeader) return false;

  const sentAt = Number(timestamp);
  if (!Number.isFinite(sentAt)) return false;
  const nowSeconds = Math.floor((input.now ?? Date.now()) / 1000);
  if (Math.abs(nowSeconds - sentAt) > (input.toleranceSeconds ?? 300)) return false;

  const key = Buffer.from(secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret, "base64");
  const payload = typeof body === "string" ? body : body.toString("utf8");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${payload}`).digest();

  for (const part of signatureHeader.split(" ")) {
    const [version, signature] = part.split(",");
    if (version !== "v1" || !signature) continue;
    const given = Buffer.from(signature, "base64");
    if (given.length === expected.length && timingSafeEqual(given, expected)) return true;
  }
  return false;
}
