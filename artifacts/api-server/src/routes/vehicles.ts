import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { vehiclesTable, vehicleDeletionLogTable, insertVehicleSchema } from "@workspace/db/schema";
import { eq, and, ne, isNull, isNotNull, desc } from "drizzle-orm";
import { adminAuth } from "../middleware/auth";

const router: IRouter = Router();

function applyLang(vehicle: any, lang: string) {
  if (lang === "en" || !vehicle) return vehicle;
  const translations = (vehicle.translations as Record<string, Record<string, string>>) || {};
  const langData = translations[lang];
  if (!langData) return vehicle;
  const result = {
    ...vehicle,
    name: langData.name || vehicle.name,
    description: langData.description || vehicle.description,
  };
  if (langData.fullDescription && result.specs) {
    result.specs = { ...result.specs, fullDescription: langData.fullDescription };
  }
  return result;
}

const PUBLIC_CACHE = "public, max-age=60, stale-while-revalidate=86400";

function auditActor(req: any) {
  return req.adminSessionId ? `admin-session:${req.adminSessionId}` : "admin";
}

async function logDeletionAction(req: any, vehicle: any, action: "trashed" | "restored" | "permanently_deleted") {
  await db.insert(vehicleDeletionLogTable).values({
    vehicleId: vehicle.id,
    vehicleName: vehicle.name,
    vehicleCategory: vehicle.category,
    action,
    actor: auditActor(req),
    ipAddress: req.ip || null,
    userAgent: req.get?.("user-agent") || null,
    snapshot: vehicle,
  });
}

