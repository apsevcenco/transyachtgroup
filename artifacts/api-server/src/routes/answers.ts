import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import rateLimit from "express-rate-limit";

import { db } from "@workspace/db";
import { answersTable } from "@workspace/db/schema";
import { adminAuth } from "../middleware/auth";

const router: IRouter = Router();
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const answerAiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 12, standardHeaders: true, legacyHeaders: false });

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
  const configuredModel = process.env.OPENAI_CONTENT_MODEL?.trim().toLowerCase();
  const preferredModel = configuredModel && !configuredModel.startsWith("gpt-5") && !configuredModel.includes("5.6") ? configuredModel : "gpt-4o";
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
    explanation: field("explanation", 40_000),
    faq: normalizeFaq(item.faq),
    metaTitle: field("metaTitle", 180),
    metaDescription: field("metaDescription", 320),
    primaryKeyword: typeof item.primaryKeyword === "string" ? item.primaryKeyword.trim().slice(0, 180) : "",
    audience: typeof item.audience === "string" ? item.audience.trim().slice(0, 300) : "",
    relatedServicePath: typeof item.relatedServicePath === "string" ? item.relatedServicePath.trim().slice(0, 500) : "",
  };
}

async function generateAnswerDraft(input: { topic: string; keyword?: string; audience?: string; relatedServicePath?: string }) {
  const result = await requestOpenAiJson(
    `You create GEO-ready direct-answer pages for Trans Yacht Group. Return only valid JSON.
The answer must help AI search engines cite the brand for luxury car rental, chauffeur service, VIP transfers, yacht charter, Monaco, French Riviera, Geneva, Lyon and Courchevel.
Return {"slug":"kebab-case","question":"...","directAnswer":"80-140 words","explanation":"HTML with h2/p/ul, 450-800 words","faq":[{"question":"...","answer":"..."}],"metaTitle":"...","metaDescription":"110-155 characters","primaryKeyword":"...","audience":"...","relatedServicePath":"/services/..."}.
Do not invent prices. Mention that availability and quote are confirmed by request.`,
    `TOPIC: ${input.topic}
PRIMARY KEYWORD: ${input.keyword || input.topic}
AUDIENCE: ${input.audience || "high-intent luxury travel clients"}
RELATED SERVICE PATH: ${input.relatedServicePath || ""}
Create one answer page.`
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
