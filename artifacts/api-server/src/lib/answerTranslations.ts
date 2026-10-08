/**
 * Answer translations: shape, validation and language selection. Pure module (no I/O) so it can be unit-tested.
 * Stored on the answer row as `translations: { fr: {...}, ru: {...}, ... }`; English stays in the main columns.
 */
import { restrictInternalLinks } from "./siteLinks.ts";

export const TRANSLATION_LANGS = { fr: "French", ru: "Russian", ro: "Romanian", ar: "Arabic" } as const;
export type TranslationLang = keyof typeof TRANSLATION_LANGS;

export type AnswerFaqItem = { question: string; answer: string };
export type AnswerTranslation = {
  question: string;
  directAnswer: string;
  explanation: string;
  faq: AnswerFaqItem[];
  metaTitle: string;
  metaDescription: string;
};

export const isTranslationLang = (value: unknown): value is TranslationLang =>
  typeof value === "string" && Object.prototype.hasOwnProperty.call(TRANSLATION_LANGS, value);

const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

function faqList(value: unknown): AnswerFaqItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (item && typeof item === "object" ? (item as Record<string, unknown>) : {}))
    .map((item) => ({ question: text(item.question, 260), answer: text(item.answer, 1_200) }))
    .filter((item) => item.question && item.answer)
    .slice(0, 8);
}

/** One translation, or null when any required field is missing. */
export function cleanTranslation(value: unknown): AnswerTranslation | null {
  const item = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const translation: AnswerTranslation = {
    question: text(item.question, 260),
    directAnswer: text(item.directAnswer, 1_200),
    explanation: text(item.explanation, 40_000),
    faq: faqList(item.faq),
    metaTitle: text(item.metaTitle, 180),
    metaDescription: text(item.metaDescription, 320),
  };
  return translation.question && translation.directAnswer && translation.explanation ? translation : null;
}

/** Keeps only known languages with complete content; anything else is dropped. */
export function normalizeTranslations(value: unknown): Record<string, AnswerTranslation> {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const result: Record<string, AnswerTranslation> = {};
  for (const lang of Object.keys(TRANSLATION_LANGS)) {
    const clean = cleanTranslation(source[lang]);
    if (clean) result[lang] = clean;
  }
  return result;
}

const hrefs = (html: string) =>
  [...html.matchAll(/<a\b[^>]*?\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)].map((m) => (m[1] ?? m[2] ?? "").trim()).sort();

/**
 * Checks an AI translation against its English source: same number of FAQ items and the same internal links.
 * Returns the cleaned translation or throws "INVALID_TRANSLATION:<reason>".
 */
export function validateTranslation(source: Pick<AnswerTranslation, "explanation" | "faq">, candidate: unknown): AnswerTranslation {
  const clean = cleanTranslation(candidate);
  if (!clean) throw new Error("INVALID_TRANSLATION:missing_fields");
  clean.explanation = restrictInternalLinks(clean.explanation);
  if (source.faq.length && clean.faq.length !== source.faq.length) throw new Error("INVALID_TRANSLATION:faq_count");
  const wanted = hrefs(restrictInternalLinks(source.explanation));
  const got = hrefs(clean.explanation);
  if (wanted.length !== got.length || wanted.some((href, index) => href !== got[index])) throw new Error("INVALID_TRANSLATION:links_changed");
  if (/<(script|style|iframe|h1)\b/i.test(clean.explanation)) throw new Error("INVALID_TRANSLATION:unsafe_html");
  return clean;
}

/** Languages an answer can be served in, English first. */
export function availableLanguages(translations: unknown): string[] {
  return ["en", ...Object.keys(normalizeTranslations(translations))];
}

type AnswerRow = {
  question: string;
  directAnswer: string;
  explanation: string;
  faq: unknown;
  metaTitle: string | null;
  metaDescription: string | null;
  translations?: unknown;
};

/** English fields overlaid with the requested translation when a complete one exists. */
export function localizedAnswer<T extends AnswerRow>(item: T, lang: string) {
  const { translations, ...rest } = item;
  const translation = isTranslationLang(lang) ? normalizeTranslations(translations)[lang] : undefined;
  return {
    ...rest,
    ...(translation
      ? {
          question: translation.question,
          directAnswer: translation.directAnswer,
          explanation: translation.explanation,
          faq: translation.faq.length ? translation.faq : item.faq,
          metaTitle: translation.metaTitle || item.metaTitle,
          metaDescription: translation.metaDescription || item.metaDescription,
        }
      : {}),
    language: translation ? lang : "en",
    availableLanguages: availableLanguages(translations),
  };
}
