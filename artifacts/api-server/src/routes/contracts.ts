import { Router, type IRouter } from "express";
import rateLimit from "express-rate-limit";
import { db } from "@workspace/db";
import {
  contractsTable,
  vehiclesTable,
  bookingsTable,
} from "@workspace/db/schema";
import { desc, eq, like } from "drizzle-orm";
import { adminAuth } from "../middleware/auth";
import {
  renderContractHtml,
  type ContractInput,
} from "../documents/builders/contract";
import { renderPdf } from "../documents/pdf/generatePdf";
import { stripHtml } from "../documents/builders/proposal";
import { logger } from "../lib/logger";
import { createHash } from "node:crypto";

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
  requestId: string;
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
  renterEmail: string;
  pickupDate: string;
  returnDate: string;
  pickupLocation: string;
  returnLocation: string;
  totalAmount: number;
  depositAmount: number;
  kmPerDay: number;
  extraKmPrice: number;
  editContractNumber: string | null;
  representativeName: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const CONTRACT_NUMBER = /^[A-Z0-9][A-Z0-9-]{0,49}$/;
function isRealIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

function normalized(value: string): string {
  return stripHtml(value).replace(/\s+/g, " ").trim().toLocaleLowerCase("en");
}

function requireText(
  body: Record<string, unknown>,
  key: string,
  maxLength = 200,
): { value: string } | { error: string } {
  const value = str(body[key]);
  if (!value) return { error: `${key} is required` };
  if (value.length > maxLength)
    return { error: `${key} must be at most ${maxLength} characters` };
  return { value };
}

// No zod here on purpose — matches the manual-validator convention already
// used for admin-only request bodies in routes/proposals.ts
// (parseRentalDates/parseTransferDetails) rather than pulling zod into
// api-server just for one route; the DB-bound insertContractSchema still
// backstops this at the insert layer.
function parseContractRequest(
  body: unknown,
): { data: ParsedContractRequest } | { error: string } {
  const b = (body ?? {}) as Record<string, unknown>;

  const vehicleId = Number(b.vehicleId);
  if (!Number.isInteger(vehicleId) || vehicleId <= 0)
    return { error: "vehicleId must be a positive integer" };

  const requiredTextKeys = [
    "renterName",
    "renterPob",
    "renterNationality",
    "renterPassport",
    "renterLicence",
    "renterLicenceIssuedBy",
    "renterPhone",
    "renterEmail",
    "pickupLocation",
    "returnLocation",
    "representativeName",
  ] as const;
  const requiredText = {} as Record<(typeof requiredTextKeys)[number], string>;
  for (const key of requiredTextKeys) {
    const result = requireText(
      b,
      key,
      key === "pickupLocation" || key === "returnLocation" ? 300 : 200,
    );
    if ("error" in result) return result;
    requiredText[key] = result.value;
  }

  const renterDob = str(b.renterDob);
  const renterPassportExpiry = str(b.renterPassportExpiry);
  const renterLicenceExpiry = str(b.renterLicenceExpiry);
  const pickupDate = str(b.pickupDate);
  const returnDate = str(b.returnDate);
  for (const [key, value] of [
    ["renterDob", renterDob],
    ["renterPassportExpiry", renterPassportExpiry],
    ["renterLicenceExpiry", renterLicenceExpiry],
    ["pickupDate", pickupDate],
    ["returnDate", returnDate],
  ] as const) {
    if (!isRealIsoDate(value))
      return { error: `${key} must be a real date in YYYY-MM-DD format` };
  }
  if (returnDate < pickupDate)
    return { error: "returnDate must not be before pickupDate" };
  if (renterPassportExpiry < returnDate)
    return { error: "renterPassportExpiry must cover the rental period" };
  if (renterLicenceExpiry < returnDate)
    return { error: "renterLicenceExpiry must cover the rental period" };

  const totalAmount = numOrNull(b.totalAmount);
  const depositAmount = numOrNull(b.depositAmount);
  const kmPerDay = numOrNull(b.kmPerDay);
  const extraKmPrice = numOrNull(b.extraKmPrice);
  if (totalAmount == null || totalAmount < 0)
    return { error: "totalAmount must be a non-negative number" };
  if (depositAmount == null || depositAmount < 0)
    return { error: "depositAmount must be a non-negative number" };
  if (kmPerDay == null || kmPerDay < 0)
    return { error: "kmPerDay must be a non-negative number" };
  if (extraKmPrice == null || extraKmPrice < 0)
    return { error: "extraKmPrice must be a non-negative number" };

  const bookingIdNum = Number(b.bookingId);
  const bookingId =
    b.bookingId != null &&
    b.bookingId !== "" &&
    Number.isInteger(bookingIdNum) &&
    bookingIdNum > 0
      ? bookingIdNum
      : null;
  if (b.bookingId != null && b.bookingId !== "" && bookingId == null) {
    return { error: "bookingId must be a positive integer" };
  }

  const requestId = str(b.requestId);
  if (!/^[0-9a-f-]{36}$/i.test(requestId))
    return { error: "requestId must be a UUID" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requiredText.renterEmail))
    return { error: "renterEmail must be a valid email address" };
  const editContractNumber = str(b.editContractNumber).toUpperCase() || null;
  if (editContractNumber && !CONTRACT_NUMBER.test(editContractNumber))
    return { error: "editContractNumber is invalid" };
  return {
    data: {
      requestId,
      bookingId,
      vehicleId,
      renterName: requiredText.renterName,
      renterDob,
      renterPob: requiredText.renterPob,
      renterNationality: requiredText.renterNationality,
      renterPassport: requiredText.renterPassport,
      renterPassportExpiry,
      renterLicence: requiredText.renterLicence,
      renterLicenceExpiry,
      renterLicenceIssuedBy: requiredText.renterLicenceIssuedBy,
      renterPhone: requiredText.renterPhone,
      renterEmail: requiredText.renterEmail,
      pickupDate,
      returnDate,
      pickupLocation: requiredText.pickupLocation,
      returnLocation: requiredText.returnLocation,
      totalAmount,
      depositAmount,
      kmPerDay,
      extraKmPrice,
      editContractNumber,
      representativeName: requiredText.representativeName,
    },
  };
}

