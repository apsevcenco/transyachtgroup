import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { answersTable, guidesTable, newsTable, vehiclesTable } from "@workspace/db/schema";
import { and, asc, desc, eq, isNotNull, lte, ne, or } from "drizzle-orm";
import { vehiclePath } from "../lib/vehicleSeo";

const router: IRouter = Router();
const SITE_URL = "https://www.transyachtgroup.com";

function escapeXml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function plainTitle(value: unknown): string {
  return String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function publicImageUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value, SITE_URL);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.href
      : null;
  } catch {
    return null;
  }
}

router.get("/vehicles-sitemap.xml", async (req, res) => {
  try {
    const vehicles = await db
      .select({
        id: vehiclesTable.id,
        name: vehiclesTable.name,
        category: vehiclesTable.category,
        image: vehiclesTable.image,
        images: vehiclesTable.images,
      })
      .from(vehiclesTable)
      .where(ne(vehiclesTable.visible, false))
      .orderBy(asc(vehiclesTable.id));

    const entries = vehicles.map((vehicle) => {
      const path = vehiclePath(vehicle);
      const allImages = [
        vehicle.image,
        ...(Array.isArray(vehicle.images) ? vehicle.images : []),
      ];
      const images = [...new Set(allImages.map(publicImageUrl).filter(Boolean))]
        .slice(0, 20)
        .map(
          (image) =>
            `    <image:image><image:loc>${escapeXml(image)}</image:loc><image:title>${escapeXml(plainTitle(vehicle.name))}</image:title></image:image>`,
        )
        .join("\n");

      // No updatedAt column on vehicles: createdAt would be a misleading lastmod, so none is emitted.
      return `  <url>
    <loc>${SITE_URL}${path}/</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
${images}
  </url>`;
    });

    res.set({
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
    });
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${entries.join("\n")}
</urlset>`);
  } catch (err) {
    req.log?.error?.({ err }, "Vehicle sitemap generation failed");
    res.status(500).type("text/plain").send("Unable to generate sitemap");
  }
});

router.get("/guides-sitemap.xml", async (req, res) => {
  try {
    const guides = await db.select({
      slug: guidesTable.slug,
      coverImage: guidesTable.coverImage,
      title: guidesTable.title,
      updatedAt: guidesTable.updatedAt,
    }).from(guidesTable)
      .where(or(eq(guidesTable.published, true), and(isNotNull(guidesTable.scheduledAt), lte(guidesTable.scheduledAt, new Date()))))
      .orderBy(desc(guidesTable.publishedAt));

    const entries = guides.map((guide) => {
      const path = `/guides/${guide.slug}`;
      const image = publicImageUrl(guide.coverImage);
      const lastmod = (guide.updatedAt || new Date()).toISOString();

      const imageXml = image ? `\n    <image:image><image:loc>${escapeXml(image)}</image:loc><image:title>${escapeXml(plainTitle(guide.title))}</image:title></image:image>` : "";
      return `  <url>
    <loc>${SITE_URL}${path}/</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>${imageXml}
  </url>`;
    });

    res.set({ "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" });
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${entries.join("\n")}
</urlset>`);
  } catch (err) {
    req.log?.error?.({ err }, "Guide sitemap generation failed");
    res.status(500).type("text/plain").send("Unable to generate sitemap");
  }
});

router.get("/news-sitemap.xml", async (req, res) => {
  try {
    const news = await db.select({
      slug: newsTable.slug,
      coverImage: newsTable.coverImage,
      title: newsTable.title,
      updatedAt: newsTable.updatedAt,
    }).from(newsTable)
      .where(or(eq(newsTable.published, true), and(isNotNull(newsTable.scheduledAt), lte(newsTable.scheduledAt, new Date()))))
      .orderBy(desc(newsTable.publishedAt));

    const entries = news.map((item) => {
      const path = `/news/${item.slug}`;
      const image = publicImageUrl(item.coverImage);
      const lastmod = (item.updatedAt || new Date()).toISOString();

      const imageXml = image ? `\n    <image:image><image:loc>${escapeXml(image)}</image:loc><image:title>${escapeXml(plainTitle(item.title))}</image:title></image:image>` : "";
      return `  <url>
    <loc>${SITE_URL}${path}/</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>${imageXml}
  </url>`;
    });

    res.set({ "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" });
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${entries.join("\n")}
</urlset>`);
  } catch (err) {
    req.log?.error?.({ err }, "News sitemap generation failed");
    res.status(500).type("text/plain").send("Unable to generate sitemap");
  }
});

router.get("/answers-sitemap.xml", async (req, res) => {
  try {
    const answers = await db.select({
      slug: answersTable.slug,
      question: answersTable.question,
      updatedAt: answersTable.updatedAt,
    }).from(answersTable)
      .where(eq(answersTable.published, true))
      .orderBy(desc(answersTable.publishedAt));

    const urls = answers.map((answer) => {
      const lastmod = answer.updatedAt ? new Date(answer.updatedAt).toISOString() : new Date().toISOString();
      return `  <url>
    <loc>${SITE_URL}/answers/${escapeXml(answer.slug)}/</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
    }).join("\n");

    res.set({ "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" });
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`);
  } catch (err) {
    req.log?.error?.({ err }, "Failed to build answers sitemap");
    res.status(500).type("application/xml").send("<?xml version=\"1.0\" encoding=\"UTF-8\"?><error>Failed to build sitemap</error>");
  }
});

export default router;
