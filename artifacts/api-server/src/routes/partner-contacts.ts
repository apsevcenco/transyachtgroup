import { Router, type IRouter } from "express";
import { and, asc, count, desc, eq, getTableColumns, ilike, isNotNull, isNull, lte, notInArray, or, sql, type SQL } from "drizzle-orm";

import { db } from "@workspace/db";
import { insertPartnerContactSchema, partnerContactsTable, partnerMessagesTable } from "@workspace/db/schema";
import { adminAuth } from "../middleware/auth";
import { CLOSED_STATUSES, isPartnerStatus } from "../lib/partnerMailUtils";
import { importKey, MAX_IMPORT_ROWS, validateImportRows } from "../lib/partnerImport";

const router: IRouter = Router();
router.use("/admin/partner-contacts", adminAuth);
router.use("/admin/partner-messages", adminAuth);

function clean(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// The admin UI sends dates as ISO strings; the insert schema expects Date.
function normalizeBody(body: unknown): Record<string, unknown> {
  const value: Record<string, unknown> = body && typeof body === "object" ? { ...(body as Record<string, unknown>) } : {};
  for (const key of ["lastContactedAt", "nextFollowUpAt"]) {
    if (!(key in value)) continue;
    const raw = value[key];
    if (raw === null || raw === "") {
      value[key] = null;
    } else if (typeof raw === "string") {
      const date = new Date(raw);
      if (Number.isNaN(date.getTime())) throw new Error("INVALID_DATE");
      value[key] = date;
    }
  }
  return value;
}

const dueClause = () =>
  and(
    isNotNull(partnerContactsTable.nextFollowUpAt),
    lte(partnerContactsTable.nextFollowUpAt, new Date()),
    notInArray(partnerContactsTable.status, [...CLOSED_STATUSES]),
  );

// Written out by hand on purpose: in a single-table SELECT list drizzle renders
// `${column}` unqualified ("id"), which inside these subqueries would silently
// bind to partner_messages.id instead of the outer partner_contacts row.
const contactId = sql.raw('"partner_contacts"."id"');

const unreadReplySql = sql`exists (
  select 1 from partner_messages m
  where m.partner_contact_id = ${contactId}
    and m.direction = 'inbound' and m.read_at is null
)`;

const unreadCountSql = sql<number>`(
  select count(*)::int from partner_messages m
  where m.partner_contact_id = ${contactId}
    and m.direction = 'inbound' and m.read_at is null
)`;

router.get("/admin/partner-contacts", async (req, res) => {
  try {
    const q = clean(req.query.q);
    const city = clean(req.query.city);
    const category = clean(req.query.category);
    const status = clean(req.query.status);
    const view = clean(req.query.view);
    const limit = Math.min(Math.max(Number(req.query.limit) || 500, 1), 2_000);
    const clauses: SQL[] = [];
    if (city) clauses.push(eq(partnerContactsTable.city, city));
    if (category) clauses.push(eq(partnerContactsTable.category, category));
    if (status) clauses.push(eq(partnerContactsTable.status, status));
    if (view === "due") {
      const due = dueClause();
      if (due) clauses.push(due);
    }
    if (view === "unread") clauses.push(unreadReplySql);
    if (q) {
      const searchClause = or(
        ilike(partnerContactsTable.organization, `%${q}%`),
        ilike(partnerContactsTable.email, `%${q}%`),
        ilike(partnerContactsTable.phone, `%${q}%`),
        ilike(partnerContactsTable.contactPerson, `%${q}%`),
      );
      if (searchClause) clauses.push(searchClause);
    }

    const order =
      view === "due"
        ? asc(partnerContactsTable.nextFollowUpAt)
        : view === "unread"
          ? sql`${partnerContactsTable.lastReplyAt} desc nulls last`
          : desc(partnerContactsTable.updatedAt);
    const query = db
      .select({ ...getTableColumns(partnerContactsTable), unreadCount: unreadCountSql })
      .from(partnerContactsTable);
    const contacts = await (clauses.length ? query.where(and(...clauses)) : query).orderBy(order).limit(limit);
    res.json(contacts);
  } catch (err) {
    req.log?.error?.({ err }, "Failed to fetch partner contacts");
    res.status(500).json({ error: "Failed to fetch partner contacts" });
  }
});

// Counters for the admin badges: follow-ups that are due and replies nobody has read yet.
router.get("/admin/partner-contacts/summary", async (req, res) => {
  try {
    const [due] = await db.select({ n: count() }).from(partnerContactsTable).where(dueClause());
    const [unread] = await db
      .select({ n: count() })
      .from(partnerMessagesTable)
      .where(and(eq(partnerMessagesTable.direction, "inbound"), isNull(partnerMessagesTable.readAt), isNotNull(partnerMessagesTable.partnerContactId)));
    const [unmatched] = await db
      .select({ n: count() })
      .from(partnerMessagesTable)
      .where(and(eq(partnerMessagesTable.direction, "inbound"), isNull(partnerMessagesTable.readAt), isNull(partnerMessagesTable.partnerContactId)));
    res.json({ dueFollowUps: due?.n ?? 0, unreadReplies: unread?.n ?? 0, unmatchedReplies: unmatched?.n ?? 0 });
  } catch (err) {
    req.log?.error?.({ err }, "Failed to load partner summary");
    res.status(500).json({ error: "Failed to load partner summary" });
  }
});

// Bulk import from a spreadsheet the browser has already parsed. With
// dryRun it only reports what would happen; otherwise it inserts the new
// contacts and silently leaves existing ones (and their statuses) untouched.
router.post("/admin/partner-contacts/import", async (req, res) => {
  try {
    const value = req.body && typeof req.body === "object" ? (req.body as Record<string, unknown>) : {};
    if (!Array.isArray(value.rows)) return void res.status(400).json({ error: "rows must be an array" });
    if (value.rows.length > MAX_IMPORT_ROWS) {
      return void res.status(400).json({ error: `Send at most ${MAX_IMPORT_ROWS} rows per request` });
    }
    const dryRun = value.dryRun === true;
    const { rows, invalid, duplicatesInFile } = validateImportRows(value.rows);

    const existing = new Set<string>();
    const emails = Array.from(new Set(rows.map((row) => row.email)));
    if (emails.length) {
      const list = sql.join(emails.map((email) => sql`${email}`), sql`, `);
      const found = await db
        .select({
          email: partnerContactsTable.email,
          organization: partnerContactsTable.organization,
          city: partnerContactsTable.city,
          category: partnerContactsTable.category,
        })
        .from(partnerContactsTable)
        .where(sql`lower(${partnerContactsTable.email}) in (${list})`);
      for (const row of found) existing.add(importKey(row));
    }
    const fresh = rows.filter((row) => !existing.has(importKey(row)));
    const summary = {
      received: value.rows.length,
      valid: rows.length,
      invalid: invalid.slice(0, 25),
      invalidCount: invalid.length,
      duplicatesInFile,
      alreadyInCrm: rows.length - fresh.length,
    };
    if (dryRun) return void res.json({ ...summary, willImport: fresh.length });

    let inserted = 0;
    if (fresh.length) {
      const result = await db
        .insert(partnerContactsTable)
        .values(fresh.map((row) => ({ ...row, status: "new" })))
        .onConflictDoNothing()
        .returning({ id: partnerContactsTable.id });
      inserted = result.length;
    }
    res.json({ ...summary, inserted });
  } catch (err) {
    req.log?.error?.({ err }, "Failed to import partner contacts");
    res.status(500).json({ error: "Failed to import partner contacts" });
  }
});

router.post("/admin/partner-contacts", async (req, res) => {
  try {
    const body = normalizeBody(req.body);
    if ("status" in body && !isPartnerStatus(body.status)) return void res.status(400).json({ error: "Invalid status" });
    const parsed = insertPartnerContactSchema.safeParse(body);
    if (!parsed.success) return void res.status(400).json({ error: "Invalid partner contact", details: parsed.error.issues });
    const [contact] = await db.insert(partnerContactsTable).values(parsed.data).returning();
    res.status(201).json(contact);
  } catch (err) {
    if (err instanceof Error && err.message === "INVALID_DATE") return void res.status(400).json({ error: "Invalid date" });
    req.log?.error?.({ err }, "Failed to create partner contact");
    res.status(500).json({ error: "Failed to create partner contact" });
  }
});

router.put("/admin/partner-contacts/:id", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return void res.status(400).json({ error: "Invalid id" });
    const body = normalizeBody(req.body);
    if ("status" in body && !isPartnerStatus(body.status)) return void res.status(400).json({ error: "Invalid status" });
    const parsed = insertPartnerContactSchema.partial().safeParse(body);
    if (!parsed.success) return void res.status(400).json({ error: "Invalid partner contact", details: parsed.error.issues });
    const [contact] = await db.update(partnerContactsTable).set({ ...parsed.data, updatedAt: new Date() }).where(eq(partnerContactsTable.id, id)).returning();
    if (!contact) return void res.status(404).json({ error: "Partner contact not found" });
    res.json(contact);
  } catch (err) {
    if (err instanceof Error && err.message === "INVALID_DATE") return void res.status(400).json({ error: "Invalid date" });
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

router.get("/admin/partner-contacts/:id/messages", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return void res.status(400).json({ error: "Invalid id" });
    const messages = await db
      .select()
      .from(partnerMessagesTable)
      .where(eq(partnerMessagesTable.partnerContactId, id))
      .orderBy(asc(partnerMessagesTable.createdAt))
      .limit(200);
    res.json(messages);
  } catch (err) {
    req.log?.error?.({ err }, "Failed to fetch partner messages");
    res.status(500).json({ error: "Failed to fetch partner messages" });
  }
});