function todayInParis(): { iso: string; key: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  const iso = `${values.year}-${values.month}-${values.day}`;
  return {
    iso,
    key: `${values.day}${values.month}${String(values.year).slice(-2)}`,
  };
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
  return (
    !!err &&
    typeof err === "object" &&
    (err as { code?: string }).code === "23505"
  );
}

/**
 * Generates an unregistered PDF. This route deliberately has no idempotency,
 * numbering or database writes: closing the response discards the contract.
 */
router.post(
  "/admin/contracts/generate-once",
  adminAuth,
  contractLimiter,
  async (req, res) => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const text = (key: string, max = 300): string => {
        const value = str(body[key]);
        if (value.length > max) throw new Error(`${key} is too long`);
        return value;
      };
      const optionalDate = (key: string): string => {
        const value = text(key, 10);
        if (value && !isRealIsoDate(value))
          throw new Error(`${key} must be a real date in YYYY-MM-DD format`);
        return value;
      };
      const optionalNumber = (key: string): number | null => {
        const value = numOrNull(body[key]);
        if (value == null) return null;
        if (value < 0) throw new Error(`${key} must be non-negative`);
        return value;
      };

      const renterEmail = text("renterEmail", 200);
      if (renterEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(renterEmail))
        throw new Error("renterEmail must be a valid email address");

      const pickupDate = optionalDate("pickupDate");
      const returnDate = optionalDate("returnDate");
      if (pickupDate && returnDate && returnDate < pickupDate)
        throw new Error("returnDate must not be before pickupDate");

      let vehicle: typeof vehiclesTable.$inferSelect | null = null;
      if (body.vehicleId != null && body.vehicleId !== "") {
        const vehicleId = Number(body.vehicleId);
        if (!Number.isInteger(vehicleId) || vehicleId <= 0)
          throw new Error("vehicleId must be a positive integer");
        const rows = await db
          .select()
          .from(vehiclesTable)
          .where(eq(vehiclesTable.id, vehicleId))
          .limit(1);
        vehicle = rows[0] ?? null;
        if (!vehicle) {
          res.status(404).json({ error: "Vehicle not found" });
          return;
        }
      }

      const specs = (vehicle?.specs as Record<string, string>) || {};
      const contractInput: ContractInput = {
        contractNumber: text("contractNumber", 100),
        dateOfIssue: todayInParis().iso,
        renter: {
          name: text("renterName", 200),
          dob: optionalDate("renterDob"),
          pob: text("renterPob", 200),
          nationality: text("renterNationality", 200),
          passport: text("renterPassport", 200),
          passportExpiry: optionalDate("renterPassportExpiry"),
          licence: text("renterLicence", 200),
          licenceExpiry: optionalDate("renterLicenceExpiry"),
          licenceIssuedBy: text("renterLicenceIssuedBy", 200),
          phone: text("renterPhone", 200),
          email: renterEmail,
        },
        vehicle: {
          name: vehicle ? stripHtml(vehicle.name) : "",
          category: stripHtml(specs.bodyType),
          plate: stripHtml(specs.registrationPlate),
          vin: stripHtml(specs.vin),
          fuelType: stripHtml(specs.fuelType),
          colour: stripHtml(specs.colour),
        },
        pickupDate,
        returnDate,
        pickupLocation: text("pickupLocation"),
        returnLocation: text("returnLocation"),
        totalAmount: optionalNumber("totalAmount"),
        depositAmount: optionalNumber("depositAmount"),
        kmPerDay: optionalNumber("kmPerDay"),
        extraKmPrice: optionalNumber("extraKmPrice"),
        representativeName: text("representativeName", 200),
      };

      const buffer = await renderPdf(renderContractHtml(contractInput), {
        scale: 1,
        layoutGuard: { selector: ".ctr-page", expectedElements: 2 },
      });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="one-off-contract.pdf"',
      );
      res.setHeader("Content-Length", buffer.length);
      res.send(buffer);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const inputError = /must be|is too long|non-negative/.test(msg);
      logger.error({ err: msg }, "one-off contract PDF error");
      res.status(inputError ? 400 : 500).json({
        error: inputError
          ? msg
          : "Failed to generate one-off contract PDF",
        detail: inputError ? undefined : msg,
      });
    }
  },
);

