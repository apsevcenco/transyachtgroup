import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import rateLimit from "express-rate-limit";

import { db } from "@workspace/db";
import { answersTable } from "@workspace/db/schema";
import { adminAuth } from "../middleware/auth";
import { INTERNAL_PATHS, normalizeInternalPath, restrictInternalLinks } from "../lib/siteLinks";

const router: IRouter = Router();
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const answerAiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 40, standardHeaders: true, legacyHeaders: false });

type AnswerFaq = { question: string; answer: string };

function slugify(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 160);
}

function textFrom(value: Record<string, unknown>, key: string, max: number): string {
  return typeof value[key] === "string" ? value[key].trim().slice(0, max) : "";
}

function optionalText(value: Record<string, unknown>, key: string, max: number): string | null {
  return textFrom(value, key, max) || null;
}

function normalizeFaq(value: unknown): AnswerFaq[] {
  return Array.isArray(value)
    ? value.map((item) => item && typeof item === "object" ? item as Record<string, unknown> : {})
      .map((item) => ({
        question: typeof item.question === "string" ? item.question.trim().slice(0, 260) : "",
        answer: typeof item.answer === "string" ? item.answer.trim().slice(0, 1_200) : "",
      }))
      .filter((item) => item.question && item.answer)
      .slice(0, 8)
    : [];
}

