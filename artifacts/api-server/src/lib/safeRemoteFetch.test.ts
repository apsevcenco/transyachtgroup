import test from "node:test";
import assert from "node:assert/strict";
import { assertPublicHttpsUrl } from "./safeRemoteFetch.ts";

test("remote fetch rejects non-HTTPS URLs", async () => {
  await assert.rejects(() => assertPublicHttpsUrl("http://example.com/image.jpg"));
});

test("remote fetch rejects loopback and link-local addresses", async () => {
  await assert.rejects(() => assertPublicHttpsUrl("https://127.0.0.1/secret"));
  await assert.rejects(() => assertPublicHttpsUrl("https://169.254.169.254/latest/meta-data"));
});

test("remote fetch enforces a hostname allowlist", async () => {
  await assert.rejects(() =>
    assertPublicHttpsUrl("https://127.0.0.1/image.jpg", new Set(["images.example.com"])),
  );
});
