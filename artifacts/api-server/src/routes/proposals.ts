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

export default router;
