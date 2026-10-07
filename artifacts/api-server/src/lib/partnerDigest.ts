import { and, asc, count, desc, eq, isNotNull, isNull, lte, notInArray, sql } from "drizzle-orm";

import { db } from "@workspace/db";
import { appStateTable, partnerContactsTable, partnerMessagesTable } from "@workspace/db/schema";
import { logger } from "./logger";
import { notifyAdmin } from "./partnerCrm";
import { CLOSED_STATUSES, digestHourFromEnv, parisClock, shouldSendDigest } from "./partnerMailUtils";

const DIGEST_KEY = "partner_digest_last_sent";
const ADMIN_URL = "https://www.transyachtgroup.com/admin/partners";
const LIST_LIMIT = 25;
const TICK_MS = 10 * 60 * 1000;

const formatDay = (date: Date | null) =>
  date ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Europe/Paris" }).format(date) : "—";

// Everything that needs the owner's attention, or null when there is nothing.
export async function buildDigest(now = new Date()): Promise<{ subject: string; text: string } | null> {
  const c = partnerContactsTable;
  const m = partnerMessagesTable;
  const dueWhere = and(isNotNull(c.nextFollowUpAt), lte(c.nextFollowUpAt, now), notInArray(c.status, [...CLOSED_STATUSES]));

  const [dueTotal] = await db.select({ n: count() }).from(c).where(dueWhere);
  const due = await db
    .select({ organization: c.organization, city: c.city, email: c.email, status: c.status, nextFollowUpAt: c.nextFollowUpAt })
    .from(c)
    .where(dueWhere)
    .orderBy(asc(c.nextFollowUpAt))
    .limit(LIST_LIMIT);

  const unread = await db
    .select({ organization: c.organization, subject: m.subject, at: m.createdAt })
    .from(m)
    .innerJoin(c, eq(m.partnerContactId, c.id))
    .where(and(eq(m.direction, "inbound"), isNull(m.readAt)))
    .orderBy(desc(m.createdAt))
    .limit(LIST_LIMIT);

  const [unmatched] = await db
    .select({ n: count() })
    .from(m)
    .where(and(eq(m.direction, "inbound"), isNull(m.readAt), isNull(m.partnerContactId)));

  const dueCount = dueTotal?.n ?? 0;
  const unmatchedCount = unmatched?.n ?? 0;
  if (!dueCount && !unread.length && !unmatchedCount) return null;

  const lines = [`Partner CRM — daily summary (${formatDay(now)})`, ""];
  if (dueCount) {
    lines.push(`Follow-ups due: ${dueCount}`);
    for (const row of due) {
      lines.push(` • ${row.organization}, ${row.city} — ${row.email} — due ${formatDay(row.nextFollowUpAt)} — ${row.status.replace(/_/g, " ")}`);
    }
    if (dueCount > due.length) lines.push(` … and ${dueCount - due.length} more`);
    lines.push("");
  }
  if (unread.length) {
    lines.push(`Unread replies: ${unread.length}`);
    for (const row of unread) lines.push(` • ${row.organization} — “${row.subject || "(no subject)"}” — ${formatDay(row.at)}`);
    lines.push("");
  }
  if (unmatchedCount) lines.push(`Replies from unknown senders: ${unmatchedCount}`, "");
  lines.push(`Open the Partner CRM: ${ADMIN_URL}`);

  const parts = [dueCount ? `${dueCount} follow-up${dueCount === 1 ? "" : "s"} due` : "", unread.length + unmatchedCount ? `${unread.length + unmatchedCount} unread repl${unread.length + unmatchedCount === 1 ? "y" : "ies"}` : ""].filter(Boolean);
  return { subject: `Partner CRM: ${parts.join(", ")}`, text: lines.join("\n") };
}

export async function sendPartnerDigest(): Promise<{ sent: boolean; reason?: string }> {
  const digest = await buildDigest();
  if (!digest) return { sent: false, reason: "Nothing to report: no follow-ups due and no unread replies." };
  const sent = await notifyAdmin(digest.subject, digest.text);
  return sent ? { sent: true } : { sent: false, reason: "Email could not be sent. Check RESEND_API_KEY, the sender address and PARTNER_NOTIFY_EMAIL." };
}

// Marks the day as handled; true only for the one caller that wins, so two
// instances (a deploy overlapping the old one) can never both send.
async function claimDay(date: string): Promise<boolean> {
  const claimed = await db
    .insert(appStateTable)
    .values({ key: DIGEST_KEY, value: date })
    .onConflictDoUpdate({ target: appStateTable.key, set: { value: date, updatedAt: new Date() }, setWhere: sql`${appStateTable.value} <> ${date}` })
    .returning({ key: appStateTable.key });
  return claimed.length > 0;
}

export function startPartnerDigestScheduler() {
  if (process.env.PARTNER_DIGEST_ENABLED === "false") return;
  const hour = digestHourFromEnv(process.env.PARTNER_DIGEST_HOUR);
  let warnedMissingTable = false;

  const tick = async () => {
    try {
      const now = new Date();
      const [state] = await db.select({ value: appStateTable.value }).from(appStateTable).where(eq(appStateTable.key, DIGEST_KEY)).limit(1);
      if (!shouldSendDigest(now, state?.value ?? null, hour)) return;
      if (!(await claimDay(parisClock(now).date))) return;
      const result = await sendPartnerDigest();
      logger.info(result, "Partner digest processed");
    } catch (err) {
      const code = (err as { code?: string; cause?: { code?: string } }).code ?? (err as { cause?: { code?: string } }).cause?.code;
      if (code === "42P01") {
        if (!warnedMissingTable) logger.warn("Partner digest disabled until migration 0041_app_state.sql is applied");
        warnedMissingTable = true;
        return;
      }
      logger.error({ err }, "Partner digest check failed");
    }
  };

  setTimeout(() => void tick(), 60_000).unref();
  setInterval(() => void tick(), TICK_MS).unref();
}