function plainText(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

type AnswerAuditIssue = { code: string; severity: "error" | "warning" | "info"; message: string; points: number };

const KEYWORD_STOPWORDS = new Set(["a", "an", "the", "in", "on", "of", "to", "for", "and", "or", "with", "by", "at", "from", "is", "do", "i", "my", "can", "how", "what"]);

/** Exact phrase, or (for natural questions) most of the keyword's meaningful words are present. */
function mentionsKeyword(text: string, keyword: string): boolean {
  const haystack = text.toLowerCase();
  if (haystack.includes(keyword)) return true;
  const tokens = keyword.split(/[^a-z0-9À-ɏ]+/i).filter((token) => token && !KEYWORD_STOPWORDS.has(token));
  if (tokens.length < 2) return false;
  const words = haystack.split(/[^a-z0-9À-ɏ]+/i).filter(Boolean);
  const present = tokens.filter((token) => words.some((word) => word === token || word.startsWith(token))).length;
  return present / tokens.length >= 0.8;
}

function auditAnswerInput(input: ReturnType<typeof parseAnswerInput>) {
  const issues: AnswerAuditIssue[] = [];
  const directWords = plainText(input.directAnswer).split(/\s+/).filter(Boolean).length;
  const explanationText = plainText(input.explanation);
  const explanationWords = explanationText.split(/\s+/).filter(Boolean).length;
  const keyword = (input.primaryKeyword || "").trim().toLowerCase();
  const haystack = `${input.question} ${input.directAnswer} ${explanationText}`.toLowerCase();
  const metaDescriptionLength = (input.metaDescription || "").trim().length;
  const metaTitleLength = (input.metaTitle || "").trim().length;
  const h2Count = (input.explanation.match(/<h2[\s>]/gi) || []).length;
  const linkCount = (input.explanation.match(/<a\s/gi) || []).length;

  if (!keyword) issues.push({ code: "missing_keyword", severity: "error", message: "Primary keyword is missing.", points: -10 });
  else {
    if (!mentionsKeyword(input.question, keyword)) issues.push({ code: "keyword_not_in_question", severity: "warning", message: "Use the primary keyword naturally in the question/title.", points: -8 });
    if (!mentionsKeyword(haystack, keyword)) issues.push({ code: "keyword_not_used", severity: "error", message: "Primary keyword is not used in the answer body.", points: -12 });
  }
  if (directWords < 60 || directWords > 160) issues.push({ code: "direct_answer_length", severity: "warning", message: "Direct answer should be roughly 60–160 words.", points: -8 });
  if (explanationWords < 350) issues.push({ code: "explanation_short", severity: "error", message: `Explanation is too short (${explanationWords} words). Target 450–900 useful words.`, points: -14 });
  if (h2Count < 2) issues.push({ code: "missing_sections", severity: "warning", message: "Add at least two H2 sections to structure the answer.", points: -8 });
  if ((input.faq || []).length < 3) issues.push({ code: "faq_short", severity: "warning", message: "Add at least three FAQ answers.", points: -8 });
  if (!input.relatedServicePath) issues.push({ code: "missing_related_service", severity: "warning", message: "Related service path is missing.", points: -6 });
  if (linkCount < 1) issues.push({ code: "missing_internal_link", severity: "warning", message: "Add at least one internal link to a relevant service or fleet page.", points: -6 });
  if (!input.metaTitle || metaTitleLength < 35 || metaTitleLength > 70) issues.push({ code: "meta_title_length", severity: "warning", message: "SEO title should be about 35–70 characters.", points: -7 });
  if (!input.metaDescription || metaDescriptionLength < 110 || metaDescriptionLength > 155) issues.push({ code: "meta_description_length", severity: "warning", message: "SEO description should contain 110–155 characters.", points: -8 });

  const unsupported = haystack.match(/\b(?:wi-?fi|catering(?! to)|refreshments|child seats?|baby seats?|limousines?|helicopters?|24\/7|24 hours|guaranteed availability|award-winning|years of experience|always (?:included|provided|available|guaranteed|prepared|factored)|tarmac|we guarantee|fully insured|chauffeur-driven fleet)\b/g);
  if (unsupported?.length) issues.push({ code: "unsupported_claims", severity: "error", message: `Remove claims we cannot verify: ${[...new Set(unsupported)].join(", ")}.`, points: -20 });
  const fluff = haystack.match(/\b(?:unparalleled|epitomi[sz]es|unforgettable|seamless|world-class|second to none|bespoke|dedicated|exclusive|opulent|exceptional|renowned|tailor-made|tailored)\b/g);
  if (fluff && fluff.length >= 2) issues.push({ code: "marketing_fluff", severity: "warning", message: `Replace marketing filler with concrete facts: ${[...new Set(fluff)].join(", ")}.`, points: -8 });
  if (linkCount > 5) issues.push({ code: "too_many_links", severity: "warning", message: `Too many internal links (${linkCount}); keep 2-5, one per target page.`, points: -6 });
  if (!/\d/.test(input.directAnswer) && !/^(yes|no|it depends|usually)\b/i.test(input.directAnswer.trim())) issues.push({ code: "direct_answer_not_concrete", severity: "warning", message: "Direct answer should state the concrete fact first (a figure, or a clear yes/no with the key condition).", points: -8 });

  const score = Math.max(0, Math.min(100, 100 + issues.reduce((sum, issue) => sum + issue.points, 0)));
  return {
    score,
    issues,
    stats: {
      directWords,
      explanationWords,
      h2Count,
      faqCount: input.faq.length,
      linkCount,
      metaTitleLength,
      metaDescriptionLength,
    },
    cannibalization: [],
  };
}

function parseAnswerInput(body: unknown) {
  const value = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const slug = slugify(textFrom(value, "slug", 180) || textFrom(value, "question", 180));
  const question = textFrom(value, "question", 260);
  const directAnswer = textFrom(value, "directAnswer", 1_200);
  const explanation = textFrom(value, "explanation", 40_000);
  if (!slug || !slugPattern.test(slug) || question.length < 8 || directAnswer.length < 40 || explanation.length < 120) throw new Error("INVALID_ANSWER");
  return {
    slug,
    question,
    directAnswer,
    explanation,
    faq: normalizeFaq(value.faq),
    metaTitle: optionalText(value, "metaTitle", 180),
    metaDescription: optionalText(value, "metaDescription", 320),
    primaryKeyword: optionalText(value, "primaryKeyword", 180),
    audience: optionalText(value, "audience", 300),
    relatedServicePath: optionalText(value, "relatedServicePath", 500),
    language: textFrom(value, "language", 10) || "en",
    published: Boolean(value.published),
  };
}

function extractJson(raw: string): unknown {
  return JSON.parse(raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""));
}

