import test from "node:test";
import assert from "node:assert/strict";
import { availableLanguages, cleanTranslation, localizedAnswer, normalizeTranslations, validateTranslation } from "./answerTranslations.ts";

const source = {
  explanation: '<h2>Route</h2><p>See <a href="/services/geneva-airport-to-courchevel-transfer/">the transfer</a>.</p>',
  faq: [{ question: "How long?", answer: "About 2.5 hours." }, { question: "Winter tyres?", answer: "Confirmed in the offer." }],
};
const good = {
  question: "Combien de temps ?",
  directAnswer: "Environ 2 h 30 à 3 h depuis l’aéroport de Genève.",
  explanation: '<h2>Itinéraire</h2><p>Voir <a href="/services/geneva-airport-to-courchevel-transfer/">le transfert</a>.</p>',
  faq: [{ question: "Combien de temps ?", answer: "Environ 2 h 30." }, { question: "Pneus hiver ?", answer: "Confirmé dans l’offre." }],
  metaTitle: "Genève–Courchevel : durée du transfert",
  metaDescription: "Durée du transfert privé entre l’aéroport de Genève et Courchevel, itinéraire et conditions hivernales.",
};

test("normalizeTranslations keeps complete known languages only", () => {
  const result = normalizeTranslations({ fr: good, de: good, ru: { question: "x" }, ro: null });
  assert.deepEqual(Object.keys(result), ["fr"]);
  assert.equal(normalizeTranslations(undefined)["fr"], undefined);
});

test("cleanTranslation requires question, direct answer and explanation", () => {
  assert.equal(cleanTranslation({ ...good, explanation: "" }), null);
  assert.ok(cleanTranslation(good));
});

test("validateTranslation accepts a faithful translation", () => {
  assert.equal(validateTranslation(source, good).question, good.question);
});

test("validateTranslation rejects changed FAQ count, changed links and unsafe HTML", () => {
  assert.throws(() => validateTranslation(source, { ...good, faq: [good.faq[0]] }), /faq_count/);
  assert.throws(() => validateTranslation(source, { ...good, explanation: "<p>Pas de lien</p>" }), /links_changed/);
  assert.throws(() => validateTranslation(source, { ...good, explanation: `${good.explanation}<script>alert(1)</script>` }), /unsafe_html|links_changed/);
});

test("validateTranslation drops invented links instead of trusting them", () => {
  const invented = { ...good, explanation: `${good.explanation}<a href="https://evil.test/">x</a>` };
  assert.equal(validateTranslation(source, invented).explanation.includes("evil.test"), false);
});

test("localizedAnswer serves the translation when complete and English otherwise", () => {
  const row = { question: "How long?", directAnswer: "d", explanation: "<p>e</p>", faq: [], metaTitle: "t", metaDescription: "m", translations: { fr: good } };
  const fr = localizedAnswer(row, "fr");
  assert.equal(fr.question, good.question);
  assert.equal(fr.language, "fr");
  assert.equal("translations" in fr, false);
  assert.deepEqual(fr.availableLanguages, ["en", "fr"]);
  const ru = localizedAnswer(row, "ru");
  assert.equal(ru.question, "How long?");
  assert.equal(ru.language, "en");
  assert.deepEqual(availableLanguages({}), ["en"]);
});
