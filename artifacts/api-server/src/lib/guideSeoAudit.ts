export type SeoAuditInput = {
  title: string;
  excerpt: string;
  content: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  coverImage?: string | null;
  primaryKeyword?: string | null;
  targetPage?: string | null;
  translations?: Record<string, Record<string, string>> | null;
};

export type SeoAuditIssue = { code: string; severity: "error" | "warning" | "info"; message: string; points: number };
export type SeoAuditResult = { score: number; issues: SeoAuditIssue[]; stats: Record<string, number>; cannibalization: Array<{ id: number; title: string; slug: string; similarity: number }> };

export function plainText(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();
}

function words(value: string): string[] {
  return plainText(value).toLocaleLowerCase("en").match(/[\p{L}\p{N}]+/gu) || [];
}

export function textSimilarity(a: string, b: string): number {
  const left = new Set(words(a).filter((word) => word.length > 3));
  const right = new Set(words(b).filter((word) => word.length > 3));
  if (!left.size || !right.size) return 0;
  let overlap = 0;
  for (const word of left) if (right.has(word)) overlap++;
  return Math.round((overlap / new Set([...left, ...right]).size) * 100);
}

export function auditGuide(input: SeoAuditInput, existing: Array<{ id: number; title: string; slug: string; primaryKeyword?: string | null; content: string }> = []): SeoAuditResult {
  const issues: SeoAuditIssue[] = [];
  const add = (code: string, severity: SeoAuditIssue["severity"], message: string, points: number) => issues.push({ code, severity, message, points });
  const body = plainText(input.content);
  const bodyWords = words(body);
  const keyword = (input.primaryKeyword || "").trim().toLocaleLowerCase("en");
  const keywordHits = keyword ? body.toLocaleLowerCase("en").split(keyword).length - 1 : 0;
  const density = bodyWords.length && keyword ? Math.round((keywordHits / bodyWords.length) * 10_000) / 100 : 0;
  const h1Count = (input.content.match(/<h1\b/gi) || []).length;
  const h2Count = (input.content.match(/<h2\b/gi) || []).length;
  const internalLinks = (input.content.match(/<a\s[^>]*href=["'](?:\/|https:\/\/www\.transyachtgroup\.com\/)/gi) || []).length;
  const faqMentions = (body.match(/\bfaq\b|frequently asked|questions? and answers?/gi) || []).length;
  const translations = input.translations || {};
  const completeTranslations = ["fr", "ru", "ro", "ar"].filter((lang) => {
    const item = translations[lang] || {};
    return Boolean(item.title && item.excerpt && item.content && item.metaTitle && item.metaDescription);
  }).length;

  if (!keyword) add("keyword_missing", "error", "Add one primary search keyword.", 15);
  else {
    if (!input.title.toLocaleLowerCase("en").includes(keyword)) add("keyword_title", "warning", "Use the primary keyword naturally in the title.", 6);
    if (!body.toLocaleLowerCase("en").includes(keyword)) add("keyword_body", "error", "The primary keyword is missing from the article.", 8);
    if (density > 2.5) add("keyword_stuffing", "error", `Keyword density is too high (${density}%).`, 12);
  }
  if (bodyWords.length < 700) add("content_short", "error", `Article is too short (${bodyWords.length} words).`, 12);
  if (bodyWords.length > 1900) add("content_long", "warning", `Article is unusually long (${bodyWords.length} words).`, 3);
  if ((input.metaTitle || "").length < 30 || (input.metaTitle || "").length > 60) add("meta_title", "error", "SEO title should contain 30–60 characters.", 8);
  if ((input.metaDescription || "").length < 110 || (input.metaDescription || "").length > 155) add("meta_description", "error", "SEO description should contain 110–155 characters.", 8);
  if (h1Count) add("extra_h1", "error", "Remove H1 from the body; the page title is already H1.", 10);
  if (h2Count < 3) add("headings", "warning", "Use at least three useful H2 sections.", 5);
  if (internalLinks < 3) add("internal_links", "warning", "Add at least three relevant internal links.", 7);
  if (!faqMentions) add("faq", "warning", "Add a concise FAQ section.", 4);
  if (!input.coverImage) add("cover", "warning", "Add a relevant cover image.", 4);
  if (!input.targetPage) add("target_page", "warning", "Select the commercial page supported by this article.", 4);
  if (completeTranslations < 4) add("translations", "warning", `Only ${completeTranslations}/4 translations are complete.`, 6);

  const cannibalization = existing.map((guide) => {
    const exactKeyword = keyword && guide.primaryKeyword?.trim().toLocaleLowerCase("en") === keyword;
    const similarity = exactKeyword ? 100 : textSimilarity(`${input.title} ${body}`, `${guide.title} ${plainText(guide.content)}`);
    return { id: guide.id, title: guide.title, slug: guide.slug, similarity };
  }).filter((guide) => guide.similarity >= 35).sort((a, b) => b.similarity - a.similarity).slice(0, 5);
  if (cannibalization.length) add("cannibalization", "error", `Possible search overlap with ${cannibalization.length} existing article(s).`, 12);

  return {
    score: Math.max(0, 100 - issues.reduce((sum, issue) => sum + issue.points, 0)),
    issues,
    stats: { wordCount: bodyWords.length, h1Count, h2Count, internalLinks, keywordDensity: density, completeTranslations },
    cannibalization,
  };
}
