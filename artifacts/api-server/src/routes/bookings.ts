import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  bookingsTable,
  vehiclesTable,
  rentalHistoryTable,
  insertBookingSchema,
} from "@workspace/db/schema";
import { eq, and, gte, lte, inArray, ne, sql } from "drizzle-orm";
import { adminAuth } from "../middleware/auth";
import { bookingDateTime, isValidTime } from "../lib/bookingIntervals";
import ical from "node-ical";
import { safeRemoteFetch } from "../lib/safeRemoteFetch";
import {
  bookingPhotoPath,
  signBookingPhotos,
  uploadBookingPhoto,
} from "../lib/privateStorage";

function totalDaysInclusive(startDate: string, endDate: string): number {
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
}

// Vehicle names can carry rich-text markup from the admin's CMS editor
// (e.g. "<p><span style=...>McLaren</span></p>") — strip it for the plain
// snapshot stored in rental_history.
function stripHtmlTags(s: string): string {
  return s.replace(/<[^>]*>/g, "").trim();
}

// Statuses that represent a real commercial commitment — an overlapping
// booking in one of these blocks saving. "blocked"/"maintenance" are
// informational (iCal imports, upkeep windows) and are allowed to stack.
const BLOCKING_STATUSES = ["confirmed", "tentative"] as const;

function startsBefore(endDateTime: string) {
  return sql`((${bookingsTable.startDate}::text || ' ' || COALESCE(${bookingsTable.startTime}, '00:00'))::timestamp < ${endDateTime}::timestamp)`;
}

function endsAfter(startDateTime: string) {
  return sql`((${bookingsTable.endDate}::text || ' ' || COALESCE(${bookingsTable.endTime}, '23:59'))::timestamp > ${startDateTime}::timestamp)`;
}

async function findBlockingConflicts(
  vehicleId: number,
  start: string,
  end: string,
  startTime: string,
  endTime: string,
  excludeId?: number,
) {
  const conditions = [
    eq(bookingsTable.vehicleId, vehicleId),
    inArray(bookingsTable.status, BLOCKING_STATUSES),
    startsBefore(bookingDateTime(end, endTime)),
    endsAfter(bookingDateTime(start, startTime)),
  ];
  if (excludeId != null) conditions.push(ne(bookingsTable.id, excludeId));
  return db
    .select()
    .from(bookingsTable)
    .where(and(...conditions))
    .orderBy(bookingsTable.startDate);
}

function conflictMessage(
  conflicts: {
    clientName: string | null;
    startDate: string;
    endDate: string;
    startTime: string | null;
    endTime: string | null;
    status: string;
  }[],
) {
  const parts = conflicts.map(
    (c) =>
      `${c.clientName?.trim() || "an unnamed client"} (${c.status}, ${c.startDate} ${c.startTime || "00:00"} → ${c.endDate} ${c.endTime || "23:59"})`,
  );
  return `This vehicle is already booked for these dates: ${parts.join("; ")}.`;
}

const router: IRouter = Router();

// Scope authentication to this router's own URL space. A global middleware
// here would turn every unknown API route registered after this router into
// a misleading 401 instead of allowing Express to continue to the next router.
router.use("/bookings", adminAuth);

function plainText(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && "val" in (value as any))
    return String((value as any).val);
  return String(value);
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function normalizedBookingBody(body: unknown): unknown {
  if (!body || typeof body !== "object") return body;
  const value = body as Record<string, unknown>;
  if (!Array.isArray(value.bookingPhotos)) return body;
  return {
    ...value,
    bookingPhotos: value.bookingPhotos
      .filter((photo): photo is string => typeof photo === "string")
      .slice(0, 20)
      .map(bookingPhotoPath),
  };
}

