import { Router, type IRouter } from "express";
import rateLimit from "express-rate-limit";
import { db } from "@workspace/db";
import { vehiclesTable, siteContentTable } from "@workspace/db/schema";
import { eq, inArray } from "drizzle-orm";
import { generateDocument } from "../documents/generateDocument";
import type {
  RentalDates,
  TransferDetails,
} from "../documents/builders/proposal";
import {
  renderFleetOfferHtml,
  type FleetOfferVehicle,
} from "../documents/builders/fleetOffer";
import {
  normalizeTemplate,
  PDF_CONTENT_TYPE,
} from "../documents/documentTypes";
import { renderPdf } from "../documents/pdf/generatePdf";
import { validateImageUrls } from "../documents/core/util";
import { adminAuth } from "../middleware/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const languageNames = {
  en: "English",
  fr: "French",
  ru: "Russian",
  ro: "Romanian",
  ar: "Arabic",
} as const;

type BusinessLetterCopy = {
  headline: string;
  subheadline: string;
  greeting: string;
  opening: string;
  valueProposition: string;
  benefits: string[];
  partnerAngle: string;
  callToAction: string;
  signature: string;
};

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function extractJson(text: string): unknown {
  return JSON.parse(text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""));
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
        max_tokens: 4_000,
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

function cleanBusinessLetter(value: unknown): BusinessLetterCopy {
  const item = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const field = (name: string, max: number) => {
    const result = typeof item[name] === "string" ? item[name].trim() : "";
    if (!result || result.length > max) throw new Error("INVALID_AI_RESPONSE");
    return result;
  };
  const benefits = Array.isArray(item.benefits)
    ? item.benefits.filter((v): v is string => typeof v === "string" && v.trim().length > 0).map((v) => v.trim()).slice(0, 5)
    : [];
  if (benefits.length < 3) throw new Error("INVALID_AI_RESPONSE");
  return {
    headline: field("headline", 120),
    subheadline: field("subheadline", 180),
    greeting: field("greeting", 120),
    opening: field("opening", 600),
    valueProposition: field("valueProposition", 650),
    benefits,
    partnerAngle: field("partnerAngle", 650),
    callToAction: field("callToAction", 350),
    signature: field("signature", 220),
  };
}

