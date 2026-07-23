import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { bookingsTable, vehiclesTable, rentalHistoryTable, insertBookingSchema } from "@workspace/db/schema";
import { eq, and, gte, lte, inArray, ne } from "drizzle-orm";
import { adminAuth } from "../middleware/auth";
import ical from "node-ical";

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

async function findBlockingConflicts(vehicleId: number, start: string, end: string, excludeId?: number) {
  const conditions = [
    eq(bookingsTable.vehicleId, vehicleId),
    inArray(bookingsTable.status, BLOCKING_STATUSES),
    lte(bookingsTable.startDate, end),
    gte(bookingsTable.endDate, start),
  ];
  if (excludeId != null) conditions.push(ne(bookingsTable.id, excludeId));
  return db.select().from(bookingsTable).where(and(...conditions)).orderBy(bookingsTable.startDate);
}

function conflictMessage(conflicts: { clientName: string | null; startDate: string; endDate: string; status: string }[]) {
  const parts = conflicts.map(
    (c) => `${c.clientName?.trim() || "an unnamed client"} (${c.status}, ${c.startDate} → ${c.endDate})`,
  );
  return `This vehicle is already booked for these dates: ${parts.join("; ")}.`;
}

const router: IRouter = Router();

router.use(adminAuth);

function plainText(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && "val" in (value as any)) return String((value as any).val);
  return String(value);
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// GET /bookings — list all, optionally filtered by vehicleId and/or a date range
router.get("/bookings", async (req, res) => {
  try {
    const vehicleId = req.query.vehicleId ? parseInt(String(req.query.vehicleId), 10) : null;
    const rangeStart = req.query.start ? String(req.query.start) : null;
    const rangeEnd = req.query.end ? String(req.query.end) : null;

    const conditions = [];
    if (vehicleId != null && !isNaN(vehicleId)) conditions.push(eq(bookingsTable.vehicleId, vehicleId));
    // overlap with [rangeStart, rangeEnd]: booking.start_date <= rangeEnd AND booking.end_date >= rangeStart
    if (rangeEnd) conditions.push(lte(bookingsTable.startDate, rangeEnd));
    if (rangeStart) conditions.push(gte(bookingsTable.endDate, rangeStart));

    const bookings = conditions.length
      ? await db.select().from(bookingsTable).where(and(...conditions)).orderBy(bookingsTable.startDate)
      : await db.select().from(bookingsTable).orderBy(bookingsTable.startDate);

    res.json(bookings);
  } catch (err) {
    console.error("Bookings fetch error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /bookings/availability?vehicleId=X&start=YYYY-MM-DD&end=YYYY-MM-DD
router.get("/bookings/availability", async (req, res) => {
  try {
    const vehicleId = parseInt(String(req.query.vehicleId), 10);
    const start = String(req.query.start || "");
    const end = String(req.query.end || "");

    if (isNaN(vehicleId) || !start || !end) {
      res.status(400).json({ error: "vehicleId, start, and end are required" });
      return;
    }

    // any booking for this vehicle whose [start_date, end_date] overlaps [start, end]
    const conflicts = await db
      .select()
      .from(bookingsTable)
      .where(
        and(
          eq(bookingsTable.vehicleId, vehicleId),
          lte(bookingsTable.startDate, end),
          gte(bookingsTable.endDate, start),
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
router.get("/bookings/:id", async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }
    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id));
    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }
    res.json(booking);
  } catch (err) {
    console.error("Booking fetch error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /bookings
router.post("/bookings", async (req, res) => {
  try {
    const parsed = insertBookingSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid data", details: parsed.error.issues });
      return;
    }
    if (parsed.data.endDate < parsed.data.startDate) {
      res.status(400).json({ error: "endDate must not be before startDate" });
      return;
    }
    if (parsed.data.startDate < toISODate(new Date())) {
      res.status(400).json({ error: "Cannot create new bookings for past dates" });
      return;
    }

    const conflicts = await findBlockingConflicts(parsed.data.vehicleId, parsed.data.startDate, parsed.data.endDate);
    if (conflicts.length > 0) {
      res.status(409).json({ error: conflictMessage(conflicts), conflicts });
      return;
    }

    const [booking] = await db.insert(bookingsTable).values(parsed.data).returning();
    res.status(201).json(booking);
  } catch (err) {
    console.error("Booking create error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /bookings/:id
router.put("/bookings/:id", async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const parsed = insertBookingSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid data", details: parsed.error.issues });
      return;
    }
    if (parsed.data.endDate < parsed.data.startDate) {
      res.status(400).json({ error: "endDate must not be before startDate" });
      return;
    }

    const [existing] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id));
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
      res.status(400).json({ error: "Cannot create new bookings for past dates" });
      return;
    }

    const conflicts = await findBlockingConflicts(parsed.data.vehicleId, parsed.data.startDate, parsed.data.endDate, id);
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
        const [vehicle] = await tx.select().from(vehiclesTable).where(eq(vehiclesTable.id, updated.vehicleId));
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

    res.json(booking);
  } catch (err) {
    console.error("Booking update error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /bookings/:id
router.delete("/bookings/:id", async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const [deleted] = await db.delete(bookingsTable).where(eq(bookingsTable.id, id)).returning();
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

    let parsed: Awaited<ReturnType<typeof ical.async.fromURL>>;
    try {
      parsed = await ical.async.fromURL(icalUrl);
    } catch (err) {
      res.status(400).json({ error: "Failed to fetch or parse iCal feed", details: (err as Error).message });
      return;
    }

    const events = (Object.values(parsed).filter((e) => e?.type === "VEVENT") as ical.VEvent[]).filter(
      (e) => !!e.start,
    );

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
        status: "blocked" as const,
        clientName: plainText(event.summary),
        clientPhone: null,
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
