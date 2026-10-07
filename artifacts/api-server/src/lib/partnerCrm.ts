import { and, eq, sql } from "drizzle-orm";

import { db } from "@workspace/db";
import { partnerContactsTable, partnerMessagesTable, siteContentTable } from "@workspace/db/schema";
import { logger } from "./logger";
import {
  classifyDeliveryEvent,
  followUpAfterSend,
  htmlToText,
  normalizeEmail,
  shouldUpdateMessageStatus,
  statusAfterReply,
} from "./partnerMailUtils";

export type ContactLookup = {
  id: number;
  email: string;
  status: string;
  nextFollowUpAt: Date | null;
};

const MAX_BODY_CHARS = 20_000;

// Deliberately selects only columns from the original partner_contacts
// migration, so the do-not-contact safety check keeps working even if a newer
// migration has not been applied yet.
export async function findContactsByEmails(emails: string[]): Promise<Map<string, ContactLookup[]>> {
  const normalized = Array.from(new Set(emails.map(normalizeEmail)));
  const byEmail = new Map<string, ContactLookup[]>();
  if (!normalized.length) return byEmail;

  const list = sql.join(normalized.map((email) => sql`${email}`), sql`, `);
  let rows: ContactLookup[];
  try {
    rows = await db
      .select({
        id: partnerContactsTable.id,
        email: partnerContactsTable.email,
        status: partnerContactsTable.status,
        nextFollowUpAt: partnerContactsTable.nextFollowUpAt,
      })
      .from(partnerContactsTable)
      .where(sql`lower(${partnerContactsTable.email}) in (${list})`);
  } catch (err) {
    // The partner CRM migration has not been applied, so there are no
    // contacts to protect. Any other failure must not be swallowed: this check
    // is what keeps do_not_contact addresses from being emailed.
    const code = (err as { code?: string; cause?: { code?: string } }).code ?? (err as { cause?: { code?: string } }).cause?.code;
    if (code === "42P01") return byEmail;
    throw err;
  }

  for (const row of rows) {
    const key = normalizeEmail(row.email);
    byEmail.set(key, [...(byEmail.get(key) ?? []), row]);
  }
  return byEmail;
}

export async function recordOutboundSend(input: {
  contacts: ContactLookup[];
  email: string;
  letterId: number | null;
  subject: string;
  providerMessageId: string | null;
  hasAttachment: boolean;
  error?: string | null;
}) {
  const now = new Date();
  const failed = Boolean(input.error);

  await db.insert(partnerMessagesTable).values({
    partnerContactId: input.contacts[0]?.id ?? null,
    businessLetterId: input.letterId,
    direction: "outbound",
    email: normalizeEmail(input.email),
    subject: input.subject,
    providerMessageId: input.providerMessageId,
    status: failed ? "failed" : "sent",
    error: input.error ? input.error.slice(0, 500) : null,
    hasAttachment: input.hasAttachment,
    readAt: now,
  });
  if (failed) return;

  for (const contact of input.contacts) {
    await db
      .update(partnerContactsTable)
      .set({ ...followUpAfterSend(contact, now), updatedAt: now })
      .where(eq(partnerContactsTable.id, contact.id));
  }
}

export async function recordInboundReply(input: {
  fromEmail: string;
  subject: string | null;
  bodyText: string | null;
  providerMessageId: string;
}): Promise<{ inserted: boolean; organization: string | null; matched: boolean }> {
  const email = normalizeEmail(input.fromEmail);
  const matches = await db
    .select({
      id: partnerContactsTable.id,
      organization: partnerContactsTable.organization,
      status: partnerContactsTable.status,
    })
    .from(partnerContactsTable)
    .where(sql`lower(${partnerContactsTable.email}) = ${email}`)
    .orderBy(sql`${partnerContactsTable.lastContactedAt} desc nulls last`)
    .limit(5);
  const primary = matches[0] ?? null;

  const [message] = await db
    .insert(partnerMessagesTable)
    .values({
      partnerContactId: primary?.id ?? null,
      direction: "inbound",
      email,
      subject: input.subject?.slice(0, 500) ?? null,
      bodyText: input.bodyText ? input.bodyText.slice(0, MAX_BODY_CHARS) : null,
      providerMessageId: input.providerMessageId,
      status: "received",
    })
    .onConflictDoNothing()
    .returning({ id: partnerMessagesTable.id });

  // Already processed (the webhook was retried): no second notification.
  if (!message) return { inserted: false, organization: primary?.organization ?? null, matched: Boolean(primary) };

  const now = new Date();
  for (const contact of matches) {
    await db
      .update(partnerContactsTable)
      .set({
        status: statusAfterReply(contact.status),
        lastReplyAt: now,
        // The reply itself is the call to action; it supersedes a pending nudge.
        nextFollowUpAt: null,
        updatedAt: now,
      })
      .where(eq(partnerContactsTable.id, contact.id));
  }
  return { inserted: true, organization: primary?.organization ?? null, matched: Boolean(primary) };
}

export async function applyDeliveryEvent(type: string, data: unknown) {
  const outcome = classifyDeliveryEvent(type, data);
  const record = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const emailId = typeof record.email_id === "string" ? record.email_id : null;
  if (!outcome || !emailId) return;

  const [message] = await db
    .select()
    .from(partnerMessagesTable)
    .where(and(eq(partnerMessagesTable.direction, "outbound"), eq(partnerMessagesTable.providerMessageId, emailId)))
    .limit(1);
  // Not one of ours (e.g. a review-request email sent through the same Resend account).
  if (!message) return;

  const now = new Date();
  if (shouldUpdateMessageStatus(message.status, outcome.messageStatus)) {
    await db
      .update(partnerMessagesTable)
      .set({ status: outcome.messageStatus, error: outcome.error, updatedAt: now })
      .where(eq(partnerMessagesTable.id, message.id));
  }

  if (outcome.blockContact) {
    await db
      .update(partnerContactsTable)
      .set({ status: "do_not_contact", nextFollowUpAt: null, updatedAt: now })
      .where(sql`lower(${partnerContactsTable.email}) = ${normalizeEmail(message.email)}`);
  }
}

export async function fetchReceivedEmailBody(emailId: string): Promise<string | null> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  try {
    const response = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { text?: unknown; html?: unknown };
    if (typeof data.text === "string" && data.text.trim()) return data.text.trim();
    if (typeof data.html === "string" && data.html.trim()) return htmlToText(data.html);
    return null;
  } catch (err) {
    logger.error({ err, emailId }, "Failed to fetch received email body from Resend");
    return null;
  }
}

async function notificationRecipient(): Promise<string | null> {
  const configured = process.env.PARTNER_NOTIFY_EMAIL?.trim();
  if (configured) return configured;
  const [row] = await db
    .select({ value: siteContentTable.value })
    .from(siteContentTable)
    .where(eq(siteContentTable.key, "admin_email"))
    .limit(1);
  return row?.value?.trim() || null;
}

// Best effort: a failed notification must never fail the webhook that triggered it.
export async function notifyAdmin(subject: string, text: string) {
  try {
    const key = process.env.RESEND_API_KEY;
    const from = process.env.REVIEW_EMAIL_FROM || process.env.PROPOSAL_EMAIL_FROM;
    const to = await notificationRecipient();
    if (!key || !from || !to) {
      logger.warn("Partner notification skipped: RESEND_API_KEY, sender or recipient is not configured");
      return;
    }
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, text }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) logger.error({ status: response.status }, "Partner notification rejected by Resend");
  } catch (err) {
    logger.error({ err }, "Partner notification failed");
  }
}
