import { db } from "@workspace/db";
import { customerReviewsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const LANGS = new Set(["en", "fr", "ru", "ro", "ar"]);

export function reviewRequestCopy(name: string, language: string, reviewUrl: string) {
  const first = name.trim().split(/\s+/)[0] || "";
  const copy: Record<string, string> = {
    en: `Hello ${first}, thank you for choosing Trans Yacht Group. If you enjoyed our service, would you share an honest Google review? Your feedback helps other clients find us. ${reviewUrl}`,
    fr: `Bonjour ${first}, merci d'avoir choisi Trans Yacht Group. Si vous avez apprécié notre service, pourriez-vous partager un avis sincère sur Google ? Votre retour aide d'autres clients à nous trouver. ${reviewUrl}`,
    ru: `Здравствуйте, ${first}! Спасибо, что выбрали Trans Yacht Group. Если вам понравился наш сервис, оставьте, пожалуйста, честный отзыв в Google. Ваш отзыв поможет другим клиентам найти нас. ${reviewUrl}`,
    ro: `Bună ${first}, vă mulțumim că ați ales Trans Yacht Group. Dacă v-a plăcut serviciul nostru, ne puteți lăsa o recenzie sinceră pe Google? Opinia dvs. îi ajută pe alți clienți să ne găsească. ${reviewUrl}`,
    ar: `مرحباً ${first}، شكراً لاختياركم Trans Yacht Group. إذا أعجبتكم خدمتنا، نرجو مشاركة تقييم صادق على Google. رأيكم يساعد العملاء الآخرين في العثور علينا. ${reviewUrl}`,
  };
  return copy[LANGS.has(language) ? language : "en"];
}

function normalizedPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15 ? digits : "";
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : "";
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]!);
}

function reviewEmailHtml(message: string) {
  const match = message.match(/https:\/\/[^\s]+/);
  if (!match) return `<p>${escapeHtml(message)}</p>`;
  const reviewUrl = match[0];
  const copy = message.replace(reviewUrl, "").trim();
  const safeUrl = escapeHtml(reviewUrl);
  return `<div style="font-family:Arial,sans-serif;color:#171717;line-height:1.6;max-width:600px">
    <p>${escapeHtml(copy)}</p>
    <p style="margin:28px 0">
      <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#b89b5e;color:#000;text-decoration:none;font-weight:700;padding:13px 22px;border-radius:4px">Leave a Google review</a>
    </p>
    <p style="font-size:12px;color:#666">If the button does not open, use this link:<br><a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="color:#8a6d32;text-decoration:underline">${safeUrl}</a></p>
  </div>`;
}

async function sendEmail(to: string, name: string, message: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.REVIEW_EMAIL_FROM;
  if (!key || !from) throw new Error("Email delivery is not configured (RESEND_API_KEY / REVIEW_EMAIL_FROM)");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Your experience with Trans Yacht Group",
      text: message,
      html: reviewEmailHtml(message),
      tags: [{ name: "workflow", value: "google-review-request" }],
      headers: { "X-Entity-Ref-ID": `review-${Date.now()}-${name.length}` },
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Email provider rejected request (${response.status})`);
}

async function sendWhatsapp(phone: string, name: string, reviewUrl: string, language: string) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const templateName = process.env.WHATSAPP_REVIEW_TEMPLATE_NAME;
  if (!token || !phoneNumberId || !templateName) {
    throw new Error("WhatsApp delivery is not configured (access token, phone number ID or approved template missing)");
  }
  const templateLanguage = process.env.WHATSAPP_REVIEW_TEMPLATE_LANGUAGE || (language === "en" ? "en" : language);
  const response = await fetch(`https://graph.facebook.com/v23.0/${encodeURIComponent(phoneNumberId)}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phone,
      type: "template",
      template: {
        name: templateName,
        language: { code: templateLanguage },
        components: [{ type: "body", parameters: [
          { type: "text", text: name.trim().split(/\s+/)[0] || "Client" },
          { type: "text", text: reviewUrl },
        ] }],
      },
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`WhatsApp provider rejected request (${response.status})`);
}

export async function dispatchReviewRequest(id: number, channels: { whatsapp: boolean; email: boolean }) {
  const [row] = await db.select().from(customerReviewsTable).where(eq(customerReviewsTable.id, id)).limit(1);
  if (!row) throw new Error("Review workflow not found");
  if (!row.reviewUrl || !row.requestMessage) throw new Error("Review link or request message is missing");
  const errors: string[] = [];
  let whatsappStatus = channels.whatsapp ? "failed" : row.whatsappStatus;
  let emailStatus = channels.email ? "failed" : row.emailStatus;

  if (channels.whatsapp) {
    const phone = normalizedPhone(row.clientPhone || "");
    if (!phone) errors.push("WhatsApp: valid client phone is missing");
    else try { await sendWhatsapp(phone, row.clientName, row.reviewUrl, row.language); whatsappStatus = "sent"; }
    catch (error) { errors.push(`WhatsApp: ${error instanceof Error ? error.message : "delivery failed"}`); }
  }
  if (channels.email) {
    const email = validEmail(row.clientEmail || "");
    if (!email) errors.push("Email: valid client email is missing");
    else try { await sendEmail(email, row.clientName, row.requestMessage); emailStatus = "sent"; }
    catch (error) { errors.push(`Email: ${error instanceof Error ? error.message : "delivery failed"}`); }
  }
  const anySent = whatsappStatus === "sent" || emailStatus === "sent";
  const [updated] = await db.update(customerReviewsTable).set({
    whatsappStatus,
    emailStatus,
    status: anySent ? "sent" : "draft",
    sentAt: anySent ? new Date() : row.sentAt,
    deliveryError: errors.join("; ").slice(0, 2000) || null,
    sendAttempts: row.sendAttempts + 1,
    updatedAt: new Date(),
  }).where(eq(customerReviewsTable.id, id)).returning();
  return updated;
}