function renderBusinessLetterHtml(input: {
  copy: BusinessLetterCopy;
  language: keyof typeof languageNames;
  imageUrl?: string | null;
  topic: string;
  service: string;
  recipientType: string;
  contact: { phone?: string; whatsapp?: string; email?: string; website?: string };
}) {
  const dir = input.language === "ar" ? "rtl" : "ltr";
  const c = input.copy;
  const benefits = c.benefits.map((benefit) => `<li>${escapeHtml(benefit)}</li>`).join("");
  const image = input.imageUrl
    ? `<div class="photo"><img src="${escapeHtml(input.imageUrl)}" alt="Luxury service" /></div>`
    : `<div class="photo placeholder">TRANS YACHT GROUP</div>`;
  return `<!doctype html>
<html lang="${input.language}" dir="${dir}">
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Inter, Arial, sans-serif; color: #111; background: #f7f3ea; }
    .page { width: 210mm; height: 297mm; padding: 18mm; background: linear-gradient(135deg, #fbf8ef 0%, #f1eadb 100%); position: relative; overflow: hidden; }
    .page:before { content: ""; position: absolute; inset: 10mm; border: 1px solid rgba(184,138,61,.35); pointer-events: none; }
    .brand { display: flex; justify-content: space-between; align-items: flex-start; gap: 18px; position: relative; z-index: 1; }
    .brand-name { font-family: Georgia, serif; letter-spacing: .22em; font-size: 15px; color: #111; }
    .label { letter-spacing: .24em; text-transform: uppercase; color: #a8792b; font-size: 9px; margin-top: 4px; }
    .meta { text-align: ${dir === "rtl" ? "left" : "right"}; font-size: 10px; line-height: 1.6; color: #5d5548; max-width: 60mm; }
    .hero { display: grid; grid-template-columns: 78mm 1fr; gap: 12mm; margin-top: 15mm; align-items: stretch; position: relative; z-index: 1; direction: ltr; }
    .photo { height: 105mm; border-radius: 2mm; overflow: hidden; background: #171717; display: flex; align-items: center; justify-content: center; color: #d9b46a; font-family: Georgia, serif; letter-spacing: .18em; text-align: center; padding: 10mm; }
    .photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .headline { direction: ${dir}; }
    h1 { font-family: Georgia, serif; font-size: 33px; line-height: 1.05; margin: 0 0 8mm; font-weight: 400; letter-spacing: -.02em; }
    .sub { color: #7c622f; font-size: 13px; line-height: 1.55; margin-bottom: 10mm; }
    .content { margin-top: 13mm; display: grid; grid-template-columns: 1fr 68mm; gap: 10mm; position: relative; z-index: 1; direction: ${dir}; }
    p { margin: 0 0 4.5mm; font-size: 11.5px; line-height: 1.62; color: #2b2924; }
    .greeting { font-family: Georgia, serif; font-size: 17px; color: #111; margin-bottom: 5mm; }
    .panel { border-left: ${dir === "rtl" ? "0" : "1px"} solid rgba(184,138,61,.35); border-right: ${dir === "rtl" ? "1px" : "0"} solid rgba(184,138,61,.35); padding-${dir === "rtl" ? "right" : "left"}: 7mm; }
    .panel h2 { margin: 0 0 4mm; font-size: 10px; text-transform: uppercase; letter-spacing: .2em; color: #a8792b; font-weight: 600; }
    ul { margin: 0; padding-${dir === "rtl" ? "right" : "left"}: 5mm; }
    li { margin-bottom: 3.5mm; font-size: 11px; line-height: 1.45; color: #2b2924; }
    .cta { margin-top: 7mm; padding: 5mm 6mm; background: #111; color: #f5ead2; font-size: 11px; line-height: 1.55; }
    .signature { margin-top: 7mm; font-family: Georgia, serif; font-size: 13px; color: #111; white-space: pre-line; }
    .footer { position: absolute; left: 18mm; right: 18mm; bottom: 12mm; display: flex; justify-content: space-between; gap: 10px; border-top: 1px solid rgba(184,138,61,.35); padding-top: 4mm; font-size: 9.5px; color: #5d5548; z-index: 1; direction: ltr; }
  </style>
</head>
<body>
  <main class="page">
    <section class="brand">
      <div><div class="brand-name">TRANS YACHT GROUP</div><div class="label">${escapeHtml(input.service)}</div></div>
      <div class="meta">${escapeHtml(input.recipientType)}<br/>${escapeHtml(input.topic)}</div>
    </section>
    <section class="hero">${image}<div class="headline"><h1>${escapeHtml(c.headline)}</h1><div class="sub">${escapeHtml(c.subheadline)}</div></div></section>
    <section class="content">
      <div>
        <div class="greeting">${escapeHtml(c.greeting)}</div>
        <p>${escapeHtml(c.opening)}</p>
        <p>${escapeHtml(c.valueProposition)}</p>
        <p>${escapeHtml(c.partnerAngle)}</p>
        <div class="cta">${escapeHtml(c.callToAction)}</div>
        <div class="signature">${escapeHtml(c.signature)}</div>
      </div>
      <aside class="panel"><h2>Key advantages</h2><ul>${benefits}</ul></aside>
    </section>
    <footer class="footer">
      <span>${escapeHtml(input.contact.phone || "")}</span>
      <span>${escapeHtml(input.contact.whatsapp || "")}</span>
      <span>${escapeHtml(input.contact.email || "")}</span>
      <span>${escapeHtml(input.contact.website || "www.transyachtgroup.com")}</span>
    </footer>
  </main>
</body>
</html>`;
}

