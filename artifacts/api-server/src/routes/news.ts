import { Router, type IRouter } from "express";
import { and, desc, eq, isNotNull, lte, or } from "drizzle-orm";
import rateLimit from "express-rate-limit";

import { db } from "@workspace/db";
import { newsTable } from "@workspace/db/schema";
import { adminAuth } from "../middleware/auth";

const router: IRouter = Router();
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const newsAiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many AI requests. Please wait a minute and try again." },
});

const TARGET_LANGUAGES = {
  fr: "French",
  ru: "Russian",
  ro: "Romanian",
  ar: "Arabic",
} as const;

type NewsCopy = {
  title: string;
  excerpt: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
};

function plainText(value: unknown): string {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 160);
}

function extractJson(text: string): unknown {
  return JSON.parse(text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""));
}

function cleanCopy(value: unknown): NewsCopy {
  const item = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const field = (name: string, max: number) => {
    const result = typeof item[name] === "string" ? item[name].trim() : "";
    if (!result || result.length > max) throw new Error("INVALID_AI_RESPONSE");
    return result;
  };
  return {
    title: field("title", 180),
    excerpt: field("excerpt", 600),
    content: field("content", 120_000),
    metaTitle: field("metaTitle", 180),
    metaDescription: field("metaDescription", 320),
  };
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
        messages: [
          { role: "system", content: instructions },
          { role: "user", content: input },
        ],
        max_tokens: 16_000,
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

function parseNewsInput(body: unknown) {
  const value = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const text = (key: string, max: number) => typeof value[key] === "string" ? value[key].trim().slice(0, max) : "";
  const optional = (key: string, max: number) => text(key, max) || null;
  const slug = slugify(text("slug", 180) || text("title", 180));
  const gallery = Array.isArray(value.gallery)
    ? value.gallery.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 10)
    : [];
  if (!slug || !text("title", 180) || !text("excerpt", 600) || !text("content", 120_000)) throw new Error("INVALID_NEWS");
  return {
    slug,
    title: text("title", 180),
    excerpt: text("excerpt", 600),
    content: text("content", 120_000),
    coverImage: optional("coverImage", 2_000),
    gallery,
    metaTitle: optional("metaTitle", 180),
    metaDescription: optional("metaDescription", 320),
    translations: value.translations && typeof value.translations === "object" ? value.translations : {},
    primaryKeyword: optional("primaryKeyword", 180),
    brief: optional("brief", 4_000),
    scheduledAt: text("scheduledAt", 80) ? new Date(text("scheduledAt", 80)) : null,
    published: Boolean(value.published),
  };
}

function publiclyVisible() {
  return or(
    eq(newsTable.published, true),
    and(isNotNull(newsTable.scheduledAt), lte(newsTable.scheduledAt, new Date())),
  );
}

function effectiveNewsState(item: typeof newsTable.$inferSelect) {
  const scheduledIsDue = Boolean(item.scheduledAt && item.scheduledAt.getTime() <= Date.now());
  const effectivePublished = item.published || scheduledIsDue;
  return { ...item, published: effectivePublished, publishedAt: effectivePublished ? item.publishedAt || item.scheduledAt : item.publishedAt };
}

function localizedNews(item: typeof newsTable.$inferSelect, lang: string) {
  const translations = (item.translations || {}) as Record<string, Partial<NewsCopy>>;
  const translated = translations[lang] || {};
  const effective = effectiveNewsState(item);
  return {
    ...effective,
    title: translated.title || item.title,
    excerpt: translated.excerpt || item.excerpt,
    content: translated.content || item.content,
    metaTitle: translated.metaTitle || item.metaTitle,
    metaDescription: translated.metaDescription || item.metaDescription,
  };
}

async function generateNewsDraft(input: { topic: string; keyword: string; brief: string; wordCount: number }): Promise<NewsCopy & { slug: string; translations: Record<string, NewsCopy> }> {
  const raw = await requestOpenAiJson(
    `You write original editorial news for Trans Yacht Group. Return only valid JSON.
The news must support premium car rental, chauffeur service, VIP transfers, Monaco, the French Riviera and Courchevel when relevant.
Never invent fake awards, fake client names, fake partnerships, prices, availability or legal claims.
Return HTML content using p, h2, h3, ul, li and a tags only. Do not include h1 inside content.`,
    `Create an original English news article.
Topic: ${input.topic}
Primary keyword: ${input.keyword}
Brief: ${input.brief}
Target visible length: ${input.wordCount} words.
The title should contain the primary keyword naturally when possible.
Meta description must be 110-155 characters.
Return {"title":"...","excerpt":"...","content":"...","metaTitle":"...","metaDescription":"..."}.`,
  );
  const copy = cleanCopy(raw);
  const translations: Record<string, NewsCopy> = {};
  for (const [code, language] of Object.entries(TARGET_LANGUAGES)) {
    const translated = await requestOpenAiJson(
      `You localize Trans Yacht Group news. Return only valid JSON with the same fields.
Keep HTML structure, preserve internal links, translate naturally for luxury travel readers.`,
      `Translate and localize this news article into ${language}.
SOURCE=${JSON.stringify(copy)}
Return {"title":"...","excerpt":"...","content":"...","metaTitle":"...","metaDescription":"..."}.`,
    );
    translations[code] = cleanCopy(translated);
  }
  return { ...copy, slug: slugify(copy.title), translations };
}

