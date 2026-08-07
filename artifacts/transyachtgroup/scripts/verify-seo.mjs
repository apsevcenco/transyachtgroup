import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const publicDir = new URL("../dist/public/", import.meta.url);
const [html, robots, sitemap, pagesSitemap, carsHtml, yachtsHtml, aboutHtml, serviceHtml] = await Promise.all([
  readFile(new URL("index.html", publicDir), "utf8"),
  readFile(new URL("robots.txt", publicDir), "utf8"),
  readFile(new URL("sitemap.xml", publicDir), "utf8"),
  readFile(new URL("pages-sitemap.xml", publicDir), "utf8"),
  readFile(new URL("cars/index.html", publicDir), "utf8"),
  readFile(new URL("yachts/index.html", publicDir), "utf8"),
  readFile(new URL("about/index.html", publicDir), "utf8"),
  readFile(new URL("services/luxury-car-rental-cannes/index.html", publicDir), "utf8"),
]);

const requiredHtmlSignals = [
  "<h1",
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
assert.match(
  robots,
  /Sitemap:\s*https:\/\/www\.transyachtgroup\.com\/sitemap\.xml/,
);
assert.match(robots, /Allow:\s*\/api\/vehicles-sitemap\.xml/);
assert.match(sitemap, /<sitemapindex[\s>]/);
assert.match(sitemap, /\/pages-sitemap\.xml/);
assert.match(sitemap, /\/api\/vehicles-sitemap\.xml/);
assert.match(pagesSitemap, /<urlset[\s>]/);
assert.match(pagesSitemap, /<loc>https:\/\/www\.transyachtgroup\.com\//);
assert.doesNotMatch(pagesSitemap, /https:\/\/transyachtgroup\.com/);
assert.match(pagesSitemap, /\/cars\?lang=en/);
assert.match(pagesSitemap, /\/yachts\?lang=en/);
assert.match(pagesSitemap, /\/locations\/cannes\?lang=en/);
assert.match(pagesSitemap, /\/services\/luxury-car-rental-cannes\?lang=en/);
assert.match(pagesSitemap, /\/services\/yacht-charter-monaco\?lang=en/);
assert.match(pagesSitemap, /\/services\/rolls-royce-rental-french-riviera\?lang=en/);
assert.match(pagesSitemap, /hreflang="fr"/);
assert.match(pagesSitemap, /hreflang="x-default"/);

for (const [name, routeHtml, canonical] of [
  ["cars", carsHtml, "https://www.transyachtgroup.com/cars?lang=en"],
  ["yachts", yachtsHtml, "https://www.transyachtgroup.com/yachts?lang=en"],
  ["about", aboutHtml, "https://www.transyachtgroup.com/about?lang=en"],
  ["service", serviceHtml, "https://www.transyachtgroup.com/services/luxury-car-rental-cannes?lang=en"],
]) {
  assert.ok(routeHtml.includes(`<link rel="canonical" href="${canonical}"`), `${name} canonical is incorrect`);
  assert.match(routeHtml, /<h1[^>]*>[^<]+<\/h1>/, `${name} H1 is missing`);
  assert.ok(!routeHtml.includes('<link rel="canonical" href="https://www.transyachtgroup.com/?lang=en"'), `${name} retained homepage canonical`);
}

console.log("SEO verification passed");