function withDeadline<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Operation timed out after ${ms / 1000}s`)),
        ms,
      ),
    ),
  ]);
}

// HH:MM only — anything else (missing, malformed) is dropped rather than
// passed through, so the renderer's "has both times" check stays reliable.
function parseTime(v: unknown): string | undefined {
  return typeof v === "string" && /^\d{2}:\d{2}$/.test(v) ? v : undefined;
}

function parseLocation(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

// Validates the admin-supplied rental quote — malformed/incomplete input
// (e.g. dates without a rate) just falls back to the generic proposal rather
// than erroring the whole request.
function parseRentalDates(body: unknown): RentalDates | undefined {
  const rd = (body as any)?.rentalDates;
  if (!rd || typeof rd !== "object") return undefined;

  const start = typeof rd.start === "string" ? rd.start : "";
  const end = typeof rd.end === "string" ? rd.end : "";
  const mode =
    rd.mode === "monthly"
      ? "monthly"
      : rd.mode === "daily"
        ? "daily"
        : undefined;
  const rate = Number(rd.rate);
  const periods = Number(rd.periods);
  const total = Number(rd.total);
  const pickupTime = parseTime(rd.pickupTime);
  const returnTime = parseTime(rd.returnTime);
  const pickupLocation = parseLocation(rd.pickupLocation);
  const returnLocation = parseLocation(rd.returnLocation);

  if (!start || !end || !mode) return undefined;
  if (!Number.isFinite(periods) || periods <= 0) return undefined;
  if (!Number.isFinite(rate) || rate <= 0) return undefined;
  if (!Number.isFinite(total) || total <= 0) return undefined;

  return {
    start,
    end,
    mode,
    rate,
    periods,
    total,
    pickupTime,
    returnTime,
    pickupLocation,
    returnLocation,
  };
}

// Validates the admin-supplied transfer booking — mutually exclusive with a
// rental quote, and just as tolerant of incomplete input.
function parseTransferDetails(body: unknown): TransferDetails | undefined {
  const td = (body as any)?.transferDetails;
  if (!td || typeof td !== "object") return undefined;

  const from = typeof td.from === "string" ? td.from.trim() : "";
  const to = typeof td.to === "string" ? td.to.trim() : "";
  const date = typeof td.date === "string" ? td.date : "";
  const time = typeof td.time === "string" ? td.time : "";
  const passengers = Number(td.passengers);
  const price = Number(td.price);

  if (!from || !to || !date || !time) return undefined;
  if (!Number.isFinite(passengers) || passengers <= 0) return undefined;
  if (!Number.isFinite(price) || price <= 0) return undefined;

  return { from, to, date, time, passengers, price };
}

// PDF generation is CPU-intensive — tighter per-IP limit than the global one.
const pdfLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/vehicles/:id/proposal", pdfLimiter, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }

    const [vehicle] = await db
      .select()
      .from(vehiclesTable)
      .where(eq(vehiclesTable.id, id));

    if (!vehicle || vehicle.visible === false) {
      res.status(404).json({ error: "Vehicle not found" });
      return;
    }

    // Fetch CMS contact fields
    const contentRows = await db
      .select({ key: siteContentTable.key, value: siteContentTable.value })
      .from(siteContentTable)
      .where(
        inArray(siteContentTable.key, [
          "phone_number",
          "whatsapp_number",
          "admin_email",
        ]),
      );

    const cms = Object.fromEntries(contentRows.map((r) => [r.key, r.value]));

    const contact = {
      phone: cms["phone_number"] || undefined,
      whatsapp: cms["whatsapp_number"] || undefined,
      email: cms["admin_email"] || undefined,
      website: "www.transyachtgroup.com",
    };

    const lang = req.query.lang === "ru" ? "russian" : "english";

    // Spread the full DB vehicle into yachtProfile — generateDocument casts it
    // as `any` and hands it to buildProposalModel, which reads .specs, .images,
    // .description directly. Add photo_urls so the URL prober gets candidates.
    const images = Array.isArray(vehicle.images)
      ? (vehicle.images as string[])
      : [];

    const doc = await withDeadline(
      generateDocument(
        {
          documentType: "proposal",
          format: "pdf",
          yachtProfile: {
            ...vehicle,
            photo_urls: images,
          } as any,
          exportSettings: {
            engine: "adaptive",
            language: lang as any,
          },
        },
        contact,
      ),
      120_000,
    );

    // Sanitise vehicle name for Content-Disposition header
    const safeName =
      vehicle.name
        .replace(/<[^>]+>/g, "")
        .replace(/[^\w\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .slice(0, 80) || "proposal";

    res.setHeader("Content-Type", doc.contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="proposal-${safeName}.pdf"`,
    );
    res.setHeader("Content-Length", doc.buffer.length);
    res.send(doc.buffer);
  } catch (err: unknown) {
    const statusCode = (err as any)?.statusCode;
    if (statusCode === 501) {
      res.status(501).json({ error: (err as Error).message });
      return;
    }
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ err: msg }, "proposal PDF error");
    res
      .status(500)
      .json({ error: "Failed to generate proposal PDF", detail: msg });
  }
});

