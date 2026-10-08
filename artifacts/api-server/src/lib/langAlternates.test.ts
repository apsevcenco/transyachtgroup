import test from "node:test";
import assert from "node:assert/strict";
import { alternateXml, availableLangs, languageUrl, urlBlocks } from "./langAlternates.ts";

const SITE = "https://www.transyachtgroup.com";

test("a language exists only when every required field is translated", () => {
  const translations = {
    fr: { title: "Titre", content: "<p>Texte</p>" },
    ru: { title: "Заголовок", content: "" },
    ro: { title: "Titlu" },
    ar: null,
  };
  assert.deepEqual(availableLangs(translations, ["title", "content"]), ["en", "fr"]);
  assert.deepEqual(availableLangs(null, ["title"]), ["en"]);
  assert.deepEqual(availableLangs("nonsense", ["title"]), ["en"]);
});

test("language URLs are prefixed, English is not, and every URL has a trailing slash", () => {
  assert.equal(languageUrl(SITE, "/guides/a-guide", "en"), `${SITE}/guides/a-guide/`);
  assert.equal(languageUrl(SITE, "/guides/a-guide", "fr"), `${SITE}/fr/guides/a-guide/`);
  assert.equal(languageUrl(SITE, "/", "ar"), `${SITE}/ar/`);
});

test("English-only content gets no alternates", () => {
  assert.equal(alternateXml(SITE, "/guides/x", ["en"]), "");
});

test("alternates list every real version plus x-default -> English", () => {
  const xml = alternateXml(SITE, "/news/x", ["en", "fr", "ar"]);
  assert.match(xml, /hreflang="en" href="https:\/\/www\.transyachtgroup\.com\/news\/x\/"/);
  assert.match(xml, /hreflang="fr" href="https:\/\/www\.transyachtgroup\.com\/fr\/news\/x\/"/);
  assert.match(xml, /hreflang="ar" href="https:\/\/www\.transyachtgroup\.com\/ar\/news\/x\/"/);
  assert.match(xml, /hreflang="x-default" href="https:\/\/www\.transyachtgroup\.com\/news\/x\/"/);
  assert.doesNotMatch(xml, /hreflang="ru"|hreflang="ro"/);
});

test("one url block per language, each carrying the same alternates", () => {
  const xml = urlBlocks(SITE, "/cars/a-1", ["en", "ro"], () => "    <priority>0.8</priority>");
  assert.equal(xml.match(/<url>/g)?.length, 2);
  assert.match(xml, /<loc>https:\/\/www\.transyachtgroup\.com\/ro\/cars\/a-1\/<\/loc>/);
  assert.equal(xml.match(/<xhtml:link /g)?.length, 6);
});