router.post(
  "/admin/contracts/generate",
  adminAuth,
  contractLimiter,
  async (req, res) => {
    try {
      const parsed = parseContractRequest(req.body);
      if ("error" in parsed) {
        res.status(400).json({ error: parsed.error });
        return;
      }
      const data = parsed.data;

      const [existingRequest] = await db
        .select()
        .from(contractsTable)
        .where(eq(contractsTable.requestId, data.requestId))
        .limit(1);
      if (existingRequest?.pdfBase64) {
        const existingBuffer = Buffer.from(existingRequest.pdfBase64, "base64");
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="contract-${existingRequest.contractNumber}.pdf"`,
        );
        res.setHeader("Content-Length", existingBuffer.length);
        res.setHeader("X-Contract-Number", existingRequest.contractNumber);
        res.send(existingBuffer);
        return;
      }

      const [vehicle] = await db
        .select()
        .from(vehiclesTable)
        .where(eq(vehiclesTable.id, data.vehicleId));
      if (!vehicle) {
        res.status(404).json({ error: "Vehicle not found" });
        return;
      }

      if (data.bookingId != null) {
        const [booking] = await db
          .select()
          .from(bookingsTable)
          .where(eq(bookingsTable.id, data.bookingId));
        if (!booking) {
          res.status(404).json({ error: "Booking not found" });
          return;
        }
        const mismatches: string[] = [];
        if (booking.vehicleId !== data.vehicleId) mismatches.push("vehicle");
        if (booking.startDate !== data.pickupDate)
          mismatches.push("pickup date");
        if (booking.endDate !== data.returnDate) mismatches.push("return date");
        if (
          normalized(booking.clientName || "") !== normalized(data.renterName)
        ) {
          mismatches.push("renter name");
        }
        if (mismatches.length) {
          res.status(409).json({
            error: `Contract does not match booking ${data.bookingId}: ${mismatches.join(", ")}`,
          });
          return;
        }
      }

      const specs = (vehicle.specs as Record<string, string>) || {};
      const vehicleName = stripHtml(vehicle.name);
      const plate = stripHtml(specs.registrationPlate);
      const vin = stripHtml(specs.vin);
      if (!plate) {
        res.status(422).json({
          error:
            "Vehicle registration plate is required before issuing a contract",
        });
        return;
      }
      if (!vin) {
        res.status(422).json({
          error: "Vehicle VIN is required before issuing a contract",
        });
        return;
      }

      const issueDate = todayInParis();
      let contractDateOfIssue = issueDate.iso;
      if (data.editContractNumber) {
        const [existingContract] = await db
          .select()
          .from(contractsTable)
          .where(eq(contractsTable.contractNumber, data.editContractNumber))
          .limit(1);
        if (!existingContract) {
          res.status(404).json({ error: "Contract to edit was not found" });
          return;
        }
        if (
          existingContract.bookingId != null &&
          existingContract.bookingId !== data.bookingId
        ) {
          res.status(409).json({
            error: "Contract belongs to a different booking",
          });
          return;
        }
        const existingSnapshot = existingContract.snapshot as {
          dateOfIssue?: string;
        } | null;
        contractDateOfIssue =
          existingSnapshot?.dateOfIssue || contractDateOfIssue;
      }

      let inserted: typeof contractsTable.$inferSelect | null = null;
      let buffer: Buffer | null = null;
      let lastErr: unknown = null;
      for (let attempt = 0; attempt < 5 && !inserted; attempt++) {
        const contractNumber =
          data.editContractNumber ?? (await nextContractNumber(issueDate.key));
        const contractInput: ContractInput = {
          contractNumber,
          dateOfIssue: contractDateOfIssue,
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
            email: data.renterEmail,
          },
          vehicle: {
            name: vehicleName,
            category: stripHtml(specs.bodyType),
            plate,
            vin,
            fuelType: stripHtml(specs.fuelType),
            colour: stripHtml(specs.colour),
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

        try {
          const html = renderContractHtml(contractInput);
          buffer = await renderPdf(html, {
            scale: 1,
            layoutGuard: { selector: ".ctr-page", expectedElements: 2 },
          });
          const pdfSha256 = createHash("sha256").update(buffer).digest("hex");
          const contractRecord = {
            requestId: data.requestId,
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
            renterEmail: data.renterEmail || null,
            pickupDate: data.pickupDate,
            returnDate: data.returnDate,
            pickupLocation: data.pickupLocation,
            returnLocation: data.returnLocation,
            totalAmount: data.totalAmount,
            depositAmount: data.depositAmount,
            kmPerDay: data.kmPerDay,
            extraKmPrice: data.extraKmPrice,
            representativeName: data.representativeName,
            snapshot: contractInput,
            pdfSha256,
            pdfBase64: buffer.toString("base64"),
            templateVersion: "contract-v2-two-page",
            issuedAt: new Date(),
          };
          const [row] = data.editContractNumber
            ? await db
                .update(contractsTable)
                .set(contractRecord)
                .where(
                  eq(contractsTable.contractNumber, data.editContractNumber),
                )
                .returning()
            : await db
                .insert(contractsTable)
                .values({ ...contractRecord, contractNumber })
                .returning();
          inserted = row;
        } catch (err) {
          lastErr = err;
          if (isUniqueViolation(err)) {
            const [sameRequest] = await db
              .select()
              .from(contractsTable)
              .where(eq(contractsTable.requestId, data.requestId))
              .limit(1);
            if (sameRequest?.pdfBase64) {
              inserted = sameRequest;
              buffer = Buffer.from(sameRequest.pdfBase64, "base64");
              break;
            }
            if (data.editContractNumber) {
              res.status(409).json({
                error: "Contract update conflicted with another request",
              });
              return;
            }
            continue; // regenerate a fresh sequence number and retry
          }
          throw err;
        }
      }

      if (!inserted) {
        throw lastErr instanceof Error
          ? lastErr
          : new Error("Failed to generate a unique contract number");
      }
      if (!buffer)
        throw new Error("Contract PDF buffer is missing after issuance");

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="contract-${inserted.contractNumber}.pdf"`,
      );
      res.setHeader("Content-Length", buffer.length);
      res.setHeader("X-Contract-Number", inserted.contractNumber);
      res.send(buffer);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error({ err: msg }, "contract PDF error");
      const layoutError = msg.startsWith("PDF layout validation failed");
      const schemaError =
        /column .* does not exist|permission denied|must be owner/i.test(msg);
      res.status(layoutError ? 422 : 500).json({
        error: layoutError
          ? "Contract data does not fit the fixed two-page layout. Shorten unusually long fields."
          : schemaError
            ? "Contract database schema is not ready"
            : "Failed to generate contract PDF",
        detail: msg,
      });
    }
  },
);

