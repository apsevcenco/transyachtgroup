import { Router, type IRouter } from "express";
import rateLimit from "express-rate-limit";
import { db } from "@workspace/db";
import { contractsTable, vehiclesTable, bookingsTable } from "@workspace/db/schema";
import { eq, like } from "drizzle-orm";
import { adminAuth } from "../middleware/auth";
import { renderContractHtml, type ContractInput } from "../documents/builders/contract";
import { renderPdf } from "../documents/pdf/generatePdf";
import { stripHtml } from "../documents/builders/proposal";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// PDF generation is CPU-intensive — same tighter per-IP budget as the
// proposal/fleet-offer PDF routes.
const contractLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function numOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

interface ParsedContractRequest {
  bookingId: number | null;
  vehicleId: number;
  renterName: string;
  renterDob: string;
  renterPob: string;
  renterNationality: string;
  renterPassport: string;
  renterPassportExpiry: string;
  renterLicence: string;
  renterLicenceExpiry: string;
  renterLicenceIssuedBy: string;
  renterPhone: string;
  pickupDate: string;
  returnDate: string;
  pickupLocation: string;
  returnLocation: string;
  totalAmount: number;
  depositAmount: number;
  kmPerDay: number;
  extraKmPrice: number;
  contractNumber: string;
  representativeName: string;
}

// No zod here on purpose — matches the manual-validator convention already
// used for admin-only request bodies in routes/proposals.ts
// (parseRentalDates/parseTransferDetails) rather than pulling zod into
// api-server just for one route; the DB-bound insertContractSchema still
// backstops this at the insert layer.
function parseContractRequest(body: unknown): { data: ParsedContractRequest } | { error: string } {
  const b = (body ?? {}) as Record<string, unknown>;

  const vehicleId = Number(b.vehicleId);
  if (!Number.isFinite(vehicleId)) return { error: "vehicleId is required" };

  const renterName = str(b.renterName);
  if (!renterName) return { error: "renterName is required" };

  const pickupDate = str(b.pickupDate);
  const returnDate = str(b.returnDate);
  if (!pickupDate || !returnDate) return { error: "pickupDate and returnDate are required" };
  if (returnDate < pickupDate) return { error: "returnDate must not be before pickupDate" };

  const pickupLocation = str(b.pickupLocation);
  const returnLocation = str(b.returnLocation);
  if (!pickupLocation || !returnLocation) return { error: "pickupLocation and returnLocation are required" };

  const totalAmount = numOrNull(b.totalAmount);
  const depositAmount = numOrNull(b.depositAmount);
  const kmPerDay = numOrNull(b.kmPerDay);
  const extraKmPrice = numOrNull(b.extraKmPrice);
  if (totalAmount == null || totalAmount < 0) return { error: "totalAmount must be a non-negative number" };
  if (depositAmount == null || depositAmount < 0) return { error: "depositAmount must be a non-negative number" };
  if (kmPerDay == null || kmPerDay < 0) return { error: "kmPerDay must be a non-negative number" };
  if (extraKmPrice == null || extraKmPrice < 0) return { error: "extraKmPrice must be a non-negative number" };

  const representativeName = str(b.representativeName);
  if (!representativeName) return { error: "representativeName is required" };

  const bookingIdNum = Number(b.bookingId);
  const bookingId = b.bookingId != null && b.bookingId !== "" && Number.isFinite(bookingIdNum) ? bookingIdNum : null;

  return {
    data: {
      bookingId,
      vehicleId,
      renterName,
      renterDob: str(b.renterDob),
      renterPob: str(b.renterPob),
      renterNationality: str(b.renterNationality),
      renterPassport: str(b.renterPassport),
      renterPassportExpiry: str(b.renterPassportExpiry),
      renterLicence: str(b.renterLicence),
      renterLicenceExpiry: str(b.renterLicenceExpiry),
      renterLicenceIssuedBy: str(b.renterLicenceIssuedBy),
      renterPhone: str(b.renterPhone),
      pickupDate,
      returnDate,
      pickupLocation,
      returnLocation,
      totalAmount,
      depositAmount,
      kmPerDay,
      extraKmPrice,
      contractNumber: str(b.contractNumber),
      representativeName,
    },
  };
}

