import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { bookingsTable, customerReviewsTable, vehiclesTable } from "@workspace/db/schema";
import { desc, eq } from "drizzle-orm";
import { adminAuth } from "../middleware/auth";

const router: IRouter = Router();
const LANGS = new Set(["en", "fr", "ru", "ro", "ar"]);
const STATUSES = new Set(["draft", "sent", "received", "replied"]);
const CHANNELS = new Set(["whatsapp", "email", "copy"]);

function cleanText(value: unknown, max = 4000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function safeHttpUrl(value: unknown) {
  const raw = cleanText(value, 1000);
  if (!raw) return "";
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.toString() : "";
  } catch { return ""; }
}

function requestCopy(name: string, language: string, reviewUrl: string) {
  const first = name.split(/\s+/)[0] || "";
  const copy: Record<string, string> = {
    en: `Hello ${first}, thank you for choosing Trans Yacht Group. If you enjoyed our service, would you share an honest Google review? Your feedback helps other clients find us. ${reviewUrl}`,
    fr: `Bonjour ${first}, merci d'avoir choisi Trans Yacht Group. Si vous avez apprécié notre service, pourriez-vous partager un avis sincère sur Google ? Votre retour aide d'autres clients à nous trouver. ${reviewUrl}`,
    ru: `Здравствуйте, ${first}! Спасибо, что выбрали Trans Yacht Group. Если вам понравился наш сервис, оставьте, пожалуйста, честный отзыв в Google. Ваш отзыв поможет другим клиентам найти нас. ${reviewUrl}`,
    ro: `Bună ${first}, vă mulțumim că ați ales Trans Yacht Group. Dacă v-a plăcut serviciul nostru, ne puteți lăsa o recenzie sinceră pe Google? Opinia dvs. îi ajută pe alți clienți să ne găsească. ${reviewUrl}`,
    ar: `مرحباً ${first}، شكراً لاختياركم Trans Yacht Group. إذا أعجبتكم خدمتنا، نرجو مشاركة تقييم صادق على Google. رأيكم يساعد العملاء الآخرين في العثور علينا. ${reviewUrl}`,
  };
  return copy[language] || copy.en;
}

router.get("/reviews", async (_req, res) => {
  const rows = await db.select({ id: customerReviewsTable.id, clientName: customerReviewsTable.clientName, vehicleName: customerReviewsTable.vehicleName, rating: customerReviewsTable.rating, reviewText: customerReviewsTable.reviewText, googleReviewUrl: customerReviewsTable.googleReviewUrl, receivedAt: customerReviewsTable.receivedAt })
    .from(customerReviewsTable).where(eq(customerReviewsTable.showOnSite, true)).orderBy(desc(customerReviewsTable.receivedAt));
  res.json(rows.filter((r) => r.reviewText && r.rating));
});

router.get("/admin/reviews", adminAuth, async (_req, res) => {
  res.json(await db.select().from(customerReviewsTable).orderBy(desc(customerReviewsTable.createdAt)));
});

router.get("/admin/reviews/bookings", adminAuth, async (_req, res) => {
  const rows = await db.select({ id: bookingsTable.id, clientName: bookingsTable.clientName, clientEmail: bookingsTable.clientEmail, clientPhone: bookingsTable.clientPhone, vehicleName: vehiclesTable.name, endDate: bookingsTable.endDate })
    .from(bookingsTable).leftJoin(vehiclesTable, eq(bookingsTable.vehicleId, vehiclesTable.id)).where(eq(bookingsTable.status, "completed")).orderBy(desc(bookingsTable.endDate));
  res.json(rows);
});

