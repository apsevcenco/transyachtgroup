import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

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
assert.match(robots, /Allow:\s*\/api\/guides-sitemap\.xml/);
assert.match(robots, /Allow:\s*\/api\/news-sitemap\.xml/);
assert.match(sitemap, /<sitemapindex[\s>]/);
assert.match(sitemap, /\/pages-sitemap\.xml/);
assert.match(sitemap, /\/api\/vehicles-sitemap\.xml/);
assert.match(sitemap, /\/api\/guides-sitemap\.xml/);
assert.match(sitemap, /\/api\/news-sitemap\.xml/);
assert.match(pagesSitemap, /<urlset[\s>]/);
assert.match(pagesSitemap, /<loc>https:\/\/www\.transyachtgroup\.com\//);
assert.doesNotMatch(pagesSitemap, /https:\/\/transyachtgroup\.com/);
assert.doesNotMatch(pagesSitemap, /<loc>[^<]*\?lang=/);
assert.match(pagesSitemap, /\/cars\//);
assert.match(pagesSitemap, /\/yachts\//);
assert.match(pagesSitemap, /\/guides\//);
assert.match(pagesSitemap, /\/news\//);
assert.match(pagesSitemap, /\/locations\/cannes\//);
assert.match(pagesSitemap, /\/services\/luxury-car-rental-cannes\//);
assert.match(pagesSitemap, /\/services\/luxury-car-rental-courchevel\//);
assert.match(pagesSitemap, /\/services\/geneva-airport-to-courchevel-transfer\//);
assert.match(pagesSitemap, /\/services\/lyon-airport-to-courchevel-transfer\//);
assert.match(pagesSitemap, /\/services\/yacht-charter-monaco\//);
assert.match(pagesSitemap, /\/services\/rolls-royce-rental-french-riviera\//);
assert.match(pagesSitemap, /\/services\/rolls-royce-rental-courchevel\//);
assert.doesNotMatch(pagesSitemap, /\/\/(guides|news|answers|cars|yachts)\//, "sitemap contains a double slash");

for (const [name, routeHtml, canonical] of [
  ["cars", carsHtml, "https://www.transyachtgroup.com/cars/"],
  ["yachts", yachtsHtml, "https://www.transyachtgroup.com/yachts/"],
  ["about", aboutHtml, "https://www.transyachtgroup.com/about/"],
  ["service", serviceHtml, "https://www.transyachtgroup.com/services/luxury-car-rental-cannes/"],
]) {
  assert.ok(routeHtml.includes(`<link rel="canonical" href="${canonical}"`), `${name} canonical is incorrect`);
  assert.match(routeHtml, /<h1[^>]*>[^<]+<\/h1>/, `${name} H1 is missing`);
  assert.doesNotMatch(routeHtml, /<link rel="canonical" href="[^"]*\?lang=/, `${name} canonical retained lang parameter`);
}

const homeBody = html.includes('id="seo-content"');
assert.ok(homeBody, "Homepage has no prerendered body");
const notFound = await readFile(new URL("404.html", publicDir), "utf8");
assert.match(notFound, /noindex/, "404.html must be noindex");
assert.doesNotMatch(notFound, /rel="canonical"/, "404.html must not have a canonical");

// ---------------------------------------------------------------- language versions
const origin = "https://www.transyachtgroup.com";
const translatedLangs = ["fr", "ru", "ro", "ar"];
const allLangs = ["en", ...translatedLangs];
const publicRoot = fileURLToPath(publicDir);

async function htmlDirs(dir, prefix = "") {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!prefix && ["assets", "fonts", "images", "vehicle"].includes(entry.name)) continue; // vehicle/ = legacy aliases, checked below
      out.push(...(await htmlDirs(join(dir, entry.name), `${prefix}${entry.name}/`)));
    } else if (entry.name === "index.html") out.push(prefix);
  }
  return out;
}

const urlForDir = (dir) => `${origin}/${dir}`;
const readPage = (dir) => readFile(join(publicRoot, dir, "index.html"), "utf8");
const alternatesOf = (page) =>
  [...page.matchAll(/<link\s+rel="alternate"\s+hreflang="([^"]+)"\s+href="([^"]+)"/g)].map((m) => ({ hreflang: m[1], href: m[2] }));
const canonicalOf = (page) => page.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
const titleOf = (page) => page.match(/<title>(.*?)<\/title>/s)?.[1];
const seoText = (page) =>
  (page.match(/id="seo-content"[^>]*>([\s\S]*?)<\/article>/)?.[1] || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const langOfDir = (dir) => translatedLangs.find((code) => dir === `${code}/` || dir.startsWith(`${code}/`)) || "en";

const dirs = await htmlDirs(publicRoot);
const pages = new Map();
for (const dir of dirs) pages.set(dir, await readPage(dir));
assert.ok(pages.has(""), "dist/public/index.html is missing");

// 1. the shell no longer advertises fake alternates; slash-less language URLs are normalised
assert.deepEqual(
  alternatesOf(pages.get("")).map((a) => a.hreflang).filter((code) => code !== "x-default").every((code) => allLangs.includes(code)),
  true,
);
const sourceHtml = await readFile(new URL("../index.html", import.meta.url), "utf8");
assert.deepEqual(alternatesOf(sourceHtml).map((a) => a.hreflang), ["en", "x-default"], "index.html source must only declare en + x-default");
const inline = sourceHtml.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(inline, "index.html source lost its inline normalisation script");
function normalised(pathname) {
  let target = null;
  const location = { pathname, search: "?x=1", hash: "", hostname: "www.transyachtgroup.com", replace: (value) => (target = value) };
  vm.runInNewContext(inline, { location });
  return target;
}
assert.equal(normalised("/fr/cars"), "/fr/cars/?x=1", "slash-less /fr/cars must be normalised");
assert.equal(normalised("/ar"), "/ar/?x=1", "slash-less /ar must be normalised");
assert.equal(normalised("/ru/services/yacht-charter-nice"), "/ru/services/yacht-charter-nice/?x=1");
assert.equal(normalised("/fr/cars/"), null, "trailing-slash URL must be left alone");
assert.equal(normalised("/admin"), null, "/admin is never rewritten");
assert.equal(normalised("/api/vehicles"), null, "/api is never rewritten");

// 1b. legacy /vehicle/<id>/ aliases must canonicalise to an existing real vehicle page
const aliasRoot = join(publicRoot, "vehicle");
let aliasCount = 0;
for (const entry of await readdir(aliasRoot, { withFileTypes: true }).catch(() => [])) {
  if (!entry.isDirectory()) continue;
  const alias = await readFile(join(aliasRoot, entry.name, "index.html"), "utf8");
  const target = canonicalOf(alias);
  assert.ok(target && target.startsWith(`${origin}/`) && !target.includes("/vehicle/"), `vehicle/${entry.name}/ must canonicalise to the real vehicle URL`);
  assert.ok(pages.has(target.slice(origin.length + 1)), `vehicle/${entry.name}/ canonical points at a page that was not generated: ${target}`);
  aliasCount++;
}
const realVehicleDirs = dirs.filter((dir) => /^(cars|yachts)\/[^/]+\/$/.test(dir));
assert.equal(aliasCount, realVehicleDirs.length, "every English vehicle page needs a legacy /vehicle/<id>/ alias");

// 2. every generated page: canonical = itself, <html lang> matches, alternates exist and are reciprocal
const alternatesByUrl = new Map();
for (const [dir, page] of pages) {
  const url = urlForDir(dir);
  const lang = langOfDir(dir);
  assert.equal(canonicalOf(page), url, `canonical of /${dir} must be its own URL`);
  assert.match(page, new RegExp(`<html lang="${lang}"`), `/${dir}: <html lang> must be ${lang}`);
  if (lang === "ar") assert.match(page, /<html lang="ar" dir="rtl"/, `/${dir}: Arabic pages must be rtl`);
  assert.match(page, /<h1[^>]*>[^<]+<\/h1>/, `/${dir}: H1 missing`);
  if (dir !== "") assert.match(page, new RegExp(`"inLanguage":"${lang}"`), `/${dir}: JSON-LD inLanguage must be ${lang}`);
  const alternates = alternatesOf(page);
  const byLang = Object.fromEntries(alternates.map((a) => [a.hreflang, a.href]));
  assert.equal(byLang[lang], url, `/${dir}: hreflang must include a self reference`);
  assert.equal(byLang["x-default"], byLang.en, `/${dir}: x-default must be the English URL`);
  assert.equal(new Set(alternates.map((a) => a.hreflang)).size, alternates.length, `/${dir}: duplicate hreflang`);
  const real = alternates.filter((a) => a.hreflang !== "x-default");
  assert.equal(new Set(real.map((a) => a.href)).size, real.length, `/${dir}: two languages share one URL`);
  for (const alternate of alternates) {
    assert.ok(alternate.href.startsWith(`${origin}/`), `/${dir}: alternate outside the site`);
    assert.ok(pages.has(alternate.href.slice(origin.length + 1)), `/${dir}: hreflang ${alternate.hreflang} points at a page that was not generated: ${alternate.href}`);
  }
  alternatesByUrl.set(url, byLang);
}
for (const [url, byLang] of alternatesByUrl) {
  for (const [hreflang, href] of Object.entries(byLang)) {
    if (hreflang === "x-default") continue;
    assert.deepEqual(alternatesByUrl.get(href), byLang, `hreflang sets are not reciprocal: ${url} <-> ${href}`);
  }
}

// 3. each language has its own home, hubs and translated service/location pages; none is an English copy
const langPageCounts = {};
for (const code of translatedLangs) {
  const home = pages.get(`${code}/`);
  assert.ok(home, `/${code}/ homepage was not generated`);
  assert.ok(!/<h1[^>]*>Luxury Car Rental and Yacht Charter/.test(home), `/${code}/ homepage carries the English H1`);
  const own = dirs.filter((dir) => dir.startsWith(`${code}/`));
  langPageCounts[code] = own.length;
  assert.ok(own.filter((dir) => dir.startsWith(`${code}/services/`)).length >= 20, `/${code}/services/ is missing pages`);
  assert.equal(own.filter((dir) => dir.startsWith(`${code}/locations/`)).length, 6, `/${code}/locations/ must have 6 pages`);
  assert.ok(pages.has(`${code}/cars/`) && pages.has(`${code}/yachts/`), `/${code}/ cars and yachts hubs are required`);
  assert.ok(!own.some((dir) => dir.startsWith(`${code}/answers`)), "answers are English-only and must not exist under a language prefix");
  for (const dir of own) {
    const page = pages.get(dir);
    const english = pages.get(dir.slice(code.length + 1));
    if (!english) continue;
    assert.notEqual(seoText(page), seoText(english), `/${dir} is an untranslated copy of its English page`);
    // Product and article titles can legitimately be identical (model names); the static copy cannot.
    if (/^(services|locations)\//.test(dir.slice(code.length + 1)) || /^(cars|yachts|about)\/$/.test(dir.slice(code.length + 1))) {
      assert.notEqual(titleOf(page), titleOf(english), `/${dir} has the English <title>`);
    }
    const englishH1 = english.match(/<h1[^>]*>([^<]+)<\/h1>/)?.[1];
    if (englishH1 && dir.startsWith(`${code}/services/`)) {
      assert.ok(!page.includes(`<h1>${englishH1}</h1>`), `/${dir} still has the English H1`);
    }
  }
  const sample = pages.get(`${code}/services/luxury-car-rental-cannes/`);
  assert.ok(sample, `/${code}/services/luxury-car-rental-cannes/ must exist`);
  assert.deepEqual(
    alternatesOf(sample).map((a) => a.hreflang).sort(),
    [...allLangs, "x-default"].sort(),
    "service page must list every language it exists in",
  );
}
assert.equal(new Set(Object.values(langPageCounts)).size, 1, `languages differ in page count: ${JSON.stringify(langPageCounts)}`);
assert.ok(
  /\/fr\/services\/luxury-car-rental-cannes\//.test(pagesSitemap),
  "French service page must be in pages-sitemap.xml",
);

// 4. internal links of a translated page stay inside its language when that version exists
for (const code of translatedLangs) {
  for (const dir of ["services/luxury-car-rental-cannes/", "locations/cannes/", ""]) {
    const page = pages.get(`${code}/${dir}`);
    for (const [, href] of page.matchAll(/<a href="(\/[^"#]*)"/g)) {
      if (href.startsWith("/answers/")) continue; // answers exist in English only
      assert.ok(href.startsWith(`/${code}/`), `${code} page /${dir} links to a non-${code} URL: ${href}`);
      assert.ok(pages.has(href.slice(1)), `${code} page /${dir} links to a missing page: ${href}`);
    }
  }
}

// 4b. vehicle pages: the English-only yacht summary and English Explore links never appear on language pages
for (const code of translatedLangs) {
  const vehiclePages = dirs.filter((dir) => new RegExp(`^${code}/(cars|yachts)/.+-\\d+/$`).test(dir));
  for (const dir of vehiclePages) {
    const page = pages.get(dir);
    assert.ok(!/available for private charter on the French Riviera/.test(page), `/${dir} shows the English yacht summary`);
    assert.ok(!/<h2>Explore<\/h2>/.test(page), `/${dir} has the English Explore heading`);
    const explore = page.match(/id="seo-content"[\s\S]*?<\/article>/)?.[0] || "";
    for (const [, href] of explore.matchAll(/<a href="(\/[^"#]*)"/g)) {
      assert.ok(href.startsWith(`/${code}/`), `/${dir} links to a non-${code} URL: ${href}`);
      assert.ok(pages.has(href.slice(1)), `/${dir} links to a missing page: ${href}`);
    }
  }
}

// 5. sitemap: language URLs with xhtml alternates that match the hreflang tags; no fake alternates
assert.match(pagesSitemap, /xmlns:xhtml="http:\/\/www\.w3\.org\/1999\/xhtml"/);
const sitemapLocs = new Set();
for (const [, entry] of pagesSitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
  const loc = entry.match(/<loc>([^<]+)<\/loc>/)[1];
  sitemapLocs.add(loc);
  const page = pages.get(loc.slice(origin.length + 1));
  assert.ok(page, `sitemap lists a page that does not exist: ${loc}`);
  const links = [...entry.matchAll(/<xhtml:link rel="alternate" hreflang="([^"]+)" href="([^"]+)"\/>/g)].map((m) => ({ hreflang: m[1], href: m[2] }));
  const expected = alternatesOf(page);
  if (expected.length > 2) assert.deepEqual(links, expected, `sitemap alternates differ from the hreflang tags of ${loc}`);
  else assert.equal(links.length, 0, `sitemap lists alternates for an English-only page: ${loc}`);
}
for (const code of translatedLangs) {
  for (const path of ["", "cars/", "yachts/", "services/luxury-car-rental-cannes/", "locations/cannes/"]) {
    assert.ok(sitemapLocs.has(`${origin}/${code}/${path}`), `sitemap is missing /${code}/${path}`);
  }
}

console.log(
  `SEO verification passed (${pages.size} pages; per language: ${translatedLangs.map((code) => `${code} ${langPageCounts[code]}`).join(", ")})`,
);