/** "DDMMYY" in server-local time — the date component of TYG-DDMMYY-XXX. */
function todayDateKey(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}${mm}${yy}`;
}

/** Next sequential TYG-DDMMYY-XXX for today, based on the highest existing suffix. */
async function nextContractNumber(dateKey: string): Promise<string> {
  const prefix = `TYG-${dateKey}-`;
  const rows = await db
    .select({ contractNumber: contractsTable.contractNumber })
    .from(contractsTable)
    .where(like(contractsTable.contractNumber, `${prefix}%`));
  let maxSeq = 0;
  for (const r of rows) {
    const m = r.contractNumber.match(/-(\d{3})$/);
    if (m) maxSeq = Math.max(maxSeq, parseInt(m[1], 10));
  }
  return `${prefix}${String(maxSeq + 1).padStart(3, "0")}`;
}

function isUniqueViolation(err: unknown): boolean {
  return !!err && typeof err === "object" && (err as { code?: string }).code === "23505";
}

router.post("/admin/contracts/generate", adminAuth, contractLimiter, async (req, res) => {
  try {
    const parsed = parseContractRequest(req.body);
    if ("error" in parsed) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    const data = parsed.data;

    const [vehicle] = await db.select().from(vehiclesTable).where(eq(vehiclesTable.id, data.vehicleId));
    if (!vehicle) {
      res.status(404).json({ error: "Vehicle not found" });
      return;
    }

    if (data.bookingId != null) {
      const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, data.bookingId));
      if (!booking) {
        res.status(404).json({ error: "Booking not found" });
        return;
      }
    }

    // Explicit contractNumber (rare — manual override) skips auto-numbering
    // and relies on the DB unique constraint to reject a duplicate outright.
    // Otherwise generate-then-insert, retrying on a rare race against another
    // concurrent admin generating a contract the same second.
    const explicitNumber = data.contractNumber || null;
    const dateKey = todayDateKey();

    let inserted: typeof contractsTable.$inferSelect | null = null;
    let lastErr: unknown = null;
    for (let attempt = 0; attempt < 5 && !inserted; attempt++) {
      const contractNumber = explicitNumber ?? (await nextContractNumber(dateKey));
      try {
        const [row] = await db
          .insert(contractsTable)
          .values({
            contractNumber,
            bookingId: data.bookingId,
            vehicleId: data.vehicleId,
            renterName: data.renterName,
            renterDob: data.renterDob || null,
            renterPob: data.renterPob || null,
            renterNationality: data.renterNationality || null,
            renterPassport: data.renterPassport || null,
            renterPassportExpiry: data.renterPassportExpiry || null,
            renterLicence: data.renterLicence || null,
            renterLicenceExpiry: data.renterLicenceExpiry || null,
            renterLicenceIssuedBy: data.renterLicenceIssuedBy || null,
            renterPhone: data.renterPhone || null,
            pickupDate: data.pickupDate,
            returnDate: data.returnDate,
            pickupLocation: data.pickupLocation,
            returnLocation: data.returnLocation,
            totalAmount: data.totalAmount,
            depositAmount: data.depositAmount,
            kmPerDay: data.kmPerDay,
            extraKmPrice: data.extraKmPrice,
            representativeName: data.representativeName,
          })
          .returning();
        inserted = row;
      } catch (err) {
        lastErr = err;
        if (isUniqueViolation(err)) {
          if (explicitNumber) {
            res.status(409).json({ error: `Contract number ${explicitNumber} already exists` });
            return;
          }
          continue; // regenerate a fresh sequence number and retry
        }
        throw err;
      }
    }

    if (!inserted) {
      throw lastErr instanceof Error ? lastErr : new Error("Failed to generate a unique contract number");
    }

    const specs = (vehicle.specs as Record<string, string>) || {};
    const vehicleName = stripHtml(vehicle.name);

    const contractInput: ContractInput = {
      contractNumber: inserted.contractNumber,
      dateOfIssue: inserted.createdAt ? new Date(inserted.createdAt).toISOString().slice(0, 10) : undefined,
      renter: {
        name: data.renterName,
        dob: data.renterDob,
        pob: data.renterPob,
        nationality: data.renterNationality,
        passport: data.renterPassport,
        passportExpiry: data.renterPassportExpiry,
        licence: data.renterLicence,
        licenceExpiry: data.renterLicenceExpiry,
        licenceIssuedBy: data.renterLicenceIssuedBy,
        phone: data.renterPhone,
      },
      vehicle: {
        name: vehicle.name,
        category: specs.bodyType,
        plate: specs.registrationPlate || vehicleName,
        vin: specs.vin,
        fuelType: specs.fuelType,
        transmission: specs.transmission,
        colour: specs.colour,
      },
      pickupDate: data.pickupDate,
      returnDate: data.returnDate,
      pickupLocation: data.pickupLocation,
      returnLocation: data.returnLocation,
      totalAmount: data.totalAmount,
      depositAmount: data.depositAmount,
      kmPerDay: data.kmPerDay,
      extraKmPrice: data.extraKmPrice,
      representativeName: data.representativeName,
    };

    const html = renderContractHtml(contractInput);
    const buffer = await renderPdf(html);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="contract-${inserted.contractNumber}.pdf"`);
    res.setHeader("Content-Length", buffer.length);
    res.setHeader("X-Contract-Number", inserted.contractNumber);
    res.send(buffer);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ err: msg }, "contract PDF error");
    res.status(500).json({ error: "Failed to generate contract PDF", detail: msg });
  }
});

export default router;