// GET /bookings — list all, optionally filtered by vehicleId and/or a date range
router.get("/bookings", async (req, res) => {
  try {
    const vehicleId = req.query.vehicleId
      ? parseInt(String(req.query.vehicleId), 10)
      : null;
    const rangeStart = req.query.start ? String(req.query.start) : null;
    const rangeEnd = req.query.end ? String(req.query.end) : null;

    const conditions = [];
    if (vehicleId != null && !isNaN(vehicleId))
      conditions.push(eq(bookingsTable.vehicleId, vehicleId));
    // overlap with [rangeStart, rangeEnd]: booking.start_date <= rangeEnd AND booking.end_date >= rangeStart
    if (rangeEnd) conditions.push(lte(bookingsTable.startDate, rangeEnd));
    if (rangeStart) conditions.push(gte(bookingsTable.endDate, rangeStart));

    const bookings = conditions.length
      ? await db
          .select()
          .from(bookingsTable)
          .where(and(...conditions))
          .orderBy(bookingsTable.startDate)
      : await db.select().from(bookingsTable).orderBy(bookingsTable.startDate);

    res.json(await Promise.all(bookings.map(signBookingPhotos)));
  } catch (err) {
    console.error("Bookings fetch error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /bookings/availability?vehicleId=X&start=YYYY-MM-DD&end=YYYY-MM-DD&startTime=HH:MM&endTime=HH:MM
router.get("/bookings/availability", async (req, res) => {
  try {
    const vehicleId = parseInt(String(req.query.vehicleId), 10);
    const start = String(req.query.start || "");
    const end = String(req.query.end || "");
    const startTime = String(req.query.startTime || "00:00");
    const endTime = String(req.query.endTime || "23:59");

    if (
      isNaN(vehicleId) ||
      !start ||
      !end ||
      !isValidTime(startTime) ||
      !isValidTime(endTime)
    ) {
      res
        .status(400)
        .json({ error: "Valid vehicle, dates and times are required" });
      return;
    }

    const conflicts = await db
      .select()
      .from(bookingsTable)
      .where(
        and(
          eq(bookingsTable.vehicleId, vehicleId),
          startsBefore(bookingDateTime(end, endTime)),
          endsAfter(bookingDateTime(start, startTime)),
        ),
      )
      .orderBy(bookingsTable.startDate);

    res.json({ available: conflicts.length === 0, conflicts });
  } catch (err) {
    console.error("Availability check error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /bookings/:id
router.post("/bookings/photos", async (req, res) => {
  try {
    const contentType = String(req.headers["content-type"] || "").split(";")[0];
    if (!["image/jpeg", "image/png", "image/webp"].includes(contentType)) {
      res.status(415).json({ error: "Only JPEG, PNG and WebP images are allowed" });
      return;
    }
    const declared = Number(req.headers["content-length"] || 0);
    if (!declared || declared > 5 * 1024 * 1024) {
      res.status(413).json({ error: "Photo must be between 1 byte and 5 MB" });
      return;
    }
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of req) {
      const buffer = Buffer.from(chunk);
      size += buffer.length;
      if (size > 5 * 1024 * 1024) {
        res.status(413).json({ error: "Photo exceeds 5 MB" });
        return;
      }
      chunks.push(buffer);
    }
    const buffer = Buffer.concat(chunks);
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isPng = buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const isWebp = buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
    if (!(isJpeg || isPng || isWebp)) {
      res.status(415).json({ error: "File signature does not match an allowed image" });
      return;
    }
    const uploaded = await uploadBookingPhoto(buffer, contentType);
    res.status(201).json(uploaded);
  } catch (err) {
    req.log?.error?.({ err }, "Private booking photo upload failed");
    res.status(500).json({ error: "Failed to upload booking photo" });
  }
});

router.get("/bookings/:id", async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }
    const [booking] = await db
      .select()
      .from(bookingsTable)
      .where(eq(bookingsTable.id, id));
    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }
    res.json(await signBookingPhotos(booking));
  } catch (err) {
    console.error("Booking fetch error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /bookings
router.post("/bookings", async (req, res) => {
  try {
    const parsed = insertBookingSchema.safeParse(normalizedBookingBody(req.body));
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid data", details: parsed.error.issues });
      return;
    }
    if (parsed.data.endDate < parsed.data.startDate) {
      res.status(400).json({ error: "endDate must not be before startDate" });
      return;
    }
    const startTime = parsed.data.startTime || "00:00";
    const endTime = parsed.data.endTime || "23:59";
    if (!isValidTime(startTime) || !isValidTime(endTime)) {
      res.status(400).json({ error: "startTime and endTime must use HH:MM" });
      return;
    }
    if (
      `${parsed.data.endDate} ${endTime}` <=
      `${parsed.data.startDate} ${startTime}`
    ) {
      res.status(400).json({ error: "Rental end must be after rental start" });
      return;
    }
    if (parsed.data.startDate < toISODate(new Date())) {
      res
        .status(400)
        .json({ error: "Cannot create new bookings for past dates" });
      return;
    }

    const conflicts = await findBlockingConflicts(
      parsed.data.vehicleId,
      parsed.data.startDate,
      parsed.data.endDate,
      startTime,
      endTime,
    );
    if (conflicts.length > 0) {
      res.status(409).json({ error: conflictMessage(conflicts), conflicts });
      return;
    }

    const [booking] = await db
      .insert(bookingsTable)
      .values(parsed.data)
      .returning();
    res.status(201).json(await signBookingPhotos(booking));
  } catch (err) {
    console.error("Booking create error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /bookings/:id
router.put("/bookings/:id", async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const parsed = insertBookingSchema.safeParse(normalizedBookingBody(req.body));
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid data", details: parsed.error.issues });
      return;
    }
    if (parsed.data.endDate < parsed.data.startDate) {
      res.status(400).json({ error: "endDate must not be before startDate" });
      return;
    }
    const startTime = parsed.data.startTime || "00:00";
    const endTime = parsed.data.endTime || "23:59";
    if (!isValidTime(startTime) || !isValidTime(endTime)) {
      res.status(400).json({ error: "startTime and endTime must use HH:MM" });
      return;
    }
    if (
      `${parsed.data.endDate} ${endTime}` <=
      `${parsed.data.startDate} ${startTime}`
    ) {
      res.status(400).json({ error: "Rental end must be after rental start" });
      return;
    }

    const [existing] = await db
      .select()
      .from(bookingsTable)
      .where(eq(bookingsTable.id, id));
    if (!existing) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }
    if (existing.status === "completed") {
      res.status(400).json({ error: "Completed bookings are read-only" });
      return;
    }

    // Only enforce the past-date rule when this edit would newly push the
    // booking into the past — a booking that already started in the past
    // (before this edit) can still be freely edited.
    const today = toISODate(new Date());
    if (existing.startDate >= today && parsed.data.startDate < today) {
      res
        .status(400)
        .json({ error: "Cannot create new bookings for past dates" });
      return;
    }

    const conflicts = await findBlockingConflicts(
      parsed.data.vehicleId,
      parsed.data.startDate,
      parsed.data.endDate,
      startTime,
      endTime,
      id,
    );
    if (conflicts.length > 0) {
      res.status(409).json({ error: conflictMessage(conflicts), conflicts });
      return;
    }

    const booking = await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(bookingsTable)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(bookingsTable.id, id))
        .returning();

      if (updated.status === "completed") {
        const [vehicle] = await tx
          .select()
          .from(vehiclesTable)
          .where(eq(vehiclesTable.id, updated.vehicleId));
        await tx.insert(rentalHistoryTable).values({
          bookingId: updated.id,
          clientName: updated.clientName,
          clientPhone: updated.clientPhone,
          clientNotes: updated.notes,
          vehicleId: updated.vehicleId,
          vehicleName: stripHtmlTags(vehicle?.name ?? "Unknown vehicle"),
          vehicleCategory: vehicle?.category ?? "car",
          vehicleImage: vehicle?.image ?? null,
          startDate: updated.startDate,
          endDate: updated.endDate,
          totalDays: totalDaysInclusive(updated.startDate, updated.endDate),
          rentalPeriodType: updated.rentalPeriodType,
          totalAmount: updated.totalAmount,
          depositAmount: updated.depositAmount,
          vatPercent: updated.vatPercent,
          agentCommissionPercent: updated.agentCommissionPercent,
          agentName: updated.agentName,
          agentPhone: updated.agentPhone,
          agentEmail: updated.agentEmail,
          charterRate: updated.charterRate,
          charterRatePeriod: updated.charterRatePeriod,
          apaAmount: updated.apaAmount,
          captainName: updated.captainName,
          captainDayRate: updated.captainDayRate,
          stewardessCount: updated.stewardessCount,
          stewardessDayRate: updated.stewardessDayRate,
          deckhandCount: updated.deckhandCount,
          deckhandDayRate: updated.deckhandDayRate,
          kmIncluded: updated.kmIncluded,
          pricePerExtraKm: updated.pricePerExtraKm,
          odometerOut: updated.odometerOut,
          odometerIn: updated.odometerIn,
          depositStatus: updated.depositStatus,
          driverCost: updated.driverCost,
          fuelCost: updated.fuelCost,
          tollCost: updated.tollCost,
          deliveryCost: updated.deliveryCost,
          bookingPhotos: updated.bookingPhotos,
          departurePort: updated.departurePort,
          returnPort: updated.returnPort,
          source: updated.source,
          icalUrl: updated.icalUrl,
          contractStatus: updated.contractStatus,
        });
      }

      return updated;
    });

    res.json(await signBookingPhotos(booking));
  } catch (err) {
    console.error("Booking update error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /bookings/:id
router.delete("/bookings/:id", async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const [deleted] = await db
      .delete(bookingsTable)
      .where(eq(bookingsTable.id, id))
      .returning();
    if (!deleted) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Booking delete error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /bookings/ical-sync — fetch an external .ics feed and import its events
// as bookings with status="blocked", source="ical". Re-syncing the same
// (vehicleId, icalUrl) pair replaces its previously-imported bookings, so
// events removed/changed upstream are reflected rather than accumulating.
router.post("/bookings/ical-sync", async (req, res) => {
  try {
    const vehicleId = parseInt(String(req.body.vehicleId), 10);
    const icalUrl = String(req.body.icalUrl || "").trim();

    if (isNaN(vehicleId) || !icalUrl) {
      res.status(400).json({ error: "vehicleId and icalUrl are required" });
      return;
    }

    let parsed: Awaited<ReturnType<typeof ical.async.parseICS>>;
    try {
      const response = await safeRemoteFetch(icalUrl, {
        signal: AbortSignal.timeout(10_000),
        headers: { Accept: "text/calendar" },
      });
      if (!response.ok) throw new Error(`iCal server returned ${response.status}`);
      const declaredLength = Number(response.headers.get("content-length") || 0);
      if (declaredLength > 2_000_000) throw new Error("iCal feed is too large");
      const source = await response.text();
      if (source.length > 2_000_000) throw new Error("iCal feed is too large");
      parsed = await ical.async.parseICS(source);
    } catch (err) {
      res
        .status(400)
        .json({
          error: "Failed to fetch or parse iCal feed",
          details: (err as Error).message,
        });
      return;
    }

    const events = (
      Object.values(parsed).filter((e) => e?.type === "VEVENT") as ical.VEvent[]
    ).filter((e) => !!e.start);

    const newBookings = events.map((event) => {
      const start = new Date(event.start);
      const end = event.end ? new Date(event.end) : start;
      // all-day events use an exclusive end date per RFC 5545 — pull it back
      // one day so the stored range is inclusive, matching our own bookings.
      if (event.datetype === "date" && end > start) {
        end.setDate(end.getDate() - 1);
      }
      return {
        vehicleId,
        startDate: toISODate(start),
        endDate: toISODate(end),
        startTime: null,
        endTime: null,
        status: "blocked" as const,
        clientName: plainText(event.summary),
        clientPhone: null,
        clientEmail: null,
        notes: plainText(event.description),
        source: "ical" as const,
        icalUrl,
      };
    });

    await db.transaction(async (tx) => {
      await tx
        .delete(bookingsTable)
        .where(
          and(
            eq(bookingsTable.vehicleId, vehicleId),
            eq(bookingsTable.icalUrl, icalUrl),
            eq(bookingsTable.source, "ical"),
          ),
        );
      if (newBookings.length > 0) {
        await tx.insert(bookingsTable).values(newBookings);
      }
    });

    res.json({ imported: newBookings.length, vehicleId, icalUrl });
  } catch (err) {
    console.error("iCal sync error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
