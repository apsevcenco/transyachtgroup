import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";

import { db } from "@workspace/db";
import { guidesTable } from "@workspace/db/schema";
import { adminAuth } from "../middleware/auth";

const router: IRouter = Router();
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function parseGuideInput(body: unknown) {
  const value = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const text = (key: string, min: number, max: number) => {
    const result = typeof value[key] === "string" ? value[key].trim() : "";
    if (result.length < min || result.length > max) throw new Error("INVALID_GUIDE");
    return result;
  };
  const nullableText = (key: string, max: number) => {
    if (value[key] == null || value[key] === "") return null;
    if (typeof value[key] !== "string" || value[key].length > max) throw new Error("INVALID_GUIDE");
    return value[key].trim();
  };
  const slug = text("slug", 3, 160);
  if (!slugPattern.test(slug)) throw new Error("INVALID_GUIDE");
  const translations = value.translations && typeof value.translations === "object" && !Array.isArray(value.translations)
    ? value.translations as Record<string, Record<string, string>> : {};
  return {
    slug,
    title: text("title", 3, 180),
    excerpt: text("excerpt", 10, 600),
    content: text("content", 20, 100_000),
    coverImage: nullableText("coverImage", 2_000),
    metaTitle: nullableText("metaTitle", 180),
    metaDescription: nullableText("metaDescription", 320),
    translations,
    published: value.published === true,
  };
}

function localizedGuide(guide: typeof guidesTable.$inferSelect, lang: string) {
  const translations = (guide.translations || {}) as Record<string, Record<string, string>>;
  const translated = translations[lang] || {};
  return {
    ...guide,
    title: translated.title || guide.title,
    excerpt: translated.excerpt || guide.excerpt,
    content: translated.content || guide.content,
    metaTitle: translated.metaTitle || guide.metaTitle,
    metaDescription: translated.metaDescription || guide.metaDescription,
  };
}

router.get("/guides", async (req, res) => {
  try {
    const lang = String(req.query.lang || "en");
    const guides = await db.select().from(guidesTable)
      .where(eq(guidesTable.published, true))
      .orderBy(desc(guidesTable.publishedAt), desc(guidesTable.id));
    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=3600");
    res.json(guides.map((guide) => localizedGuide(guide, lang)));
  } catch (err) {
    req.log?.error?.({ err }, "Guides fetch failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/guides/:slug", async (req, res) => {
  try {
    const slug = String(req.params.slug || "");
    if (!slugPattern.test(slug)) return void res.status(404).json({ error: "Guide not found" });
    const [guide] = await db.select().from(guidesTable)
      .where(and(eq(guidesTable.slug, slug), eq(guidesTable.published, true))).limit(1);
    if (!guide) return void res.status(404).json({ error: "Guide not found" });
    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=3600");
    res.json(localizedGuide(guide, String(req.query.lang || "en")));
  } catch (err) {
    req.log?.error?.({ err }, "Guide fetch failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admin/guides", adminAuth, async (_req, res) => {
  try {
    res.json(await db.select().from(guidesTable).orderBy(desc(guidesTable.updatedAt), desc(guidesTable.id)));
  } catch { res.status(500).json({ error: "Internal server error" }); }
});

router.post("/admin/guides", adminAuth, async (req, res) => {
  try {
    const data = parseGuideInput(req.body);
    const now = new Date();
    const [created] = await db.insert(guidesTable).values({
      ...data,
      publishedAt: data.published ? now : null,
      updatedAt: now,
    }).returning();
    res.status(201).json(created);
  } catch (err) {
    if (err instanceof Error && err.message === "INVALID_GUIDE") return void res.status(400).json({ error: "Invalid guide" });
    if ((err as { code?: string }).code === "23505") return void res.status(409).json({ error: "Slug already exists" });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/admin/guides/:id", adminAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return void res.status(400).json({ error: "Invalid id" });
    const data = parseGuideInput(req.body);
    const [current] = await db.select().from(guidesTable).where(eq(guidesTable.id, id)).limit(1);
    if (!current) return void res.status(404).json({ error: "Guide not found" });
    const [updated] = await db.update(guidesTable).set({
      ...data,
      publishedAt: data.published ? current.publishedAt || new Date() : null,
      updatedAt: new Date(),
    }).where(eq(guidesTable.id, id)).returning();
    res.json(updated);
  } catch (err) {
    if (err instanceof Error && err.message === "INVALID_GUIDE") return void res.status(400).json({ error: "Invalid guide" });
    if ((err as { code?: string }).code === "23505") return void res.status(409).json({ error: "Slug already exists" });
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/admin/guides/:id", adminAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return void res.status(400).json({ error: "Invalid id" });
  const [deleted] = await db.delete(guidesTable).where(eq(guidesTable.id, id)).returning({ id: guidesTable.id });
  if (!deleted) return void res.status(404).json({ error: "Guide not found" });
  res.status(204).end();
});

export default router;