async function requestOpenAiJson(instructions: string, input: string): Promise<unknown> {
  const baseUrl = (process.env.OPENAI_BASE_URL || process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_NOT_CONFIGURED");
  // Answers need long, instruction-following output; gpt-4o fell short on length and facts, so default higher.
  const configuredModel = process.env.OPENAI_ANSWERS_MODEL?.trim().toLowerCase();
  const preferredModel = configuredModel && !configuredModel.startsWith("gpt-5") && !configuredModel.includes("5.6") ? configuredModel : "gpt-4.1";
  const models = Array.from(new Set([preferredModel, "gpt-4o", "gpt-4o-mini"]));
  let response: Response | null = null;
  let detail = "";
  for (const model of models) {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      signal: AbortSignal.timeout(75_000),
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: instructions }, { role: "user", content: input }],
        max_tokens: 6_000,
        response_format: { type: "json_object" },
      }),
    });
    if (response.ok) break;
    detail = (await response.text()).slice(0, 500);
    const mayBeModelAccessProblem = response.status === 400 || response.status === 403 || response.status === 404;
    if (!mayBeModelAccessProblem || model === models.at(-1)) throw new Error(`OPENAI_${response.status}:${detail}`);
  }
  if (!response?.ok) throw new Error(`OPENAI_REQUEST_FAILED:${detail}`);
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const outputText = data.choices?.[0]?.message?.content;
  if (!outputText) throw new Error("INVALID_AI_RESPONSE");
  return extractJson(outputText);
}

function cleanGeneratedAnswer(value: unknown) {
  const item = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const field = (key: string, max: number) => {
    const result = typeof item[key] === "string" ? item[key].trim().slice(0, max) : "";
    if (!result) throw new Error("INVALID_AI_RESPONSE");
    return result;
  };
  const question = field("question", 260);
  return {
    slug: slugify(typeof item.slug === "string" ? item.slug : question),
    question,
    directAnswer: field("directAnswer", 1_200),
    explanation: restrictInternalLinks(field("explanation", 40_000)),
    faq: normalizeFaq(item.faq),
    metaTitle: field("metaTitle", 180),
    metaDescription: field("metaDescription", 320),
    primaryKeyword: typeof item.primaryKeyword === "string" ? item.primaryKeyword.trim().slice(0, 180) : "",
    audience: typeof item.audience === "string" ? item.audience.trim().slice(0, 300) : "",
    relatedServicePath: typeof item.relatedServicePath === "string" ? normalizeInternalPath(item.relatedServicePath) || "" : "",
  };
}