router.get(
  "/admin/contracts/booking/:bookingId",
  adminAuth,
  async (req, res) => {
    const bookingId = Number(req.params.bookingId);
    if (!Number.isInteger(bookingId) || bookingId <= 0) {
      res.status(400).json({ error: "Invalid booking ID" });
      return;
    }
    const contracts = await db
      .select({
        contractNumber: contractsTable.contractNumber,
        issuedAt: contractsTable.issuedAt,
        createdAt: contractsTable.createdAt,
        pdfSha256: contractsTable.pdfSha256,
        snapshot: contractsTable.snapshot,
      })
      .from(contractsTable)
      .where(eq(contractsTable.bookingId, bookingId))
      .orderBy(desc(contractsTable.createdAt));
    res.json(contracts);
  },
);

router.get(
  "/admin/contracts/:contractNumber/pdf",
  adminAuth,
  async (req, res) => {
    const contractNumber = String(
      req.params.contractNumber || "",
    ).toUpperCase();
    if (!CONTRACT_NUMBER.test(contractNumber)) {
      res.status(400).json({ error: "Invalid contract number" });
      return;
    }
    const [contract] = await db
      .select()
      .from(contractsTable)
      .where(eq(contractsTable.contractNumber, contractNumber))
      .limit(1);
    if (!contract?.pdfBase64) {
      res.status(404).json({ error: "Stored contract PDF not found" });
      return;
    }
    const buffer = Buffer.from(contract.pdfBase64, "base64");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="contract-${contract.contractNumber}.pdf"`,
    );
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  },
);

export default router;
