import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const publicDir = new URL("../dist/public/", import.meta.url);
const [html, robots, sitemap] = await Promise.all([
  readFile(new URL("index.html", publicDir), "utf8"),
  readFile(new URL("robots.txt", publicDir), "utf8"),
  readFile(new URL("sitemap.xml", publicDir), "utf8"),
]);

const requiredHtmlSignals = [
  'rel="canonical"',
  'name="description"',
  'name="robots"',
  'property="og:title"',
  'name="twitter:card"',
  'type="application/ld+json"',
  'hreflang="x-default"',
];

requiredHtmlSignals.forEach((signal) =>
  assert.ok(
    html.includes(signal),
    `Missing SEO signal in index.html: ${signal}`,
  ),
);
assert.match(robots, /Disallow:\s*\/admin/);
assert.match(robots, /Sitemap:\s*https:\/\/transyachtgroup\.com\/sitemap\.xml/);
assert.match(sitemap, /<urlset[\s>]/);
assert.match(sitemap, /\/cars\?lang=en/);
assert.match(sitemap, /\/yachts\?lang=en/);
assert.match(sitemap, /\/locations\/cannes\?lang=en/);
assert.match(sitemap, /hreflang="fr"/);
assert.match(sitemap, /hreflang="x-default"/);

console.log("SEO verification passed");
