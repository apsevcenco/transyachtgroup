import test from "node:test";
import assert from "node:assert/strict";
import { summarizeProviderBody } from "./providerError.ts";

test("explains a WhatsApp Cloud API template error", () => {
  const body = JSON.stringify({
    error: { message: "(#132001) Template name does not exist in the translation", type: "OAuthException", code: 132001, error_data: { messaging_product: "whatsapp", details: "template name (review_request) does not exist in ru" }, fbtrace_id: "abc" },
  });
  const text = summarizeProviderBody(404, "WhatsApp provider", body);
  assert.match(text, /^WhatsApp provider rejected the request \(404\): /);
  assert.match(text, /Template name does not exist in the translation/);
  assert.match(text, /does not exist in ru/);
  assert.match(text, /code 132001/);
});

test("explains a Resend error and plain-text bodies", () => {
  assert.equal(summarizeProviderBody(403, "Email provider", JSON.stringify({ statusCode: 403, message: "The domain is not verified", name: "validation_error" })), "Email provider rejected the request (403): The domain is not verified");
  assert.equal(summarizeProviderBody(502, "Email provider", "Bad gateway"), "Email provider rejected the request (502): Bad gateway");
  assert.equal(summarizeProviderBody(500, "Email provider", ""), "Email provider rejected the request (500)");
});

test("never echoes secrets and caps the length", () => {
  const token = "EAAGm0PX4ZCpsBAKxyz1234567890abcdefgh";
  const text = summarizeProviderBody(401, "WhatsApp provider", JSON.stringify({ error: { message: `Invalid OAuth access token Bearer ${token} ${token}` } }));
  assert.equal(text.includes(token), false);
  assert.ok(text.length <= 400);
  assert.ok(summarizeProviderBody(400, "x", "a".repeat(5000)).length <= 400);
});
