import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { verifySvixSignature } from "./svixSignature.ts";

const secretBytes = Buffer.from("super-secret-key-material-0123456789");
const secret = `whsec_${secretBytes.toString("base64")}`;
const now = 1_700_000_000_000;
const timestamp = String(Math.floor(now / 1000));
const id = "msg_abc123";
const body = JSON.stringify({ type: "email.received", data: { email_id: "e1" } });

function sign(payload: string, key = secretBytes, ts = timestamp) {
  return `v1,${createHmac("sha256", key).update(`${id}.${ts}.${payload}`).digest("base64")}`;
}

test("accepts a correctly signed payload", () => {
  assert.equal(verifySvixSignature({ secret, id, timestamp, signatureHeader: sign(body), body, now }), true);
});

test("accepts when one of several rotated signatures matches", () => {
  const header = `v1,${Buffer.from("not-a-real-signature").toString("base64")} ${sign(body)}`;
  assert.equal(verifySvixSignature({ secret, id, timestamp, signatureHeader: header, body, now }), true);
});

test("rejects a tampered body", () => {
  assert.equal(verifySvixSignature({ secret, id, timestamp, signatureHeader: sign(body), body: body + " ", now }), false);
});

test("rejects a signature made with a different secret", () => {
  const header = sign(body, Buffer.from("another-secret"));
  assert.equal(verifySvixSignature({ secret, id, timestamp, signatureHeader: header, body, now }), false);
});

test("rejects stale timestamps (replay protection)", () => {
  const stale = String(Math.floor(now / 1000) - 3_600);
  assert.equal(verifySvixSignature({ secret, id, timestamp: stale, signatureHeader: sign(body, secretBytes, stale), body, now }), false);
});

test("rejects missing headers and an empty secret", () => {
  assert.equal(verifySvixSignature({ secret, id: undefined, timestamp, signatureHeader: sign(body), body, now }), false);
  assert.equal(verifySvixSignature({ secret: "", id, timestamp, signatureHeader: sign(body), body, now }), false);
});
