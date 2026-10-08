import { API_BASE, authHeaders } from "./core";
import type { SeoAuditResult } from "./seo";

export type AnswerFaq = { question: string; answer: string };
export type AnswerTranslation = { question: string; directAnswer: string; explanation: string; faq: AnswerFaq[]; metaTitle: string; metaDescription: string };
export type Answer = {
  id: number;
  slug: string;
  question: string;
  directAnswer: string;
  explanation: string;
  faq: AnswerFaq[];
  metaTitle: string | null;
  metaDescription: string | null;
  primaryKeyword: string | null;
  audience: string | null;
  relatedServicePath: string | null;
  language: string;
  /** Admin only: stored translations. Public responses carry the requested language already applied. */
  translations?: Record<string, AnswerTranslation>;
  /** Public: languages this answer can be served in. */
  availableLanguages?: string[];
  published: boolean;
  publishedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};
export type AnswerInput = Pick<Answer, "slug" | "question" | "directAnswer" | "explanation" | "faq" | "metaTitle" | "metaDescription" | "primaryKeyword" | "audience" | "relatedServicePath" | "language" | "published"> & { translations?: Record<string, AnswerTranslation> };
export type GeneratedAnswerDraft = Omit<AnswerInput, "published" | "language">;
export async function fetchAnswers(lang?: string): Promise<Answer[]> {
  const res = await fetch(`${API_BASE}/answers${lang && lang !== "en" ? `?lang=${encodeURIComponent(lang)}` : ""}`);
  if (!res.ok) throw new Error("Failed to fetch answers");
  return res.json();
}
export async function fetchAnswer(slug: string, lang?: string): Promise<Answer> {
  const res = await fetch(`${API_BASE}/answers/${encodeURIComponent(slug)}${lang && lang !== "en" ? `?lang=${encodeURIComponent(lang)}` : ""}`);
  if (!res.ok) throw new Error(res.status === 404 ? "Answer not found" : "Failed to fetch answer");
  return res.json();
}
export async function fetchAdminAnswers(): Promise<Answer[]> {
  const res = await fetch(`${API_BASE}/admin/answers`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch answers");
  return res.json();
}
export async function generateAnswerWithAi(input: { topic: string; keyword?: string; audience?: string; relatedServicePath?: string }): Promise<GeneratedAnswerDraft> {
  const res = await fetch(`${API_BASE}/admin/answers/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "AI answer generation failed");
  return res.json();
}
export async function auditAnswerSeo(data: AnswerInput): Promise<SeoAuditResult> {
  const res = await fetch(`${API_BASE}/admin/answers/audit`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "Answer SEO audit failed");
  return res.json();
}
export async function fixAnswerSeoWithAi(data: AnswerInput): Promise<{ draft: AnswerInput; audit: SeoAuditResult; unresolvedAutoFixes?: string[] }> {
  const res = await fetch(`${API_BASE}/admin/answers/fix-seo`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "AI answer SEO correction failed");
  return res.json();
}
export async function translateAnswerWithAi(answer: AnswerInput, lang: string): Promise<Record<string, AnswerTranslation>> {
  const res = await fetch(`${API_BASE}/admin/answers/translate-draft`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ answer: { question: answer.question, directAnswer: answer.directAnswer, explanation: answer.explanation, faq: answer.faq, metaTitle: answer.metaTitle, metaDescription: answer.metaDescription }, lang }),
  });
  if (res.status === 401) throw new Error("Your admin session expired; log in again.");
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || `AI translation failed (${res.status})`);
  return (await res.json()).translations;
}
export async function createAnswer(data: AnswerInput): Promise<Answer> {
  const res = await fetch(`${API_BASE}/admin/answers`, { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify(data) });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "Failed to create answer");
  return res.json();
}
export async function updateAnswer(id: number, data: AnswerInput): Promise<Answer> {
  const res = await fetch(`${API_BASE}/admin/answers/${id}`, { method: "PUT", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify(data) });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "Failed to update answer");
  return res.json();
}
export async function deleteAnswer(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/answers/${id}`, { method: "DELETE", headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to delete answer");
}