// POST /admin/vehicles/:id/proposal — admin panel variant. Unlike the public
// route above, this allows generating proposals for hidden (unpublished)
// vehicles and accepts per-proposal overrides via the request body.
router.post(
  "/admin/vehicles/:id/proposal",
  adminAuth,
  pdfLimiter,
  async (req, res) => {
    try {
      const id = parseInt(String(req.params.id), 10);
      if (isNaN(id)) {
        res.status(400).json({ error: "Invalid ID" });
        return;
      }

      const [vehicle] = await db
        .select()
        .from(vehiclesTable)
        .where(eq(vehiclesTable.id, id));

      if (!vehicle) {
        res.status(404).json({ error: "Vehicle not found" });
        return;
      }

      const contentRows = await db
        .select({ key: siteContentTable.key, value: siteContentTable.value })
        .from(siteContentTable)
        .where(
          inArray(siteContentTable.key, [
            "phone_number",
            "whatsapp_number",
            "admin_email",
          ]),
        );

      const cms = Object.fromEntries(contentRows.map((r) => [r.key, r.value]));

      // Per-proposal contact overrides fall back to the CMS defaults for any
      // field left blank.
      const override = (req.body?.contact ?? {}) as Record<string, unknown>;
      const overrideStr = (v: unknown) =>
        typeof v === "string" && v.trim() ? v.trim() : undefined;

      const contact = {
        phone: overrideStr(override.phone) || cms["phone_number"] || undefined,
        whatsapp:
          overrideStr(override.whatsapp) || cms["whatsapp_number"] || undefined,
        email: overrideStr(override.email) || cms["admin_email"] || undefined,
        website: overrideStr(override.website) || "www.transyachtgroup.com",
      };

      const lang = req.body?.lang === "ru" ? "russian" : "english";
      const template = normalizeTemplate(req.body?.template);
      const rentalDates = parseRentalDates(req.body);
      const transferDetails = parseTransferDetails(req.body);
      const pricingMode = req.body?.pricingMode;
      if (pricingMode === "transfer" && !transferDetails) {
        res.status(400).json({
          error:
            "Transfer proposal requires from, to, date, time, passengers and price",
        });
        return;
      }
      const whiteLabel = req.body?.whiteLabel === true;

      const images = Array.isArray(vehicle.images)
        ? (vehicle.images as string[])
        : [];

      const doc = await withDeadline(
        generateDocument(
          {
            documentType: "proposal",
            format: "pdf",
            template,
            yachtProfile: {
              ...vehicle,
              photo_urls: images,
            } as any,
            exportSettings: {
              engine: "adaptive",
              language: lang as any,
              template,
            },
          },
          contact,
          { rentalDates, transferDetails, whiteLabel },
        ),
        120_000,
      );

      const safeName =
        vehicle.name
          .replace(/<[^>]+>/g, "")
          .replace(/[^\w\s-]/g, "")
          .trim()
          .replace(/\s+/g, "-")
          .slice(0, 80) || "proposal";
      const documentLabel = transferDetails ? "transfer-offer" : "proposal";

      res.setHeader("Content-Type", doc.contentType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${documentLabel}-${safeName}.pdf"`,
      );
      res.setHeader("Content-Length", doc.buffer.length);
      res.send(doc.buffer);
    } catch (err: unknown) {
      const statusCode = (err as any)?.statusCode;
      if (statusCode === 501) {
        res.status(501).json({ error: (err as Error).message });
        return;
      }
      const msg = err instanceof Error ? err.message : String(err);
      logger.error({ err: msg }, "admin proposal PDF error");
      res
        .status(500)
        .json({ error: "Failed to generate proposal PDF", detail: msg });
    }
  },
);

