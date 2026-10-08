import test from "node:test";
import assert from "node:assert/strict";
import {
  alternateLinks,
  articleLangs,
  englishPath,
  langFromPathname,
  languageUrl,
  localizeInternalHref,
  stripLangPrefix,
  vehicleLangs,
  withLangPrefix,
} from "./langRoutes.ts";

const SITE = "https://www.transyachtgroup.com";

test("the language comes from the URL prefix, English is the default", () => {
  assert.equal(langFromPathname("/"), "en");
  assert.equal(langFromPathname("/cars/"), "en");
  assert.equal(langFromPathname("/fr"), "fr");
  assert.equal(langFromPathname("/ar/yachts/"), "ar");
  assert.equal(langFromPathname("/france/"), "en", "only whole path segments count as a prefix");
  assert.equal(langFromPathname("/admin/dashboard"), "en");
});

test("prefix stripping keeps the rest of the path", () => {
  assert.equal(stripLangPrefix("/fr"), "/");
  assert.equal(stripLangPrefix("/fr/"), "/");
  assert.equal(stripLangPrefix("/ru/services/yacht-charter-nice/"), "/services/yacht-charter-nice/");
  assert.equal(stripLangPrefix("/cars/x-1"), "/cars/x-1");
  assert.equal(stripLangPrefix("/frozen/"), "/frozen/");
});

test("withLangPrefix prefixes public paths only", () => {
  assert.equal(withLangPrefix("/cars/", "fr"), "/fr/cars/");
  assert.equal(withLangPrefix("/", "ro"), "/ro/");
  assert.equal(withLangPrefix("/#request", "ar"), "/ar/#request");
  assert.equal(withLangPrefix("/services/a?x=1", "ru"), "/ru/services/a?x=1");
  assert.equal(withLangPrefix("/cars/", "en"), "/cars/");
  assert.equal(withLangPrefix("/admin/crm", "fr"), "/admin/crm", "/admin is never prefixed");
  assert.equal(withLangPrefix("/api/vehicles", "fr"), "/api/vehicles", "/api is never prefixed");
  assert.equal(withLangPrefix("/ru/cars/", "fr"), "/ru/cars/", "an explicit prefix wins");
  assert.equal(withLangPrefix("#request", "fr"), "#request");
  assert.equal(withLangPrefix("https://example.com/", "fr"), "https://example.com/");
});

test("englishPath forces the unprefixed URL from any language", () => {
  assert.equal(withLangPrefix(englishPath("/answers/"), "fr"), "/answers/");
  assert.equal(withLangPrefix(englishPath("/"), "ar"), "/");
});

test("language URLs always end with a slash and English stays unprefixed", () => {
  assert.equal(languageUrl(SITE, "/cars", "en"), `${SITE}/cars/`);
  assert.equal(languageUrl(SITE, "/cars", "fr"), `${SITE}/fr/cars/`);
  assert.equal(languageUrl(SITE, "/", "ar"), `${SITE}/ar/`);
  assert.equal(languageUrl(SITE, "/", "en"), `${SITE}/`);
  assert.equal(languageUrl("", "/cars", "ro"), "/ro/cars/");
});

test("hreflang lists only existing versions, English and x-default always", () => {
  assert.deepEqual(alternateLinks(SITE, "/guides/x", ["en"]).map((l) => l.hreflang), ["en", "x-default"]);
  const links = alternateLinks(SITE, "/guides/x", ["en", "fr", "ar"]);
  assert.deepEqual(links.map((l) => l.hreflang), ["en", "fr", "ar", "x-default"]);
  assert.equal(links.find((l) => l.hreflang === "x-default")?.href, `${SITE}/guides/x/`);
  assert.equal(links.find((l) => l.hreflang === "ar")?.href, `${SITE}/ar/guides/x/`);
  // languages are reported in a stable order whatever order the caller passes
  assert.deepEqual(alternateLinks(SITE, "/a", ["ar", "fr"]).map((l) => l.hreflang), ["en", "fr", "ar", "x-default"]);
});

test("content languages require every translated field to be non-empty", () => {
  const item = {
    translations: {
      fr: { title: "T", content: "<p>c</p>" },
      ru: { title: "T", content: "  " },
      ro: { title: "T" },
    },
  };
  assert.deepEqual(articleLangs(item), ["en", "fr"]);
  assert.deepEqual(articleLangs({ translations: null }), ["en"]);
  assert.deepEqual(vehicleLangs({ translations: { ar: { name: "n", description: "d" }, fr: { name: "n" } } }), ["en", "ar"]);
});

test("internal links inside translated copy follow the language only when the page exists", () => {
  assert.equal(localizeInternalHref("/services/yacht-charter-nice/", "fr"), "/fr/services/yacht-charter-nice/");
  assert.equal(localizeInternalHref("/locations/cannes", "ru"), "/ru/locations/cannes");
  assert.equal(localizeInternalHref("/cars/", "ro"), "/ro/cars/");
  assert.equal(localizeInternalHref("/answers/how-to/", "fr"), "/answers/how-to/");
  assert.equal(localizeInternalHref("/guides/some-guide/", "fr"), "/guides/some-guide/");
  assert.equal(localizeInternalHref("/guides/some-guide/", "fr", (p) => p === "/guides/some-guide"), "/fr/guides/some-guide/");
  assert.equal(localizeInternalHref("https://example.com/cars/", "fr"), "https://example.com/cars/");
  assert.equal(localizeInternalHref("/cars/", "en"), "/cars/");
});
