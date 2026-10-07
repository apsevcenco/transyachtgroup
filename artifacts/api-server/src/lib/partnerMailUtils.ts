// Pure helpers for the partner CRM mail flow (no database access, so they can
// be unit-tested in isolation).

export const PARTNER_STATUSES = [
  "new",
  "proposal_sent",
  "replied",
  "interested",
  "not_interested",
  "partner",
  "do_not_contact",
] as const;

// Never email these contacts again.
export const BLOCKED_STATUSES = ["do_not_contact"] as const;

// Nothing left to chase: excluded from the "due follow-ups" list.
export const CLOSED_STATUSES = ["not_interested", "partner", "do_not_contact"] as const;

export const FOLLOW_UP_DAYS = 7;

export function isPartnerStatus(value: unknown): value is (typeof PARTNER_STATUSES)[number] {
  return typeof value === "string" && (PARTNER_STATUSES as readonly string[]).includes(value);
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

// "Jane Doe <jane@hotel.com>" -> "jane@hotel.com"
export function extractEmailAddress(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const bracketed = value.match(/<([^<>\s]+@[^<>\s]+)>/);
  const candidate = (bracketed ? bracketed[1] : value).trim();
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(candidate) ? normalizeEmail(candidate) : null;
}

export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/gi, "&")
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export type DeliveryOutcome = {
  messageStatus: "delivered" | "delayed" | "bounced" | "complained";
  // True when the address should never be emailed again.
  blockContact: boolean;
  error: string | null;
};

// Maps a Resend delivery webhook event to what we store. Only permanent
// bounces and spam complaints block a contact; a transient bounce (mailbox
// full, greylisting) is recorded but the contact stays usable.
export function classifyDeliveryEvent(type: string, data: unknown): DeliveryOutcome | null {
  const record = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  if (type === "email.delivered") return { messageStatus: "delivered", blockContact: false, error: null };
  if (type === "email.delivery_delayed") return { messageStatus: "delayed", blockContact: false, error: null };
  if (type === "email.complained") return { messageStatus: "complained", blockContact: true, error: "Recipient marked the email as spam" };
  if (type === "email.bounced") {
    const bounce = record.bounce && typeof record.bounce === "object" ? (record.bounce as Record<string, unknown>) : {};
    const bounceType = typeof bounce.type === "string" ? bounce.type : "";
    const message = typeof bounce.message === "string" ? bounce.message : "";
    const permanent = /permanent|hard/i.test(bounceType);
    return {
      messageStatus: "bounced",
      blockContact: permanent,
      error: [bounceType, message].filter(Boolean).join(": ") || "Email bounced",
    };
  }
  return null;
}

// A late "delivered" must not overwrite a bounce, and so on.
const STATUS_RANK: Record<string, number> = { queued: 0, sent: 1, delayed: 2, delivered: 3, bounced: 4, complained: 5 };

export function shouldUpdateMessageStatus(current: string, next: string): boolean {
  return (STATUS_RANK[next] ?? 0) > (STATUS_RANK[current] ?? 0);
}

export function addDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}

// What to store on a contact after we email it.
export function followUpAfterSend(contact: { status: string; nextFollowUpAt: Date | null }, now: Date) {
  const closed = (CLOSED_STATUSES as readonly string[]).includes(contact.status);
  const status = contact.status === "new" ? "proposal_sent" : contact.status;
  // Schedule a nudge unless one is already pending in the future.
  const needsNewFollowUp = !closed && (!contact.nextFollowUpAt || contact.nextFollowUpAt.getTime() <= now.getTime());
  return {
    status,
    lastContactedAt: now,
    nextFollowUpAt: needsNewFollowUp ? addDays(now, FOLLOW_UP_DAYS) : contact.nextFollowUpAt,
  };
}

// What to store on a contact when it replies.
export function statusAfterReply(current: string): string {
  return current === "new" || current === "proposal_sent" ? "replied" : current;
}