// Verified background for AI answers. Figures are deliberately approximate; widen them rather than invent precision.
const BUSINESS_FACTS = `WHAT TRANS YACHT GROUP ACTUALLY OFFERS (describe nothing beyond this):
- A private concierge for luxury car rental, private transfers with a driver, and yacht charter on the French Riviera and in Courchevel.
- Vehicles are delivered to hotels, villas, chalets, marinas and airports at an agreed time and address, and collected at the end of the rental.
- Every request is handled individually: availability, rental terms (deposit, mileage, insurance, driver requirements) and the final quotation are confirmed personally before booking. No fixed prices are published.
- Vehicle categories include executive saloons, SUVs, supercars and ultra-luxury cars (Mercedes-Benz, Rolls-Royce, Bentley, Ferrari, Lamborghini and similar); a specific model is subject to live availability.
Never say anything is "always included", "always provided" or guaranteed. Winter equipment, route plans, pick-up points and vehicle choice are "confirmed in the individual offer". Do not claim airside/tarmac meetings, specific pick-up procedures or customs services.
FORBIDDEN CLAIMS: in-car Wi-Fi, catering or refreshments, child seats, limousines, helicopters, fixed prices, discounts, 24/7 availability, guaranteed availability, response-time promises, awards, years in business, number of clients, insurance specifics, licences held. Do not describe our "professional chauffeurs", fleet size or vehicle features unless stated above.

ROUTE FACTS (approximate, normal conditions, to Courchevel 1850 via Moûtiers):
- Geneva Airport (GVA): about 150-170 km, roughly 2.5-3 hours; main route A41 to Annecy/Albertville, then the N90 to Moûtiers and the mountain road up to Courchevel. Geneva Airport has a French sector, which matters for customs and pick-up point.
- Lyon-Saint-Exupéry (LYS): about 200-230 km, roughly 2.5-3.5 hours via Chambéry and Albertville.
- Chambéry Savoie Mont Blanc (CMF): about 100-120 km, roughly 1.5-2 hours; the closest main airport, with seasonal winter flights.
- Turin Airport (TRN): about 230-270 km, roughly 3.5-4.5 hours via the Fréjus road tunnel and Modane; tolls apply and it is the longest option.
- The last 20-25 km from Moûtiers is a mountain road with hairpin bends that can be slow in snowfall. Courchevel has several villages (1850, 1650, 1550, Le Praz); 1850 is the most exclusive. Courchevel also has an altiport used by private aircraft.
- French winter-equipment rules for mountain roads (snow tyres or chains) apply roughly from 1 November to 31 March. Say that winter preparation and conditions are confirmed in the individual offer.
- Peak Courchevel demand: Christmas/New Year and the February school holidays; arrivals and departures cluster on Saturdays, so early booking matters. Do not state a numeric notice period.
- Monaco is about 20 km from Nice Airport (roughly 30-45 min); Cannes about 30 km (roughly 35-50 min).
`;

async function generateAnswerDraft(input: { topic: string; keyword?: string; audience?: string; relatedServicePath?: string }) {
  const result = await requestOpenAiJson(
    `You create GEO-ready direct-answer pages for Trans Yacht Group. Return only valid JSON.
The answer must help AI search engines cite the brand for luxury car rental, chauffeur service, VIP transfers, yacht charter, Monaco, French Riviera, Geneva, Lyon and Courchevel.
Return {"slug":"kebab-case","question":"...","directAnswer":"70-130 words","explanation":"HTML with h2/p/ul, 500-800 words","faq":[{"question":"...","answer":"..."}],"metaTitle":"40-65 characters","metaDescription":"120-155 characters","primaryKeyword":"...","audience":"...","relatedServicePath":"/services/..."}.
Hard rules:
- "question" is a natural question a traveller would type or ask an AI assistant, and it contains the primary keyword.
- "directAnswer" answers the question completely in the first sentence, then adds the key conditions; no marketing filler. Keep it self-contained so it can be quoted alone.
- "explanation" uses at least 3 <h2> sections, short paragraphs and at least one <ul>; include 2-4 <a href> internal links, and ONLY to these exact paths: ${INTERNAL_PATHS.join(" ")}. Any other link is forbidden.
- "faq" has 3-5 items with different questions that are not repeats of the main question.
- "relatedServicePath" must be one of the allowed paths above.
- Use the primary keyword naturally in the question, directAnswer, metaTitle and body, without stuffing.
- Do not invent prices, fleet models, statistics, awards, legal claims or opening hours. Say that availability, conditions and the final quote are confirmed individually on request. Avoid claims you cannot verify.
- The "directAnswer" must contain the concrete answer (distance, duration, yes/no and the key condition) from the facts provided, not a generic description of luxury.
- Be specific and useful: use the route facts and practical details below; if something is not covered by the facts, say that it is confirmed individually instead of guessing.
- No fluff, no repeated sentences, no superlatives such as "unparalleled" or "epitomizes".
- Write in clear, factual English for an international, high-value audience.

${BUSINESS_FACTS}`,
    `TOPIC: ${input.topic}
PRIMARY KEYWORD: ${input.keyword || input.topic}
AUDIENCE: ${input.audience || "high-intent luxury travel clients"}
RELATED SERVICE PATH: ${input.relatedServicePath || ""}
Create one answer page.`
  );
  return cleanGeneratedAnswer(result);
}

