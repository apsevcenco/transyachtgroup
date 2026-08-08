import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { guidesTable, vehiclesTable } from "@workspace/db/schema";
import { asc, desc, eq, ne } from "drizzle-orm";

const router: IRouter = Router();
const SITE_URL = "https://www.transyachtgroup.com";
const LANGUAGES = ["en", "fr", "ru", "ro", "ar"] as const;

function escapeXml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
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
        image: vehiclesTable.image,
        images: vehiclesTable.images,
        createdAt: vehiclesTable.createdAt,
      })
      .from(vehiclesTable)
      .where(ne(vehiclesTable.visible, false))
      .orderBy(asc(vehiclesTable.id));

    const entries = vehicles.map((vehicle) => {
      const path = `/vehicle/${vehicle.id}`;
      const allImages = [
        vehicle.image,
        ...(Array.isArray(vehicle.images) ? vehicle.images : []),
      ];
      const images = [...new Set(allImages.map(publicImageUrl).filter(Boolean))]
        .slice(0, 20)
        .map(
          (image) =>
            `    <image:image><image:loc>${escapeXml(image)}</image:loc><image:title>${escapeXml(vehicle.name)}</image:title></image:image>`,
        )
        .join("\n");
      const alternates = LANGUAGES.map(
        (lang) =>
          `    <xhtml:link rel="alternate" hreflang="${lang}" href="${SITE_URL}${path}?lang=${lang}"/>`,
      ).join("\n");
      const lastmod = vehicle.createdAt
        ? `    <lastmod>${vehicle.createdAt.toISOString()}</lastmod>\n`
        : "";

      return `  <url>
    <loc>${SITE_URL}${path}?lang=en</loc>
${alternates}
    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}${path}?lang=en"/>
${lastmod}    <changefreq>weekly</changefreq>
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
      .where(eq(guidesTable.published, true))
      .orderBy(desc(guidesTable.publishedAt));

    const entries = guides.map((guide) => {
      const path = `/guides/${guide.slug}/`;
      const image = publicImageUrl(guide.coverImage);
      const imageXml = image ? `\n    <image:image><image:loc>${escapeXml(image)}</image:loc><image:title>${escapeXml(guide.title)}</image:title></image:image>` : "";
      return `  <url>
    <loc>${SITE_URL}${path}?lang=en</loc>
    <lastmod>${(guide.updatedAt || new Date()).toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>${imageXml}
  </url>`;
    });

    res.set({ "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" });
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${entries.join("\n")}
</urlset>`);
  } catch (err) {
    req.log?.error?.({ err }, "Guide sitemap generation failed");
    res.status(500).type("text/plain").send("Unable to generate sitemap");
  }
});

export default router;
