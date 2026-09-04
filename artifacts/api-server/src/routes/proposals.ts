import { Router, type IRouter } from "express";
import rateLimit from "express-rate-limit";
import { db } from "@workspace/db";
import { vehiclesTable, siteContentTable, businessLettersTable } from "@workspace/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import { generateDocument } from "../documents/generateDocument";
import { LOGO_DATA_URI } from "../documents/builders/proposal";
import type {
  RentalDates,
  TransferDetails,
} from "../documents/builders/proposal";
import {
  renderFleetOfferHtml,
  type FleetOfferVehicle,
} from "../documents/builders/fleetOffer";
import { GOLD, GOLD_INK, HAIRLINE, NEAR_BLACK } from "../documents/core/theme";
import { FONT_FACE_CSS } from "../documents/core/fonts.generated";
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

type BusinessLetterRecordInput = {
  title: string;
  recipientType: string;
  recipientName: string;
  language: keyof typeof languageNames;
  topic: string;
  service: string;
  notes: string;
  imageUrl: string | null;
  signerName: string;
  signerRole: string;
  copy: BusinessLetterCopy;
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

function parseBusinessLetterInput(value: Record<string, unknown>): BusinessLetterRecordInput {
  const text = (key: string, max: number) => typeof value[key] === "string" ? value[key].trim().slice(0, max) : "";
  const language = Object.keys(languageNames).includes(text("language", 8))
    ? text("language", 8) as keyof typeof languageNames
    : "en";
  const topic = text("topic", 180) || "Luxury partnership proposal";
  return {
    title: text("title", 180) || topic,
    recipientType: text("recipientType", 120) || "Concierge service",
    recipientName: text("recipientName", 500),
    language,
    topic,
    service: text("service", 180) || "Luxury car rental and VIP transfers",
    notes: text("notes", 2_000),
    imageUrl: text("imageUrl", 2_000) || null,
    signerName: text("contactName", 120),
    signerRole: text("signerRole", 140),
    copy: cleanBusinessLetter(value.copy),
  };
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function emailHtmlForBusinessLetter(copy: BusinessLetterCopy, pdfUrl?: string) {
  const benefits = copy.benefits.map((benefit) => `<li>${escapeHtml(benefit)}</li>`).join("");
  const pdfLink = pdfUrl ? `<p><a href="${escapeHtml(pdfUrl)}" style="color:#8a6d32;text-decoration:underline;font-weight:bold">Download presentation PDF</a></p>` : "";
  return `<div style="font-family:Arial,sans-serif;color:#171717;line-height:1.6;max-width:680px">
    <h1 style="font-size:22px;line-height:1.25;margin:0 0 16px">${escapeHtml(copy.headline)}</h1>
    <p style="color:#9a7a35;font-size:16px">${escapeHtml(copy.subheadline)}</p>
    <p>${escapeHtml(copy.greeting)}</p>
    <p>${escapeHtml(copy.opening)}</p>
    <p>${escapeHtml(copy.valueProposition)}</p>
    <ul>${benefits}</ul>
    <p>${escapeHtml(copy.partnerAngle)}</p>
    <p><strong>${escapeHtml(copy.callToAction)}</strong></p>
    <p>Warm regards,<br/>${escapeHtml(copy.signature).replace(/\r?\n/g, "<br/>")}</p>
    ${pdfLink}
  </div>`;
}

function emailHtmlForCoverMessage(message: string) {
  return `<div style="font-family:Arial,sans-serif;color:#171717;line-height:1.6;max-width:680px">
    ${escapeHtml(message).replace(/\r?\n/g, "<br/>")}
  </div>`;
}

function safePdfFilename(value: string) {
  const safe = value
    .replace(/<[^>]+>/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return `${safe || "business-letter"}.pdf`;
}

async function sendBusinessLetterEmail(input: {
  to: string[];
  subject: string;
  copy: BusinessLetterCopy;
  coverMessage?: string;
  attachment?: { filename: string; content: string };
}) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.REVIEW_EMAIL_FROM || process.env.PROPOSAL_EMAIL_FROM;
  if (!key || !from) throw new Error("Email delivery is not configured (RESEND_API_KEY / REVIEW_EMAIL_FROM)");
  const bodyText = input.coverMessage?.trim()
    ? input.coverMessage.trim()
    : [
      input.copy.headline,
      input.copy.subheadline,
      input.copy.greeting,
      input.copy.opening,
      input.copy.valueProposition,
      ...input.copy.benefits,
      input.copy.partnerAngle,
      input.copy.callToAction,
      "Warm regards,",
      input.copy.signature,
    ].join("\n\n");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: input.subject,
      text: bodyText,
      html: input.coverMessage?.trim()
        ? emailHtmlForCoverMessage(input.coverMessage.trim())
        : emailHtmlForBusinessLetter(input.copy),
      attachments: input.attachment ? [input.attachment] : undefined,
      tags: [{ name: "workflow", value: "business-letter" }],
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Email provider rejected request (${response.status})`);
}

function renderBusinessLetterHtml(input: {
  copy: BusinessLetterCopy;
  language: keyof typeof languageNames;
  imageUrl?: string | null;
  topic: string;
  service: string;
  recipientType: string;
  recipientName?: string;
  signerRole?: string;
  contact: { phone?: string; whatsapp?: string; email?: string; website?: string };
}) {
  const dir = input.language === "ar" ? "rtl" : "ltr";
  const c = input.copy;
  const benefits = c.benefits.map((benefit) => `<li>${escapeHtml(benefit)}</li>`).join("");
  const currentDate = new Intl.DateTimeFormat(input.language === "en" ? "en-GB" : input.language, { dateStyle: "long" }).format(new Date());
  const greeting = c.greeting;
  const formatLines = (value: string) => escapeHtml(value).replace(/\r?\n/g, "<br/>");
  const recipientBlock = input.recipientName?.trim();
  const headlineSize = c.headline.length > 115 ? 15 : c.headline.length > 80 ? 17 : 20;
  const cleanContact = (value?: string) =>
    (value || "")
      .replace(/<\/?[^>]+>/g, " ")
      .replace(/\b(phone|tel|telephone|whatsapp|email|mail|site|website)\s*:\s*/gi, "")
      .replace(/^mailto:/i, "")
      .replace(/^tel:/i, "")
      .trim();
  const footerItems = [
    ["Phone", cleanContact(input.contact.phone)],
    ["WhatsApp", cleanContact(input.contact.whatsapp)],
    ["Email", cleanContact(input.contact.email)],
    ["Web", cleanContact(input.contact.website || "www.transyachtgroup.com")],
  ].filter(([, value]) => Boolean(value));
  const image = input.imageUrl
    ? `<div class="photo"><img src="${escapeHtml(input.imageUrl)}" alt="Luxury service" /></div>`
    : `<div class="photo placeholder">TRANSYACHTGROUP</div>`;
  const logo = LOGO_DATA_URI ? `<img class="logo" src="${LOGO_DATA_URI}" alt="Trans Yacht Group" />` : `<div class="brand-name">TRANSYACHTGROUP</div>`;
  return `<!doctype html>
<html lang="${input.language}" dir="${dir}">
<head>
  <meta charset="utf-8" />
  <style>
    ${FONT_FACE_CSS}
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: 'Wix MadeFor Display', Arial, sans-serif; color: ${NEAR_BLACK}; background: #fff; }
    .page { width: 210mm; height: 297mm; padding: 15mm 18mm 26mm; background: #fff; position: relative; overflow: hidden; }
    .page:before { content: ""; position: absolute; inset: 10mm; border: 1px solid ${HAIRLINE}; pointer-events: none; }
    .brand { display: flex; justify-content: space-between; align-items: flex-start; gap: 18px; position: relative; z-index: 1; }
    .logo { height: 11mm; width: auto; object-fit: contain; display: block; }
    .brand-name { font-family: 'Porter FT', Arial, sans-serif; letter-spacing: .22em; font-size: 15px; color: ${NEAR_BLACK}; }
    .address { min-width: 48mm; max-width: 74mm; text-align: ${dir === "rtl" ? "left" : "right"}; color: #5d5548; }
    .address-block { font-family: 'Porter FT', Arial, sans-serif; font-size: 9px; line-height: 1.45; letter-spacing: .09em; text-transform: uppercase; color: ${NEAR_BLACK}; overflow-wrap: anywhere; }
    .date { margin-top: 2.5mm; font-size: 9px; letter-spacing: .12em; text-transform: uppercase; color: #777; }
    .hero { display: grid; grid-template-columns: 75mm 1fr; gap: 11mm; margin-top: 10mm; align-items: stretch; position: relative; z-index: 1; direction: ltr; }
    .photo { height: 88mm; overflow: hidden; background: transparent; display: flex; align-items: center; justify-content: center; color: ${GOLD_INK}; font-family: 'Porter FT', Arial, sans-serif; letter-spacing: .18em; text-align: center; padding: 0; }
    .photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .headline { direction: ${dir}; display: flex; flex-direction: column; justify-content: center; min-width: 0; }
    h1 { font-family: 'Porter FT', Arial, sans-serif; font-size: ${headlineSize}px; line-height: 1.22; margin: 0 0 6mm; font-weight: 400; letter-spacing: .02em; color: ${NEAR_BLACK}; text-transform: uppercase; text-align: center; overflow-wrap: anywhere; hyphens: auto; }
    .sub { font-family: 'Antro Vectra', 'Wix MadeFor Display', Arial, sans-serif; color: ${GOLD_INK}; font-size: 13px; line-height: 1.35; margin-bottom: 7mm; text-align: center; }
    .content { margin-top: 8mm; display: grid; grid-template-columns: 1fr 66mm; gap: 9mm; position: relative; z-index: 1; direction: ${dir}; }
    p { margin: 0 0 3.2mm; font-size: 10.3px; line-height: 1.48; color: #2b2924; }
    .greeting { font-family: 'Antro Vectra', 'Wix MadeFor Display', Arial, sans-serif; font-size: 15px; color: ${NEAR_BLACK}; margin-bottom: 3.6mm; font-weight: 400; }
    .panel { border-left: ${dir === "rtl" ? "0" : "1px"} solid ${HAIRLINE}; border-right: ${dir === "rtl" ? "1px" : "0"} solid ${HAIRLINE}; padding-${dir === "rtl" ? "right" : "left"}: 7mm; }
    .panel h2 { margin: 0 0 4mm; font-family: 'Porter FT', Arial, sans-serif; font-size: 9px; text-transform: uppercase; letter-spacing: .18em; color: ${GOLD_INK}; font-weight: 400; }
    ul { margin: 0; padding-${dir === "rtl" ? "right" : "left"}: 5mm; }
    li { margin-bottom: 3.2mm; font-size: 10.5px; line-height: 1.42; color: #2b2924; }
    .closing { margin-top: 4.5mm; margin-bottom: 4mm; }
    .regards { font-family: 'Wix MadeFor Display', Arial, sans-serif; font-size: 10.4px; font-weight: 700; color: ${NEAR_BLACK}; margin-bottom: 1.8mm; }
    .signature { font-family: 'Antro Vectra', 'Wix MadeFor Display', Arial, sans-serif; font-size: 17px; line-height: 1.2; color: ${NEAR_BLACK}; white-space: pre-line; }
    .signer-role { margin-top: 1.4mm; font-family: 'Wix MadeFor Display', Arial, sans-serif; font-size: 10.2px; font-weight: 700; color: ${NEAR_BLACK}; }
    .cta { margin-top: 0; padding-top: 3.5mm; border-top: 1px solid ${GOLD}; color: ${NEAR_BLACK}; font-size: 10.3px; line-height: 1.45; font-weight: 600; }
    .footer { position: absolute; left: 18mm; right: 18mm; bottom: 8mm; display: flex; justify-content: center; flex-wrap: wrap; gap: 4mm 7mm; border-top: 1px solid ${HAIRLINE}; padding-top: 3mm; font-size: 8.8px; color: #5d5548; z-index: 1; direction: ltr; }
  </style>
</head>
<body>
  <main class="page">
    <section class="brand">
      <div>${logo}</div>
      <div class="address">
        ${recipientBlock ? `<div class="address-block">${formatLines(recipientBlock)}</div>` : ""}
        <div class="date">${escapeHtml(currentDate)}</div>
      </div>
    </section>
    <section class="hero">${image}<div class="headline"><h1>${escapeHtml(c.headline)}</h1><div class="sub">${escapeHtml(c.subheadline)}</div></div></section>
    <section class="content">
      <div>
        <div class="greeting">${escapeHtml(greeting)}</div>
        <p>${escapeHtml(c.opening)}</p>
        <p>${escapeHtml(c.valueProposition)}</p>
        <p>${escapeHtml(c.partnerAngle)}</p>
        <div class="closing">
          <div class="regards">Warm regards,</div>
          <div class="signature">${formatLines(c.signature)}</div>
          ${input.signerRole?.trim() ? `<div class="signer-role">${escapeHtml(input.signerRole)}</div>` : ""}
        </div>
        <div class="cta">${escapeHtml(c.callToAction)}</div>
      </div>
      <aside class="panel"><h2>Key advantages</h2><ul>${benefits}</ul></aside>
    </section>
    <footer class="footer">
      ${footerItems.map(([label, value]) => `<span><strong>${escapeHtml(label)}</strong> ${escapeHtml(value)}</span>`).join("")}
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

router.get("/admin/proposals/business-letters", adminAuth, async (_req, res) => {
  try {
    const letters = await db
      .select()
      .from(businessLettersTable)
      .orderBy(desc(businessLettersTable.updatedAt))
      .limit(100);
    res.json(letters);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ err: msg }, "business letters list error");
    res.status(500).json({ error: "Failed to load saved business letters" });
  }
});

router.post("/admin/proposals/business-letters", adminAuth, async (req, res) => {
  try {
    const value = req.body && typeof req.body === "object" ? req.body as Record<string, unknown> : {};
    const parsed = parseBusinessLetterInput(value);
    const [letter] = await db
      .insert(businessLettersTable)
      .values({
        title: parsed.title,
        recipientType: parsed.recipientType,
        recipientName: parsed.recipientName || null,
        language: parsed.language,
        topic: parsed.topic,
        service: parsed.service,
        notes: parsed.notes || null,
        imageUrl: parsed.imageUrl,
        signerName: parsed.signerName || null,
        signerRole: parsed.signerRole || null,
        copy: parsed.copy,
        updatedAt: new Date(),
      })
      .returning();
    res.json(letter);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ err: msg }, "business letter save error");
    res.status(500).json({ error: msg === "INVALID_AI_RESPONSE" ? "Letter text is incomplete" : "Failed to save business letter" });
  }
});

router.put("/admin/proposals/business-letters/:id", adminAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Invalid letter id" });
      return;
    }
    const value = req.body && typeof req.body === "object" ? req.body as Record<string, unknown> : {};
    const parsed = parseBusinessLetterInput(value);
    const [letter] = await db
      .update(businessLettersTable)
      .set({
        title: parsed.title,
        recipientType: parsed.recipientType,
        recipientName: parsed.recipientName || null,
        language: parsed.language,
        topic: parsed.topic,
        service: parsed.service,
        notes: parsed.notes || null,
        imageUrl: parsed.imageUrl,
        signerName: parsed.signerName || null,
        signerRole: parsed.signerRole || null,
        copy: parsed.copy,
        updatedAt: new Date(),
      })
      .where(eq(businessLettersTable.id, id))
      .returning();
    if (!letter) {
      res.status(404).json({ error: "Business letter not found" });
      return;
    }
    res.json(letter);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ err: msg }, "business letter update error");
    res.status(500).json({ error: msg === "INVALID_AI_RESPONSE" ? "Letter text is incomplete" : "Failed to update business letter" });
  }
});

