import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { siteContentTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { adminAuth } from "../middleware/auth";

const DEFAULT_CONTENT: Record<string, string> = {
  hero_title: "The Art of Unlimited\nMobility",
  hero_tagline: "Exquisite Cars · Superyachts · Pure Luxury",
  hero_subtitle: "Where ocean meets asphalt. Where movement becomes art.",

  about_title: "About Us",
  about_slogan: "The Art of\nExtraordinary Mobility",
  about_text: "TRANSYACHTGROUP was founded on a singular belief: that true luxury is not merely possessed — it is experienced. We are a private concierge house specializing in the curation of the world's finest superyachts and hypercars for those who accept nothing less than perfection.\n\nOur journey began in the heart of the Mediterranean, where a passion for maritime excellence and automotive artistry converged into a vision — to create a seamless bridge between the world's most extraordinary vessels and vehicles and the discerning individuals who deserve them.\n\nToday, we serve a private circle of clients across Europe, the Middle East, and Asia, delivering bespoke charter and rental experiences that transcend expectations. Every engagement is personal. Every detail, considered.",

  yacht_section_title: "Ocean Prestige",
  yacht_section_subtitle: "Superyacht Collection",
  yacht_section_desc: "Curated fleet of exceptional superyachts, delivering unparalleled privacy and luxury on the open water.",
  yacht_section_bg: "",

  car_section_title: "Road Sovereign",
  car_section_subtitle: "Elite Automotive",
  car_section_desc: "Elite automotive experiences without limits. Access the world's most sought-after hypercars and luxury vehicles.",
  car_section_bg: "",

  collection_title: "The Collection",
  collection_subtitle: "Curated Selection",

  form_title: "Initiate Your\nRequest",
  form_subtitle: "Private Concierge",
  form_desc: "Contact our concierge team to orchestrate your next journey. We respond with utmost discretion within 2 hours.",

  phone_number: "+41 79 000 00 00",
  whatsapp_number: "+41 79 000 00 00",
  admin_email: "info@transyachtgroup.com",

  footer_desc: "TRANSYACHTGROUP redefines luxury mobility. We curate the world's most exceptional superyachts and elite vehicles for discerning clientele globally.",

  office_photos: "[]",
};

async function ensureDefaultContent() {
  try {
    const existing = await db.select({ key: siteContentTable.key }).from(siteContentTable);
    const existingKeys = new Set(existing.map(e => e.key));
    const missing = Object.entries(DEFAULT_CONTENT).filter(([key]) => !existingKeys.has(key));
    if (missing.length > 0) {
      await db.insert(siteContentTable).values(missing.map(([key, value]) => ({ key, value })));
      console.log(`Inserted ${missing.length} default content entries:`, missing.map(([k]) => k).join(", "));
    }
  } catch (err) {
    console.error("Error ensuring default content:", err);
  }
}

ensureDefaultContent();

const router: IRouter = Router();

router.get("/content", async (req, res) => {
  try {
    const lang = String(req.query.lang || "en");
    const content = await db.select().from(siteContentTable).orderBy(siteContentTable.key);
    const contentMap: Record<string, string> = {};
    for (const item of content) {
      if (lang === "en") {
        contentMap[item.key] = item.value;
      } else {
        const translations = (item.translations as Record<string, string>) || {};
        contentMap[item.key] = translations[lang] || item.value;
      }
    }
    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=86400");
    res.json(contentMap);
  } catch (err) {
    console.error("Content fetch error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/content/all", adminAuth, async (_req, res) => {
  try {
    const content = await db.select().from(siteContentTable).orderBy(siteContentTable.key);
    res.json(content);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/content/:key", adminAuth, async (req, res) => {
  try {
    const key = String(req.params.key);
    const { value, translations } = req.body;

    if (typeof value !== "string") {
      res.status(400).json({ error: "Value must be a string" });
      return;
    }

    const updateData: any = { value, updatedAt: new Date() };
    if (translations && typeof translations === "object") {
      updateData.translations = translations;
    }

    const [existing] = await db
      .select()
      .from(siteContentTable)
      .where(eq(siteContentTable.key, key))
      .limit(1);

    if (existing) {
      const mergedTranslations = {
        ...((existing.translations as Record<string, string>) || {}),
        ...(translations || {}),
      };
      updateData.translations = mergedTranslations;

      const [updated] = await db
        .update(siteContentTable)
        .set(updateData)
        .where(eq(siteContentTable.key, key))
        .returning();
      res.json(updated);
    } else {
      const [created] = await db
        .insert(siteContentTable)
        .values({ key, value, translations: translations || {} })
        .returning();
      res.status(201).json(created);
    }
  } catch (err) {
    console.error("Content update error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
