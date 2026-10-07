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

// Resend allows ~2 requests per second per team. When it answers 429 it says
// how long to wait in the Retry-After header (seconds); without it we back off
// exponentially. Always bounded so one bad response cannot stall a whole send.
export function retryDelayMs(retryAfter: string | null | undefined, attempt: number): number {
  const seconds = retryAfter ? Number(retryAfter) : NaN;
  const base = Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 1_000 * 2 ** attempt;
  return Math.min(Math.max(base, 500), 10_000);
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Plain-text body -> the same minimal HTML wrapper the cover-message emails use.
export function plainTextToEmailHtml(text: string): string {
  return `<div style="font-family:Arial,sans-serif;color:#171717;line-height:1.6;max-width:680px">${escapeHtml(text).replace(/\r?\n/g, "<br/>")}</div>`;
}

export const PARTNER_INTENTS = ["interested", "question", "not_interested", "unsubscribe", "out_of_office", "other", "no_reply"] as const;
export type PartnerIntent = (typeof PARTNER_INTENTS)[number];

// Validates what the model returned instead of trusting it: unknown intents or
// statuses fall back to safe values, and an unusable draft is an error.
export function cleanAssistantResult(
  raw: unknown,
  fallback: { subject: string; status: string },
): { intent: PartnerIntent; summary: string; suggestedStatus: string; subject: string; body: string; language: string } {
  const item = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const text = (key: string, max: number) => (typeof item[key] === "string" ? (item[key] as string).trim().slice(0, max) : "");
  const body = text("body", 6_000);
  if (!body) throw new Error("INVALID_AI_RESPONSE");
  const intent = (PARTNER_INTENTS as readonly string[]).includes(text("intent", 30)) ? (text("intent", 30) as PartnerIntent) : "other";
  return {
    intent,
    summary: text("summary", 500),
    suggestedStatus: isPartnerStatus(item.suggestedStatus) ? item.suggestedStatus : fallback.status,
    subject: text("subject", 200).replace(/^subject\s*:\s*/i, "") || fallback.subject,
    body,
    language: text("language", 8) || "en",
  };
}

// Calendar date and hour in the company's timezone, regardless of where the
// server runs (Render is UTC).
export function parisClock(now: Date): { date: string; hour: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value ?? "";
  return { date: `${part("year")}-${part("month")}-${part("day")}`, hour: Number(part("hour")) };
}

export function digestHourFromEnv(raw: string | undefined): number {
  const hour = Number(raw);
  return raw !== undefined && raw.trim() !== "" && Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : 8;
}

// True once per Paris calendar day, from the configured hour onwards.
export function shouldSendDigest(now: Date, lastSentDate: string | null, digestHour: number): boolean {
  const clock = parisClock(now);
  return clock.hour >= digestHour && clock.date !== lastSentDate;
}

// The languages the site, the letters and the assistant work in.
export const PARTNER_LANGUAGES = ["en", "fr", "ru", "ro", "ar"] as const;
export type PartnerLanguage = (typeof PARTNER_LANGUAGES)[number];

export const PARTNER_LANGUAGE_NAMES: Record<PartnerLanguage, string> = {
  en: "English",
  fr: "French",
  ru: "Russian",
  ro: "Romanian",
  ar: "Arabic",
};

export function normalizeLanguage(value: unknown): PartnerLanguage {
  return typeof value === "string" && (PARTNER_LANGUAGES as readonly string[]).includes(value.trim().toLowerCase())
    ? (value.trim().toLowerCase() as PartnerLanguage)
    : "en";
}

// Each line names the word to reply with, and every one of those words is
// recognised by detectOptOut below — keep the two in step.
const OPT_OUT_FOOTERS: Record<PartnerLanguage, string> = {
  en: "If you would rather not receive further messages from Trans Yacht Group, just reply with “unsubscribe” and we will remove you from our list.",
  fr: "Si vous ne souhaitez plus recevoir de messages de Trans Yacht Group, répondez simplement « désinscription » et nous vous retirerons de notre liste.",
  ru: "Если вы не хотите получать дальнейшие сообщения от Trans Yacht Group, просто ответьте «отписаться», и мы удалим вас из нашего списка.",
  ro: "Dacă nu mai doriți să primiți mesaje de la Trans Yacht Group, răspundeți simplu „dezabonare” și vă vom elimina din lista noastră.",
  ar: "إذا كنت لا ترغب في تلقي مزيد من الرسائل من Trans Yacht Group، يكفي أن ترد بعبارة «إلغاء الاشتراك» وسنزيلك من قائمتنا.",
};

// The message's own language first, then English as a common fallback (French
// for an English letter, which is what the Riviera audience expects).
function optOutLanguages(language: PartnerLanguage): PartnerLanguage[] {
  if (language === "en") return ["en", "fr"];
  return [language, "en"];
}

export function optOutFooterText(language: PartnerLanguage = "en"): string {
  return `\n\n--\n${optOutLanguages(language).map((code) => OPT_OUT_FOOTERS[code]).join("\n")}`;
}

export function optOutFooterHtml(language: PartnerLanguage = "en"): string {
  const lines = optOutLanguages(language)
    .map((code) => `<span dir="${code === "ar" ? "rtl" : "ltr"}" style="display:block">${OPT_OUT_FOOTERS[code]}</span>`)
    .join("");
  return `<div style="font-family:Arial,sans-serif;color:#8a8a8a;font-size:12px;line-height:1.5;max-width:680px;margin:28px 0 0;border-top:1px solid #e5e5e5;padding-top:12px">${lines}</div>`;
}

// Puts the footer inside <body> when the message is a full document.
export function appendHtmlFooter(html: string, footerHtml: string): string {
  const closing = html.search(/<\/body>(?![\s\S]*<\/body>)/i);
  return closing >= 0 ? `${html.slice(0, closing)}${footerHtml}${html.slice(closing)}` : html + footerHtml;
}

// Mail clients (Gmail, Outlook, Apple Mail) show their own "Unsubscribe"
// button from this header; a mailto reply lands in the same inbox as replies.
export function listUnsubscribeHeaders(replyTo: string | undefined): Record<string, string> | undefined {
  const address = extractEmailAddress(replyTo || "");
  return address ? { "List-Unsubscribe": `<mailto:${address}?subject=unsubscribe>` } : undefined;
}

const REPLY_PREFIX = /^(?:(?:re|fwd?|tr|aw|sv)\s*:\s*)+/i;
const OPT_OUT_START = /^\W*(?:please\s+)?(?:unsubscribe|opt[\s-]?out|remove\s+me|d[ée]sabonn\w*|d[ée]sinscri\w*|se\s+d[ée]sabonner|отпи[сш]\w*|dezabon\w*|[إأا]لغاء\s*ال[إا]شتراك)/i;
const OPT_OUT_EXACT = /^\W*(?:stop|remove|unsub|не\s+пишите)\W*$/i;

// Deliberately narrow: only an unmistakable opt-out (the subject our
// List-Unsubscribe link produces, or a short first line like "Unsubscribe" or
// "STOP") blocks a contact automatically. Anything longer or ambiguous is
// left to the owner and the AI assistant, because wrongly blocking a real
// partner is worse than asking a human.
export function detectOptOut(subject: string | null | undefined, body: string | null | undefined): boolean {
  const cleanSubject = (subject || "").replace(REPLY_PREFIX, "").trim();
  if (cleanSubject.length <= 60 && (OPT_OUT_START.test(cleanSubject) || OPT_OUT_EXACT.test(cleanSubject))) return true;
  const firstLine = (body || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith(">"));
  return Boolean(firstLine && firstLine.length <= 80 && (OPT_OUT_START.test(firstLine) || OPT_OUT_EXACT.test(firstLine)));
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