async function fixAnswerDraft(input: ReturnType<typeof parseAnswerInput>, issues: AnswerAuditIssue[], stats: unknown) {
  const result = await requestOpenAiJson(
    `You improve existing GEO/AI-search answer pages for Trans Yacht Group. Return only valid JSON.
Resolve every deterministic audit issue. When the explanation is too short, EXPAND it with genuinely useful sections (conditions, process, practical tips, what to prepare) until it has at least 520 words, at least 3 <h2> sections and 2-4 internal links; never pad with filler. Preserve the business facts, luxury tone and existing internal links. Links may ONLY point to these paths: ${INTERNAL_PATHS.join(" ")}. Do not invent prices, statistics, models, awards or legal claims. Remove any claim not supported by the facts below, and make the directAnswer concrete (distance, duration, yes/no, key condition).

${BUSINESS_FACTS}
Return {"slug":"...","question":"...","directAnswer":"60-160 words","explanation":"safe HTML with h2/p/ul and at least one internal link","faq":[{"question":"...","answer":"..."}],"metaTitle":"35-70 characters","metaDescription":"110-155 characters","primaryKeyword":"...","audience":"...","relatedServicePath":"/services/..."}.`,
    `AUDIT ISSUES: ${JSON.stringify(issues)}
CURRENT STATS: ${JSON.stringify(stats)}
CURRENT ANSWER: ${JSON.stringify(input)}
Improve the answer for AI search/GEO and SEO.`
  );
  return cleanGeneratedAnswer(result);
}

router.get("/answers", async (req, res) => {
  try {
    const items = await db.select().from(answersTable).where(eq(answersTable.published, true)).orderBy(desc(answersTable.publishedAt), desc(answersTable.id));
    res.json(items);
  } catch (err) {
    req.log?.error?.({ err }, "Failed to fetch answers");
    res.status(500).json({ error: "Failed to fetch answers" });
  }
});

router.get("/answers/:slug", async (req, res) => {
  try {
    const [item] = await db.select().from(answersTable).where(and(eq(answersTable.slug, req.params.slug), eq(answersTable.published, true))).limit(1);
    if (!item) return void res.status(404).json({ error: "Answer not found" });
    res.json(item);
  } catch (err) {
    req.log?.error?.({ err }, "Failed to fetch answer");
    res.status(500).json({ error: "Failed to fetch answer" });
  }
});

router.get("/admin/answers", adminAuth, async (_req, res) => {
  const items = await db.select().from(answersTable).orderBy(desc(answersTable.updatedAt), desc(answersTable.id));
  res.json(items);
});

router.post("/admin/answers/generate", adminAuth, answerAiLimiter, async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body as Record<string, unknown> : {};
    const topic = textFrom(body, "topic", 300);
    if (topic.length < 5) return void res.status(400).json({ error: "Add a clear answer topic" });
    res.json(await generateAnswerDraft({
      topic,
      keyword: optionalText(body, "keyword", 180) || undefined,
      audience: optionalText(body, "audience", 300) || undefined,
      relatedServicePath: optionalText(body, "relatedServicePath", 500) || undefined,
    }));
  } catch (err) {
    req.log?.error?.({ err }, "AI answer generation failed");
    const code = err instanceof Error ? err.message : "";
    const error = code === "OPENAI_NOT_CONFIGURED" ? "OpenAI is not configured on the server"
      : code.startsWith("OPENAI_401") ? "OpenAI rejected the API key"
        : code.startsWith("OPENAI_429") ? "OpenAI quota or billing limit reached"
          : code.startsWith("OPENAI_403") ? "This OpenAI account does not have access to the configured model"
            : "AI answer generation failed. Check the backend logs for the recorded OpenAI error";
    res.status(code === "OPENAI_NOT_CONFIGURED" ? 503 : 502).json({ error });
  }
});

