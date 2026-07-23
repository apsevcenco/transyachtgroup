import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { rentalHistoryTable } from "@workspace/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { adminAuth } from "../middleware/auth";

const router: IRouter = Router();

router.use(adminAuth);

// GET /rental-history — list completed rentals, optionally filtered by
// vehicleId, category (car/yacht), and/or a date range over [start, end]
router.get("/rental-history", async (req, res) => {
  try {
    const vehicleId = req.query.vehicleId ? parseInt(String(req.query.vehicleId), 10) : null;
    const category = req.query.category ? String(req.query.category) : null;
    const rangeStart = req.query.start ? String(req.query.start) : null;
    const rangeEnd = req.query.end ? String(req.query.end) : null;

    const conditions = [];
    if (vehicleId != null && !isNaN(vehicleId)) conditions.push(eq(rentalHistoryTable.vehicleId, vehicleId));
    if (category) conditions.push(eq(rentalHistoryTable.vehicleCategory, category));
    // overlap with [rangeStart, rangeEnd]: rental.start_date <= rangeEnd AND rental.end_date >= rangeStart
    if (rangeEnd) conditions.push(lte(rentalHistoryTable.startDate, rangeEnd));
    if (rangeStart) conditions.push(gte(rentalHistoryTable.endDate, rangeStart));

    const rentals = conditions.length
      ? await db.select().from(rentalHistoryTable).where(and(...conditions)).orderBy(desc(rentalHistoryTable.completedAt))
      : await db.select().from(rentalHistoryTable).orderBy(desc(rentalHistoryTable.completedAt));

    res.json(rentals);
  } catch (err) {
    console.error("Rental history fetch error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /rental-history/:id
router.delete("/rental-history/:id", async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }
    const [deleted] = await db.delete(rentalHistoryTable).where(eq(rentalHistoryTable.id, id)).returning();
    if (!deleted) {
      res.status(404).json({ error: "Rental history record not found" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Rental history delete error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
