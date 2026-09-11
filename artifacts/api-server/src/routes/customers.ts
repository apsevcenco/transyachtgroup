import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  customersTable,
  insertCustomerSchema,
} from "@workspace/db/schema";
import { desc, eq, ilike, or, sql } from "drizzle-orm";
import { adminAuth } from "../middleware/auth";

const router: IRouter = Router();

router.use("/admin/customers", adminAuth);

function digits(value: string | null | undefined): string {
  return String(value || "").replace(/\D/g, "");
}

function clean(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text || null;
}

export async function upsertCustomerFromContact(input: {
  customerId?: number | null;
  fullName?: string | null;
  phone?: string | null;
  email?: string | null;
  dateOfBirth?: string | null;
  placeOfBirth?: string | null;
  nationality?: string | null;
  passportNumber?: string | null;
  passportExpiry?: string | null;
  driverLicenseNumber?: string | null;
  driverLicenseExpiry?: string | null;
  driverLicenseIssuedBy?: string | null;
  legalEntity?: string | null;
  notes?: string | null;
}): Promise<number | null> {
  const fullName = clean(input.fullName);
  const phone = clean(input.phone);
  const email = clean(input.email)?.toLowerCase() ?? null;
  if (!fullName) return input.customerId ?? null;

  const values = {
    fullName,
    phone,
    email,
    dateOfBirth: input.dateOfBirth || null,
    placeOfBirth: clean(input.placeOfBirth),
    nationality: clean(input.nationality),
    passportNumber: clean(input.passportNumber),
    passportExpiry: input.passportExpiry || null,
    driverLicenseNumber: clean(input.driverLicenseNumber),
    driverLicenseExpiry: input.driverLicenseExpiry || null,
    driverLicenseIssuedBy: clean(input.driverLicenseIssuedBy),
    legalEntity: clean(input.legalEntity),
    notes: clean(input.notes),
  };

  if (input.customerId) {
    const [updated] = await db
      .update(customersTable)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(customersTable.id, input.customerId))
      .returning({ id: customersTable.id });
    if (updated) return updated.id;
  }

  const phoneDigits = digits(phone);
  const matches = [];
  if (email) matches.push(eq(sql`lower(${customersTable.email})`, email));
  if (phoneDigits) matches.push(eq(sql`regexp_replace(coalesce(${customersTable.phone}, ''), '\D', '', 'g')`, phoneDigits));
  const [existing] = matches.length
    ? await db.select().from(customersTable).where(or(...matches)).limit(1)
    : [];

  if (existing) {
    const [updated] = await db
      .update(customersTable)
      .set({
        fullName: values.fullName || existing.fullName,
        phone: values.phone || existing.phone,
        email: values.email || existing.email,
        dateOfBirth: values.dateOfBirth || existing.dateOfBirth,
        placeOfBirth: values.placeOfBirth || existing.placeOfBirth,
        nationality: values.nationality || existing.nationality,
        passportNumber: values.passportNumber || existing.passportNumber,
        passportExpiry: values.passportExpiry || existing.passportExpiry,
        driverLicenseNumber: values.driverLicenseNumber || existing.driverLicenseNumber,
        driverLicenseExpiry: values.driverLicenseExpiry || existing.driverLicenseExpiry,
        driverLicenseIssuedBy: values.driverLicenseIssuedBy || existing.driverLicenseIssuedBy,
        legalEntity: values.legalEntity || existing.legalEntity,
        notes: values.notes || existing.notes,
        updatedAt: new Date(),
      })
      .where(eq(customersTable.id, existing.id))
      .returning({ id: customersTable.id });
    return updated?.id ?? existing.id;
  }

  const [created] = await db.insert(customersTable).values(values).returning({ id: customersTable.id });
  return created?.id ?? null;
}

router.get("/admin/customers", async (req, res) => {
  try {
    const q = clean(req.query.q);
    const limit = Math.min(Math.max(Number(req.query.limit || 200), 1), 500);
    const where = q
      ? or(
          ilike(customersTable.fullName, `%${q}%`),
          ilike(customersTable.phone, `%${q}%`),
          ilike(customersTable.email, `%${q}%`),
          ilike(customersTable.passportNumber, `%${q}%`),
          ilike(customersTable.driverLicenseNumber, `%${q}%`),
        )
      : undefined;
    const rows = where
      ? await db.select().from(customersTable).where(where).orderBy(desc(customersTable.updatedAt)).limit(limit)
      : await db.select().from(customersTable).orderBy(desc(customersTable.updatedAt)).limit(limit);
    res.json(rows);
  } catch (err) {
    req.log?.error?.({ err }, "Customers fetch failed");
    res.status(500).json({ error: "Failed to load customers" });
  }
});

router.post("/admin/customers", async (req, res) => {
  try {
    const parsed = insertCustomerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid customer data", details: parsed.error.issues });
      return;
    }
    const [customer] = await db.insert(customersTable).values(parsed.data).returning();
    res.status(201).json(customer);
  } catch (err) {
    req.log?.error?.({ err }, "Customer create failed");
    res.status(500).json({ error: "Failed to create customer" });
  }
});

router.put("/admin/customers/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid customer ID" });
      return;
    }
    const parsed = insertCustomerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid customer data", details: parsed.error.issues });
      return;
    }
    const [customer] = await db.update(customersTable).set({ ...parsed.data, updatedAt: new Date() }).where(eq(customersTable.id, id)).returning();
    if (!customer) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }
    res.json(customer);
  } catch (err) {
    req.log?.error?.({ err }, "Customer update failed");
    res.status(500).json({ error: "Failed to update customer" });
  }
});

router.delete("/admin/customers/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid customer ID" });
      return;
    }
    await db.delete(customersTable).where(eq(customersTable.id, id));
    res.json({ success: true });
  } catch (err) {
    req.log?.error?.({ err }, "Customer delete failed");
    res.status(500).json({ error: "Failed to delete customer" });
  }
});

export default router;