router.delete("/admin/proposals/business-letters/:id", adminAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Invalid letter id" });
      return;
    }
    await db.delete(businessLettersTable).where(eq(businessLettersTable.id, id));
    res.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ err: msg }, "business letter delete error");
    res.status(500).json({ error: "Failed to delete business letter" });
  }
});

router.post("/admin/proposals/business-letters/:id/send", adminAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "Invalid letter id" });
      return;
    }
    const value = req.body && typeof req.body === "object" ? req.body as Record<string, unknown> : {};
    const text = (key: string, max: number) => typeof value[key] === "string" ? value[key].trim().slice(0, max) : "";
    const rawRecipients = typeof value.recipients === "string" ? value.recipients : "";
    const recipients = Array.from(new Set(rawRecipients.split(/[\s,;]+/).map((v) => v.trim()).filter(validEmail))).slice(0, 50);
    if (recipients.length === 0) {
      res.status(400).json({ error: "Add at least one valid email address" });
      return;
    }
    const [letter] = await db.select().from(businessLettersTable).where(eq(businessLettersTable.id, id)).limit(1);
    if (!letter) {
      res.status(404).json({ error: "Business letter not found" });
      return;
    }
    const copy = cleanBusinessLetter(letter.copy);
    const subject = text("subject", 180) || letter.title || copy.headline;
    const coverMessage = text("coverMessage", 4_000);
    const attachPdf = value.attachPdf === true;
    const sendMode = text("sendMode", 32);

    let attachment: { filename: string; content: string } | undefined;
    if (attachPdf || sendMode === "cover_with_pdf") {
      const contentRows = await db
        .select({ key: siteContentTable.key, value: siteContentTable.value })
        .from(siteContentTable)
        .where(inArray(siteContentTable.key, ["phone_number", "whatsapp_number", "admin_email"]));
      const cms = Object.fromEntries(contentRows.map((r) => [r.key, r.value]));
      const pdfHtml = renderBusinessLetterHtml({
        copy,
        language: (letter.language as keyof typeof languageNames) || "en",
        imageUrl: letter.imageUrl,
        topic: letter.topic,
        service: letter.service,
        recipientType: letter.recipientType,
        recipientName: letter.recipientName || undefined,
        signerRole: letter.signerRole || undefined,
        contact: {
          phone: cms["phone_number"] || undefined,
          whatsapp: cms["whatsapp_number"] || undefined,
          email: cms["admin_email"] || undefined,
          website: "www.transyachtgroup.com",
        },
      });
      const pdfBuffer = await withDeadline(renderPdf(pdfHtml, { scale: 1 }), 120_000);
      attachment = {
        filename: safePdfFilename(letter.title || letter.topic || copy.headline),
        content: pdfBuffer.toString("base64"),
      };
    }

    await sendBusinessLetterEmail({
      to: recipients,
      subject,
      copy,
      coverMessage: coverMessage || undefined,
      attachment,
    });
    const [updated] = await db
      .update(businessLettersTable)
      .set({
        lastSentTo: recipients.join(", "),
        lastSentAt: new Date(),
        sendError: null,
        updatedAt: new Date(),
      })
      .where(eq(businessLettersTable.id, id))
      .returning();
    res.json(updated);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ err: msg }, "business letter send error");
    res.status(500).json({ error: msg || "Failed to send business letter" });
  }
});

