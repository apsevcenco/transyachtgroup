import { Router, type IRouter } from "express";
import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";

import { db } from "@workspace/db";
import { insertPartnerContactSchema, partnerContactsTable } from "@workspace/db/schema";
import { adminAuth } from "../middleware/auth";

const router: IRouter = Router();
router.use("/admin/partner-contacts", adminAuth);

function clean(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

router.get("/admin/partner-contacts", async (req, res) => {
  try {
    const q = clean(req.query.q);
    const city = clean(req.query.city);
    const category = clean(req.query.category);
    const status = clean(req.query.status);
    const limit = Math.min(Math.max(Number(req.query.limit) || 500, 1), 2_000);
    const clauses: SQL[] = [];
    if (city) clauses.push(eq(partnerContactsTable.city, city));
    if (category) clauses.push(eq(partnerContactsTable.category, category));
    if (status) clauses.push(eq(partnerContactsTable.status, status));
    if (q) {
      const searchClause = or(
        ilike(partnerContactsTable.organization, `%${q}%`),
        ilike(partnerContactsTable.email, `%${q}%`),
        ilike(partnerContactsTable.phone, `%${q}%`),
        ilike(partnerContactsTable.contactPerson, `%${q}%`),
      );
      if (searchClause) clauses.push(searchClause);
    }
    const where = clauses.length ? and(...clauses) : undefined;
    const contacts = where
      ? await db.select().from(partnerContactsTable).where(where).orderBy(desc(partnerContactsTable.updatedAt)).limit(limit)
      : await db.select().from(partnerContactsTable).orderBy(desc(partnerContactsTable.updatedAt)).limit(limit);
    res.json(contacts);
  } catch (err) {
    req.log?.error?.({ err }, "Failed to fetch partner contacts");
    res.status(500).json({ error: "Failed to fetch partner contacts" });
  }
});

router.post("/admin/partner-contacts", async (req, res) => {
  try {
    const parsed = insertPartnerContactSchema.safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ error: "Invalid partner contact", details: parsed.error.issues });
    const [contact] = await db.insert(partnerContactsTable).values(parsed.data).returning();
    res.status(201).json(contact);
  } catch (err) {
    req.log?.error?.({ err }, "Failed to create partner contact");
    res.status(500).json({ error: "Failed to create partner contact" });
  }
});

router.put("/admin/partner-contacts/:id", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return void res.status(400).json({ error: "Invalid id" });
    const parsed = insertPartnerContactSchema.partial().safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ error: "Invalid partner contact", details: parsed.error.issues });
    const [contact] = await db.update(partnerContactsTable).set({ ...parsed.data, updatedAt: new Date() }).where(eq(partnerContactsTable.id, id)).returning();
    if (!contact) return void res.status(404).json({ error: "Partner contact not found" });
    res.json(contact);
  } catch (err) {
    req.log?.error?.({ err }, "Failed to update partner contact");
    res.status(500).json({ error: "Failed to update partner contact" });
  }
});

router.delete("/admin/partner-contacts/:id", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return void res.status(400).json({ error: "Invalid id" });
    await db.delete(partnerContactsTable).where(eq(partnerContactsTable.id, id));
    res.status(204).end();
  } catch (err) {
    req.log?.error?.({ err }, "Failed to delete partner contact");
    res.status(500).json({ error: "Failed to delete partner contact" });
  }
});

export default router;