router.post("/admin/answers/audit", adminAuth, async (req, res) => {
  try {
    const data = parseAnswerInput(req.body);
    res.json(auditAnswerInput(data));
  } catch (err) {
    req.log?.error?.({ err }, "Answer SEO audit failed");
    if (err instanceof Error && err.message === "INVALID_ANSWER") return void res.status(400).json({ error: "Complete the required answer fields before auditing" });
    res.status(500).json({ error: "Answer SEO audit failed" });
  }
});

router.post("/admin/answers/fix-seo", adminAuth, answerAiLimiter, async (req, res) => {
  try {
    const data = parseAnswerInput(req.body);
    const before = auditAnswerInput(data);
    if (!before.issues.length) return void res.json({ draft: { ...data, published: false }, audit: before });
    const fixed = await fixAnswerDraft(data, before.issues, before.stats);
    const draft = parseAnswerInput({ ...fixed, language: data.language, published: false });
    const audit = auditAnswerInput(draft);
    res.json({ draft, audit, unresolvedAutoFixes: audit.issues.map((issue) => issue.code) });
  } catch (err) {
    req.log?.error?.({ err }, "AI answer SEO correction failed");
    if (err instanceof Error && err.message === "INVALID_ANSWER") return void res.status(400).json({ error: "Complete the required answer fields before fixing SEO" });
    const code = err instanceof Error ? err.message : "";
    const error = code === "OPENAI_NOT_CONFIGURED" ? "OpenAI is not configured on the server"
      : code.startsWith("OPENAI_401") ? "OpenAI rejected the API key"
        : code.startsWith("OPENAI_429") ? "OpenAI quota or billing limit reached"
          : code.startsWith("OPENAI_403") ? "This OpenAI account does not have access to the configured model"
            : "AI answer SEO correction failed. Check the backend logs for the recorded OpenAI error";
    res.status(code === "OPENAI_NOT_CONFIGURED" ? 503 : 502).json({ error });
  }
});

router.post("/admin/answers", adminAuth, async (req, res) => {
  try {
    const data = parseAnswerInput(req.body);
    const now = new Date();
    const [created] = await db.insert(answersTable).values({ ...data, publishedAt: data.published ? now : null, updatedAt: now }).returning();
    res.status(201).json(created);
  } catch (err) {
    req.log?.error?.({ err }, "Failed to create answer");
    if (err instanceof Error && err.message === "INVALID_ANSWER") return void res.status(400).json({ error: "Complete the required answer fields" });
    res.status(500).json({ error: "Failed to create answer" });
  }
});

router.put("/admin/answers/:id", adminAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return void res.status(400).json({ error: "Invalid id" });
    const data = parseAnswerInput(req.body);
    const [current] = await db.select().from(answersTable).where(eq(answersTable.id, id)).limit(1);
    const now = new Date();
    const [updated] = await db.update(answersTable).set({ ...data, publishedAt: data.published ? (current?.publishedAt || now) : null, updatedAt: now }).where(eq(answersTable.id, id)).returning();
    if (!updated) return void res.status(404).json({ error: "Answer not found" });
    res.json(updated);
  } catch (err) {
    req.log?.error?.({ err }, "Failed to update answer");
    if (err instanceof Error && err.message === "INVALID_ANSWER") return void res.status(400).json({ error: "Complete the required answer fields" });
    res.status(500).json({ error: "Failed to update answer" });
  }
});

router.delete("/admin/answers/:id", adminAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return void res.status(400).json({ error: "Invalid id" });
  const [deleted] = await db.delete(answersTable).where(eq(answersTable.id, id)).returning({ id: answersTable.id });
  if (!deleted) return void res.status(404).json({ error: "Answer not found" });
  res.status(204).end();
});

export default router;
