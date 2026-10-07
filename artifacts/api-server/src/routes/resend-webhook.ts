import { Router, type IRouter, type Request } from "express";

import { logger } from "../lib/logger";
import { verifySvixSignature } from "../lib/svixSignature";
import { extractEmailAddress, htmlToText } from "../lib/partnerMailUtils";
import { applyDeliveryEvent, fetchReceivedEmailBody, notifyAdmin, recordInboundReply } from "../lib/partnerCrm";

const router: IRouter = Router();

const ADMIN_URL = "https://www.transyachtgroup.com/admin/partners";

function header(req: Request, name: string): string | undefined {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

// The outcome goes back in the webhook response body. Resend shows it on each
// delivery, which is the only place to see why an event was not turned into a
// reply when server logs are out of reach. The caller is already authenticated
// by the signature, so addresses in it are not exposed to anyone else.
type ReceivedOutcome = { result: "stored" | "duplicate" | "ignored"; reason?: string; detail?: Record<string, unknown> };

async function handleReceived(data: Record<string, unknown>): Promise<ReceivedOutcome> {
  const emailId = typeof data.email_id === "string" ? data.email_id : null;
  const from = extractEmailAddress(data.from);
  if (!emailId || !from) {
    logger.warn({ hasId: Boolean(emailId) }, "Inbound email event without id or sender, ignored");
    return {
      result: "ignored",
      reason: "missing email_id or an address in 'from'",
      detail: { fields: Object.keys(data), from: data.from ?? null, hasEmailId: Boolean(emailId) },
    };
  }

  // When a dedicated reply address is configured, only mail sent to it is a
  // partner reply — anything else arriving on the domain is not ours to log.
  const replyTo = extractEmailAddress(process.env.PARTNER_REPLY_TO || "");
  if (replyTo) {
    const recipients = (Array.isArray(data.to) ? data.to : []).map((value) => extractEmailAddress(value));
    if (!recipients.includes(replyTo)) {
      logger.warn({ replyTo, recipients }, "Inbound email not addressed to PARTNER_REPLY_TO, ignored");
      return { result: "ignored", reason: "'to' does not include PARTNER_REPLY_TO", detail: { expected: replyTo, received: data.to ?? null } };
    }
  }

  const ourSender = extractEmailAddress(process.env.REVIEW_EMAIL_FROM || process.env.PROPOSAL_EMAIL_FROM || "");
  if (ourSender && from === ourSender) {
    return { result: "ignored", reason: "sent from our own sender address", detail: { from } };
  }

  const subject = typeof data.subject === "string" ? data.subject : null;
  let body =
    typeof data.text === "string" && data.text.trim()
      ? data.text.trim()
      : typeof data.html === "string" && data.html.trim()
        ? htmlToText(data.html)
        : null;
  // The webhook carries metadata only; the body has to be fetched separately.
  if (!body) body = await fetchReceivedEmailBody(emailId);

  const result = await recordInboundReply({ fromEmail: from, subject, bodyText: body, providerMessageId: emailId });
  if (!result.inserted) return { result: "duplicate", reason: "this email id was already processed" };

  const label = result.matched ? result.organization || from : `unknown sender ${from}`;
  await notifyAdmin(
    result.matched ? `Partner reply: ${label}` : `Reply from ${label}`,
    [
      `From: ${from}${result.organization ? ` (${result.organization})` : ""}`,
      `Subject: ${subject || "(no subject)"}`,
      "",
      (body || "(message body not available)").slice(0, 1_000),
      "",
      `Open the Partner CRM: ${ADMIN_URL}`,
    ].join("\n"),
  );
  return { result: "stored", detail: { from, matched: result.matched } };
}

router.post("/webhooks/resend", async (req, res) => {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return void res.status(503).json({ error: "Webhook is not configured" });

  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  const valid =
    rawBody &&
    verifySvixSignature({
      secret,
      id: header(req, "svix-id"),
      timestamp: header(req, "svix-timestamp"),
      signatureHeader: header(req, "svix-signature"),
      body: rawBody,
    });
  if (!valid) return void res.status(401).json({ error: "Invalid signature" });

  const event = req.body as { type?: unknown; data?: unknown };
  const type = typeof event?.type === "string" ? event.type : "";
  const data = event?.data && typeof event.data === "object" ? (event.data as Record<string, unknown>) : {};

  try {
    if (type === "email.received") {
      res.json({ ok: true, type, ...(await handleReceived(data)) });
    } else {
      await applyDeliveryEvent(type, data);
      res.json({ ok: true, type });
    }
  } catch (err) {
    // A 5xx makes Resend retry; processing is idempotent (unique provider id).
    logger.error({ err, type }, "Resend webhook processing failed");
    res.status(500).json({ error: "Failed to process event" });
  }
});

export default router;