router.post("/admin/partner-contacts/:id/messages/read", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return void res.status(400).json({ error: "Invalid id" });
    await db
      .update(partnerMessagesTable)
      .set({ readAt: new Date() })
      .where(and(eq(partnerMessagesTable.partnerContactId, id), eq(partnerMessagesTable.direction, "inbound"), isNull(partnerMessagesTable.readAt)));
    res.status(204).end();
  } catch (err) {
    req.log?.error?.({ err }, "Failed to mark partner messages read");
    res.status(500).json({ error: "Failed to mark messages read" });
  }
});

// Replies from addresses that are not in the CRM (a partner answering from a
// different mailbox, a forward, ...). They still need a human to look at them.
router.get("/admin/partner-messages/unmatched", async (req, res) => {
  try {
    const messages = await db
      .select()
      .from(partnerMessagesTable)
      .where(and(eq(partnerMessagesTable.direction, "inbound"), isNull(partnerMessagesTable.partnerContactId)))
      .orderBy(desc(partnerMessagesTable.createdAt))
      .limit(50);
    res.json(messages);
  } catch (err) {
    req.log?.error?.({ err }, "Failed to fetch unmatched replies");
    res.status(500).json({ error: "Failed to fetch unmatched replies" });
  }
});

router.post("/admin/partner-messages/:id/read", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return void res.status(400).json({ error: "Invalid id" });
    await db.update(partnerMessagesTable).set({ readAt: new Date() }).where(eq(partnerMessagesTable.id, id));
    res.status(204).end();
  } catch (err) {
    req.log?.error?.({ err }, "Failed to mark message read");
    res.status(500).json({ error: "Failed to mark message read" });
  }
});

export default router;