router.get("/news", async (req, res) => {
  try {
    const items = await db.select().from(newsTable)
      .where(publiclyVisible())
      .orderBy(desc(newsTable.publishedAt), desc(newsTable.id));
    res.json(items.map((item) => localizedNews(item, String(req.query.lang || "en"))));
  } catch (err) {
    req.log?.error?.({ err }, "News fetch failed");
    res.status(500).json({ error: "Failed to fetch news" });
  }
});

router.get("/news/:slug", async (req, res) => {
  try {
    const slug = String(req.params.slug || "");
    if (!slugPattern.test(slug)) return void res.status(404).json({ error: "News not found" });
    const [item] = await db.select().from(newsTable).where(and(eq(newsTable.slug, slug), publiclyVisible())).limit(1);
    if (!item) return void res.status(404).json({ error: "News not found" });
    res.json(localizedNews(item, String(req.query.lang || "en")));
  } catch (err) {
    req.log?.error?.({ err }, "News detail fetch failed");
    res.status(500).json({ error: "Failed to fetch news" });
  }
});

router.get("/admin/news", adminAuth, async (_req, res) => {
  const items = await db.select().from(newsTable).orderBy(desc(newsTable.updatedAt), desc(newsTable.id));
  res.json(items.map(effectiveNewsState));
});

router.post("/admin/news/generate", adminAuth, newsAiLimiter, async (req, res) => {
  try {
    const value = req.body && typeof req.body === "object" ? req.body as Record<string, unknown> : {};
    const topic = typeof value.topic === "string" ? value.topic.trim().slice(0, 240) : "";
    if (topic.length < 5) return void res.status(400).json({ error: "Enter a more specific topic" });
    const keyword = typeof value.keyword === "string" ? value.keyword.trim().slice(0, 180) : topic;
    const brief = typeof value.brief === "string" ? value.brief.trim().slice(0, 4_000) : "";
    const requestedWordCount = Number(value.wordCount);
    const wordCount = Number.isFinite(requestedWordCount) ? Math.min(1_500, Math.max(1_000, Math.round(requestedWordCount))) : 1_200;
    res.json(await generateNewsDraft({ topic, keyword, brief, wordCount }));
  } catch (err) {
    req.log?.error?.({ err }, "AI news generation failed");
    const code = err instanceof Error ? err.message : "";
    const error = code === "OPENAI_NOT_CONFIGURED" ? "OpenAI is not configured on the server"
      : code.startsWith("OPENAI_401") ? "OpenAI rejected the API key"
        : code.startsWith("OPENAI_429") ? "OpenAI quota or billing limit reached"
          : code.startsWith("OPENAI_403") ? "This OpenAI account does not have access to the configured model"
            : "AI news generation failed. Check the backend logs for the recorded OpenAI error";
    res.status(code === "OPENAI_NOT_CONFIGURED" ? 503 : 502).json({ error });
  }
});

router.post("/admin/news", adminAuth, async (req, res) => {
  try {
    const data = parseNewsInput(req.body);
    const now = new Date();
    const [created] = await db.insert(newsTable).values({ ...data, publishedAt: data.published ? now : null, updatedAt: now }).returning();
    res.status(201).json(created);
  } catch (err) {
    if (err instanceof Error && err.message === "INVALID_NEWS") return void res.status(400).json({ error: "Invalid news" });
    if ((err as { code?: string }).code === "23505") return void res.status(409).json({ error: "Slug already exists" });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/admin/news/:id", adminAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return void res.status(400).json({ error: "Invalid id" });
    const data = parseNewsInput(req.body);
    const [current] = await db.select().from(newsTable).where(eq(newsTable.id, id)).limit(1);
    if (!current) return void res.status(404).json({ error: "News not found" });
    const [updated] = await db.update(newsTable).set({
      ...data,
      publishedAt: data.published ? current.publishedAt || new Date() : null,
      updatedAt: new Date(),
    }).where(eq(newsTable.id, id)).returning();
    res.json(updated);
  } catch (err) {
    if (err instanceof Error && err.message === "INVALID_NEWS") return void res.status(400).json({ error: "Invalid news" });
    if ((err as { code?: string }).code === "23505") return void res.status(409).json({ error: "Slug already exists" });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/admin/news/:id", adminAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return void res.status(400).json({ error: "Invalid id" });
  const [deleted] = await db.delete(newsTable).where(eq(newsTable.id, id)).returning({ id: newsTable.id });
  if (!deleted) return void res.status(404).json({ error: "News not found" });
  res.status(204).end();
});

export default router;