router.post("/admin/reviews", adminAuth, async (req, res) => {
  const bookingId = Number(req.body?.bookingId);
  const language = LANGS.has(req.body?.language) ? req.body.language : "en";
  const channel = CHANNELS.has(req.body?.channel) ? req.body.channel : "whatsapp";
  const reviewUrl = safeHttpUrl(req.body?.reviewUrl);
  if (!reviewUrl) return void res.status(400).json({ error: "A valid HTTPS Google review link is required" });
  const [booking] = Number.isInteger(bookingId) ? await db.select({ id: bookingsTable.id, clientName: bookingsTable.clientName, clientEmail: bookingsTable.clientEmail, clientPhone: bookingsTable.clientPhone, vehicleName: vehiclesTable.name }).from(bookingsTable).leftJoin(vehiclesTable, eq(bookingsTable.vehicleId, vehiclesTable.id)).where(eq(bookingsTable.id, bookingId)).limit(1) : [];
  const clientName = cleanText(req.body?.clientName || booking?.clientName, 200);
  if (!clientName) return void res.status(400).json({ error: "Client name is required" });
  const [created] = await db.insert(customerReviewsTable).values({ bookingId: booking?.id || null, clientName, clientEmail: cleanText(req.body?.clientEmail || booking?.clientEmail, 320) || null, clientPhone: cleanText(req.body?.clientPhone || booking?.clientPhone, 80) || null, vehicleName: cleanText(req.body?.vehicleName || booking?.vehicleName, 200) || null, language, channel, reviewUrl, requestMessage: requestCopy(clientName, language, reviewUrl) }).returning();
  res.status(201).json(created);
});

router.patch("/admin/reviews/:id", adminAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return void res.status(400).json({ error: "Invalid ID" });
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (STATUSES.has(req.body?.status)) patch.status = req.body.status;
  if (typeof req.body?.showOnSite === "boolean") patch.showOnSite = req.body.showOnSite;
  if (req.body?.rating !== undefined) patch.rating = Math.max(1, Math.min(5, Number(req.body.rating))) || null;
  if (req.body?.reviewText !== undefined) patch.reviewText = cleanText(req.body.reviewText, 8000) || null;
  if (req.body?.googleReviewUrl !== undefined) patch.googleReviewUrl = safeHttpUrl(req.body.googleReviewUrl) || null;
  if (req.body?.replyDraft !== undefined) patch.replyDraft = cleanText(req.body.replyDraft, 4000) || null;
  if (req.body?.status === "sent") patch.sentAt = new Date();
  if (req.body?.status === "received") patch.receivedAt = new Date();
  if (req.body?.status === "replied") patch.replyPublishedAt = new Date();
  const [updated] = await db.update(customerReviewsTable).set(patch).where(eq(customerReviewsTable.id, id)).returning();
  if (!updated) return void res.status(404).json({ error: "Review workflow not found" });
  res.json(updated);
});

router.post("/admin/reviews/:id/ai-reply", adminAuth, async (req, res) => {
  const id = Number(req.params.id);
  const [row] = await db.select().from(customerReviewsTable).where(eq(customerReviewsTable.id, id)).limit(1);
  if (!row?.reviewText) return void res.status(400).json({ error: "Add the customer's real review first" });
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (!apiKey) return void res.status(503).json({ error: "OpenAI is not configured on the server" });
  const baseUrl = (process.env.OPENAI_BASE_URL || process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/chat/completions`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ model: process.env.OPENAI_CONTENT_MODEL || "gpt-4o-mini", max_tokens: 250, messages: [{ role: "system", content: "Write a warm, concise public reply from Trans Yacht Group to a genuine customer review. Reply in the same language. Do not invent facts, discounts or promises. Return only the reply text." }, { role: "user", content: row.reviewText.slice(0, 4000) }] }) });
  if (!response.ok) return void res.status(502).json({ error: "OpenAI reply generation failed" });
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const replyDraft = cleanText(data.choices?.[0]?.message?.content, 4000);
  const [updated] = await db.update(customerReviewsTable).set({ replyDraft, updatedAt: new Date() }).where(eq(customerReviewsTable.id, id)).returning();
  res.json(updated);
});

router.delete("/admin/reviews/:id", adminAuth, async (req, res) => {
  await db.delete(customerReviewsTable).where(eq(customerReviewsTable.id, Number(req.params.id)));
  res.json({ success: true });
});

export default router;
