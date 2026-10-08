import test from "node:test";
import assert from "node:assert/strict";
import { normalizeInternalPath, restrictInternalLinks } from "./siteLinks.ts";

test("normalises known internal paths and rejects unknown ones", () => {
  assert.equal(normalizeInternalPath("/services/luxury-car-rental-cannes"), "/services/luxury-car-rental-cannes/");
  assert.equal(normalizeInternalPath("https://www.transyachtgroup.com/cars?x=1"), "/cars/");
  assert.equal(normalizeInternalPath("/services/made-up-page/"), null);
  assert.equal(normalizeInternalPath("https://example.com/cars/"), null);
});

test("keeps valid links and unwraps invented or external ones", () => {
  const html = '<p><a href="/yachts">yachts</a> and <a href="/services/invented/">fake</a> and <a href="https://evil.test/">ext</a></p>';
  assert.equal(restrictInternalLinks(html), '<p><a href="/yachts/">yachts</a> and fake and ext</p>');
});