// POST /admin/proposals/fleet-offer — multi-vehicle price list PDF. Unlike
// the single-vehicle proposal routes above, this fetches a batch of vehicles
// by ID and renders one compact row per vehicle rather than a full spec/gallery
// spread, so it bypasses generateDocument() (shaped around a single vehicle)
// and calls the fleet-offer builder + renderPdf() directly.
router.post(
  "/admin/proposals/fleet-offer",
  adminAuth,
  pdfLimiter,
  async (req, res) => {
    try {
      const rawIds = Array.isArray(req.body?.vehicleIds)
        ? req.body.vehicleIds
        : [];
      const vehicleIds: number[] = rawIds
        .map((v: unknown) => Number(v))
        .filter((n: number) => Number.isFinite(n));

      if (vehicleIds.length === 0) {
        res.status(400).json({ error: "Select at least one vehicle" });
        return;
      }

      const dr = (req.body?.dateRange ?? {}) as Record<string, unknown>;
      const start = typeof dr.start === "string" ? dr.start : "";
      const end = typeof dr.end === "string" ? dr.end : "";
      const days = Number(dr.days);
      if (!start || !end || !Number.isFinite(days) || days <= 0) {
        res.status(400).json({ error: "A valid date range is required" });
        return;
      }
      const pickupTime = parseTime(dr.pickupTime);
      const returnTime = parseTime(dr.returnTime);

      const deliveryLocation =
        typeof req.body?.deliveryLocation === "string"
          ? req.body.deliveryLocation.trim()
          : "";
      const collectionLocation =
        typeof req.body?.collectionLocation === "string"
          ? req.body.collectionLocation.trim()
          : "";
      const validity =
        typeof req.body?.validity === "string" && req.body.validity.trim()
          ? req.body.validity.trim()
          : "24 hours";
      const whiteLabel = req.body?.whiteLabel === true;

      const rows = await db
        .select()
        .from(vehiclesTable)
        .where(inArray(vehiclesTable.id, vehicleIds));
      if (rows.length === 0) {
        res.status(404).json({ error: "No matching vehicles found" });
        return;
      }

      // Preserve the admin's selection order rather than the DB's natural order.
      const byId = new Map(rows.map((v) => [v.id, v]));
      const orderedVehicles = vehicleIds
        .map((id) => byId.get(id))
        .filter((v): v is (typeof rows)[number] => !!v);

      const contentRows = await db
        .select({ key: siteContentTable.key, value: siteContentTable.value })
        .from(siteContentTable)
        .where(
          inArray(siteContentTable.key, [
            "phone_number",
            "whatsapp_number",
            "admin_email",
          ]),
        );
      const cms = Object.fromEntries(contentRows.map((r) => [r.key, r.value]));
      const contact = {
        phone: cms["phone_number"] || undefined,
        whatsapp: cms["whatsapp_number"] || undefined,
        email: cms["admin_email"] || undefined,
        website: "www.transyachtgroup.com",
      };

      // Up to 3 validated photos per vehicle — probe at most 5 candidates each
      // so this stays bounded when many vehicles are selected at once.
      const vehiclesWithPhotos: FleetOfferVehicle[] = await Promise.all(
        orderedVehicles.map(async (v) => {
          const candidates = Array.isArray(v.images)
            ? (v.images as string[]).slice(0, 5)
            : [];
          const { valid } = candidates.length
            ? await validateImageUrls(candidates)
            : { valid: [] as string[] };
          return {
            id: v.id,
            name: v.name,
            category: v.category,
            specs: (v.specs as Record<string, string>) || {},
            photos: valid.slice(0, 3),
          };
        }),
      );

      const html = renderFleetOfferHtml({
        vehicles: vehiclesWithPhotos,
        dateRange: { start, end, days, pickupTime, returnTime },
        deliveryLocation: deliveryLocation || undefined,
        collectionLocation: collectionLocation || undefined,
        validity,
        contact,
        whiteLabel,
      });

      // Fleet Offer owns an exact A4 layout. Other document types retain the
      // renderer's historical 95% scale through the default renderPdf options.
      const buffer = await withDeadline(renderPdf(html, { scale: 1 }), 120_000);

      res.setHeader("Content-Type", PDF_CONTENT_TYPE);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="fleet-offer-${start}-to-${end}.pdf"`,
      );
      res.setHeader("Content-Length", buffer.length);
      res.send(buffer);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error({ err: msg }, "fleet offer PDF error");
      res
        .status(500)
        .json({ error: "Failed to generate fleet offer PDF", detail: msg });
    }
  },
);

router.post(
  "/admin/proposals/business-letter",
  adminAuth,
  pdfLimiter,
  async (req, res) => {
    try {
      const value = req.body && typeof req.body === "object" ? req.body as Record<string, unknown> : {};
      const text = (key: string, max: number) => typeof value[key] === "string" ? value[key].trim().slice(0, max) : "";
      const language = Object.keys(languageNames).includes(text("language", 8))
        ? text("language", 8) as keyof typeof languageNames
        : "en";
      const recipientType = text("recipientType", 120) || "Concierge service";
      const topic = text("topic", 180);
      const service = text("service", 180) || "Luxury car rental and VIP transfers";
      const notes = text("notes", 2_000);
      const imageUrl = text("imageUrl", 2_000) || null;
      const contactName = text("contactName", 120) || "Trans Yacht Group";

      if (!topic) {
        res.status(400).json({ error: "Topic is required" });
        return;
      }

      const raw = await requestOpenAiJson(
        `You are a luxury hospitality copywriter for Trans Yacht Group.
Return only valid JSON. Write a polished one-page B2B presentation letter, not a blog article.
The tone must be premium, concise, specific, partnership-oriented and suitable for hotels, concierges, yacht brokers, villas and event agencies.
Avoid exaggerated guarantees. Do not invent exact prices, legal claims or unavailable services.`,
        `Language: ${languageNames[language]}
Recipient type: ${recipientType}
Topic: ${topic}
Service to promote: ${service}
Notes: ${notes || "No additional notes."}
Contact/signature name: ${contactName}
Return JSON with:
{
 "headline": "...",
 "subheadline": "...",
 "greeting": "...",
 "opening": "...",
 "valueProposition": "...",
 "benefits": ["...", "...", "...", "..."],
 "partnerAngle": "...",
 "callToAction": "...",
 "signature": "..."
}`,
      );
      const copy = cleanBusinessLetter(raw);

      const contentRows = await db
        .select({ key: siteContentTable.key, value: siteContentTable.value })
        .from(siteContentTable)
        .where(
          inArray(siteContentTable.key, [
            "phone_number",
            "whatsapp_number",
            "admin_email",
          ]),
        );
      const cms = Object.fromEntries(contentRows.map((r) => [r.key, r.value]));
      const contact = {
        phone: cms["phone_number"] || undefined,
        whatsapp: cms["whatsapp_number"] || undefined,
        email: cms["admin_email"] || undefined,
        website: "www.transyachtgroup.com",
      };

      const html = renderBusinessLetterHtml({
        copy,
        language,
        imageUrl,
        topic,
        service,
        recipientType,
        contact,
      });
      const buffer = await withDeadline(renderPdf(html, { scale: 1 }), 120_000);
      const safeTopic =
        topic
          .replace(/<[^>]+>/g, "")
          .replace(/[^\w\s-]/g, "")
          .trim()
          .replace(/\s+/g, "-")
          .slice(0, 80) || "business-letter";
      res.setHeader("Content-Type", PDF_CONTENT_TYPE);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="business-letter-${safeTopic}.pdf"`,
      );
      res.setHeader("Content-Length", buffer.length);
      res.send(buffer);
    } catch (err: unknown) {
      const code = err instanceof Error ? err.message : "";
      logger.error({ err: code || String(err) }, "business letter PDF error");
      const error = code === "OPENAI_NOT_CONFIGURED" ? "OpenAI is not configured on the server"
        : code.startsWith("OPENAI_401") ? "OpenAI rejected the API key"
          : code.startsWith("OPENAI_429") ? "OpenAI quota or billing limit reached"
            : code.startsWith("OPENAI_403") ? "This OpenAI account does not have access to the configured model"
              : "Failed to generate business letter PDF";
      res.status(code === "OPENAI_NOT_CONFIGURED" ? 503 : 500).json({ error });
    }
  },
);

export default router;