router.post(
  "/admin/proposals/business-letter-draft",
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
      const recipientName = text("recipientName", 180);
      const topic = text("topic", 180);
      const service = text("service", 180) || "Luxury car rental and VIP transfers";
      const notes = text("notes", 2_000);
      const contactName = text("contactName", 120);

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
Addressed to: ${recipientName || "Use a neutral premium greeting."}
Topic: ${topic}
Service to promote: ${service}
Notes: ${notes || "No additional notes."}
Contact/signature name: ${contactName || "Leave the signature neutral; it can be edited manually before PDF export."}
If "Addressed to" is provided, use it as the greeting field instead of a generic greeting.
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
      res.json(copy);
    } catch (err: unknown) {
      const code = err instanceof Error ? err.message : "";
      logger.error({ err: code || String(err) }, "business letter draft error");
      const error = code === "OPENAI_NOT_CONFIGURED" ? "OpenAI is not configured on the server"
        : code.startsWith("OPENAI_401") ? "OpenAI rejected the API key"
          : code.startsWith("OPENAI_429") ? "OpenAI quota or billing limit reached"
            : code.startsWith("OPENAI_403") ? "This OpenAI account does not have access to the configured model"
              : "Failed to generate business letter draft";
      res.status(code === "OPENAI_NOT_CONFIGURED" ? 503 : 500).json({ error });
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
      const recipientName = text("recipientName", 180);
      const topic = text("topic", 180) || "Luxury partnership proposal";
      const service = text("service", 180) || "Luxury car rental and VIP transfers";
      const signerRole = text("signerRole", 140);
      const contactName = text("contactName", 120);
      const imageUrl = text("imageUrl", 2_000) || null;
      const copy = cleanBusinessLetter(value.copy);
      if (contactName) copy.signature = contactName;

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
        recipientName,
        signerRole,
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
