import { logger } from "./logger";
import { appendHtmlFooter, listUnsubscribeHeaders, normalizeLanguage, optOutFooterHtml, optOutFooterText, retryDelayMs } from "./partnerMailUtils";

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Resend's default limit is 2 requests/second; stay just under it.
export const MIN_SEND_GAP_MS = 550;
const MAX_RATE_LIMIT_RETRIES = 3;

// Returns a function that resolves once it is safe to start the next send.
// Call it before every send in a loop so a bulk run spreads out instead of
// bursting into 429s.
export function createSendPacer(gapMs = MIN_SEND_GAP_MS) {
  let lastStart = 0;
  return async () => {
    const wait = lastStart + gapMs - Date.now();
    if (wait > 0) await sleep(wait);
    lastStart = Date.now();
  };
}

export type PartnerEmail = {
  to: string[];
  subject: string;
  text: string;
  html: string;
  attachment?: { filename: string; content: string };
  tag: string;
  // Language of the message; the opt-out line follows it. Defaults to English.
  language?: string;
};

// Single place that talks to Resend for partner outreach. Returns Resend's
// message id (needed to match webhook events back to the stored message).
export async function sendPartnerEmail(email: PartnerEmail): Promise<string | null> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.REVIEW_EMAIL_FROM || process.env.PROPOSAL_EMAIL_FROM;
  if (!key || !from) throw new Error("Email delivery is not configured (RESEND_API_KEY / REVIEW_EMAIL_FROM)");

  const replyTo = process.env.PARTNER_REPLY_TO || undefined;
  const language = normalizeLanguage(email.language);
  const body = JSON.stringify({
    from,
    to: email.to,
    // Replies go to the address wired to the Resend inbound webhook, so they
    // land in the Partner CRM instead of an unwatched mailbox.
    reply_to: replyTo,
    subject: email.subject,
    // Every outreach email carries a one-step way to opt out.
    text: email.text + optOutFooterText(language),
    html: appendHtmlFooter(email.html, optOutFooterHtml(language)),
    headers: listUnsubscribeHeaders(replyTo),
    attachments: email.attachment ? [email.attachment] : undefined,
    tags: [{ name: "workflow", value: email.tag }],
  });

  for (let attempt = 0; ; attempt++) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body,
      signal: AbortSignal.timeout(15_000),
    });

    if (response.ok) {
      const data = (await response.json().catch(() => null)) as { id?: unknown } | null;
      return typeof data?.id === "string" ? data.id : null;
    }

    // 429 means the request was rejected before anything was sent, so it is
    // safe to retry. 5xx is deliberately not retried: the message may already
    // have gone out and a retry would deliver it twice.
    if (response.status === 429 && attempt < MAX_RATE_LIMIT_RETRIES) {
      const delay = retryDelayMs(response.headers.get("retry-after"), attempt);
      logger.warn({ attempt: attempt + 1, delay }, "Resend rate limit hit, retrying");
      await sleep(delay);
      continue;
    }

    const detail = (await response.text().catch(() => "")).slice(0, 200);
    throw new Error(`Email provider rejected request (${response.status})${detail ? `: ${detail}` : ""}`);
  }
}