router.get("/vehicles", async (req, res) => {
  try {
    const lang = String(req.query.lang || "en");
    const category = req.query.category ? String(req.query.category) : null;

    const visibilityFilter = and(ne(vehiclesTable.visible, false), isNull(vehiclesTable.deletedAt));
    const categoryFilter = category ? eq(vehiclesTable.category, category) : undefined;
    const filters = [visibilityFilter, categoryFilter].filter((f): f is NonNullable<typeof f> => !!f);

    const vehicles = filters.length
      ? await db.select().from(vehiclesTable).where(and(...filters)).orderBy(vehiclesTable.id)
      : await db.select().from(vehiclesTable).orderBy(vehiclesTable.id);

    res.set("Cache-Control", PUBLIC_CACHE);
    res.json(vehicles.map(v => applyLang(v, lang)));
  } catch (err) {
    console.error("Vehicles fetch error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admin/vehicles", adminAuth, async (req, res) => {
  try {
    const lang = String(req.query.lang || "en");
    const category = req.query.category ? String(req.query.category) : null;
    const rows = category
      ? await db
          .select()
          .from(vehiclesTable)
          .where(and(eq(vehiclesTable.category, category), isNull(vehiclesTable.deletedAt)))
          .orderBy(vehiclesTable.id)
      : await db.select().from(vehiclesTable).where(isNull(vehiclesTable.deletedAt)).orderBy(vehiclesTable.id);
    res.set("Cache-Control", "no-store");
    res.json(rows.map((vehicle) => applyLang(vehicle, lang)));
  } catch (err) {
    req.log?.error?.({ err }, "Admin vehicles fetch failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/vehicles/featured", async (req, res) => {
  try {
    const lang = String(req.query.lang || "en");
    const vehicles = await db
      .select()
      .from(vehiclesTable)
      .where(and(eq(vehiclesTable.featured, true), ne(vehiclesTable.visible, false), isNull(vehiclesTable.deletedAt)))
      .orderBy(vehiclesTable.id);
    res.set("Cache-Control", PUBLIC_CACHE);
    res.json(vehicles.map(v => applyLang(v, lang)));
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/vehicles/:id", async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const lang = String(req.query.lang || "en");
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }
    const [vehicle] = await db
      .select()
      .from(vehiclesTable)
      .where(and(eq(vehiclesTable.id, id), ne(vehiclesTable.visible, false), isNull(vehiclesTable.deletedAt)));
    if (!vehicle) {
      res.status(404).json({ error: "Vehicle not found" });
      return;
    }
    res.set("Cache-Control", PUBLIC_CACHE);
    res.json(applyLang(vehicle, lang));
  } catch (err) {
    console.error("Vehicle fetch error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/vehicles", adminAuth, async (req, res) => {
  try {
    const parsed = insertVehicleSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid data", details: parsed.error.issues });
      return;
    }
    const [vehicle] = await db.insert(vehiclesTable).values(parsed.data).returning();
    res.status(201).json(vehicle);
  } catch (err) {
    console.error("Vehicle create error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/vehicles/:id", adminAuth, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const parsed = insertVehicleSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid data", details: parsed.error.issues });
      return;
    }
    const [vehicle] = await db
      .update(vehiclesTable)
      .set(parsed.data)
      .where(eq(vehiclesTable.id, id))
      .returning();
    if (!vehicle) {
      res.status(404).json({ error: "Vehicle not found" });
      return;
    }
    res.json(vehicle);
  } catch (err) {
    console.error("Vehicle update error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admin/vehicles/trash", adminAuth, async (req, res) => {
  try {
    const rows = await db.select().from(vehiclesTable).where(isNotNull(vehiclesTable.deletedAt)).orderBy(desc(vehiclesTable.deletedAt));
    res.set("Cache-Control", "no-store");
    res.json(rows);
  } catch (err) {
    req.log?.error?.({ err }, "Vehicle trash fetch failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admin/vehicles/deletion-log", adminAuth, async (req, res) => {
  try {
    const rows = await db.select().from(vehicleDeletionLogTable).orderBy(desc(vehicleDeletionLogTable.createdAt)).limit(500);
    res.set("Cache-Control", "no-store");
    res.json(rows);
  } catch (err) {
    req.log?.error?.({ err }, "Vehicle deletion log fetch failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/vehicles/:id/restore", adminAuth, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const [vehicle] = await db.select().from(vehiclesTable).where(and(eq(vehiclesTable.id, id), isNotNull(vehiclesTable.deletedAt)));
    if (!vehicle) return void res.status(404).json({ error: "Vehicle not found in trash" });
    const [restored] = await db.update(vehiclesTable).set({ deletedAt: null, deletedBy: null }).where(eq(vehiclesTable.id, id)).returning();
    await logDeletionAction(req, vehicle, "restored");
    res.json(restored);
  } catch (err) {
    req.log?.error?.({ err }, "Vehicle restore failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/admin/vehicles/:id/permanent", adminAuth, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const [vehicle] = await db.select().from(vehiclesTable).where(and(eq(vehiclesTable.id, id), isNotNull(vehiclesTable.deletedAt)));
    if (!vehicle) return void res.status(404).json({ error: "Vehicle not found in trash" });
    if (req.body?.confirmation !== vehicle.name) return void res.status(400).json({ error: "Vehicle name confirmation does not match" });
    await logDeletionAction(req, vehicle, "permanently_deleted");
    await db.delete(vehiclesTable).where(eq(vehiclesTable.id, id));
    res.json({ success: true });
  } catch (err) {
    req.log?.error?.({ err }, "Permanent vehicle deletion failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/vehicles/:id", adminAuth, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const [deleted] = await db
      .update(vehiclesTable)
      .set({ deletedAt: new Date(), deletedBy: auditActor(req) })
      .where(and(eq(vehiclesTable.id, id), isNull(vehiclesTable.deletedAt)))
      .returning();
    if (!deleted) {
      res.status(404).json({ error: "Vehicle not found" });
      return;
    }
    await logDeletionAction(req, deleted, "trashed");
    res.json({ success: true, deletedAt: deleted.deletedAt });
  } catch (err) {
    console.error("Vehicle delete error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
