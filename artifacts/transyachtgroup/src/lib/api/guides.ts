import { API_BASE, authHeaders, getLang } from "./core";
import type { SeoAuditResult } from "./seo";

export type Guide = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  translations: Record<string, Record<string, string>> | null;
  primaryKeyword: string | null;
  contentCluster: string | null;
  targetPage: string | null;
  scheduledAt: string | null;
  seoScore: number | null;
  seoAudit: SeoAuditResult | null;
  searchMetrics: { clicks?: number; impressions?: number; ctr?: number; position?: number; source?: string; importedAt?: string } | null;
  published: boolean;
  publishedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};
export type GuideInput = Pick<Guide, "slug" | "title" | "excerpt" | "content" | "coverImage" | "metaTitle" | "metaDescription" | "translations" | "primaryKeyword" | "contentCluster" | "targetPage" | "scheduledAt" | "published">;
export type GeneratedGuideDraft = Omit<GuideInput, "slug" | "published"> & { coverImageWarning?: string | null; generationWarning?: string | null; translationWarning?: string | null };
export async function fetchGuides(lang?: string): Promise<Guide[]> {
  const l = lang || getLang();
  const res = await fetch(`${API_BASE}/guides?lang=${encodeURIComponent(l)}`);
  if (!res.ok) throw new Error("Failed to fetch guides");
  return res.json();
}
export async function fetchGuide(slug: string, lang?: string): Promise<Guide> {
  const l = lang || getLang();
  const res = await fetch(`${API_BASE}/guides/${encodeURIComponent(slug)}?lang=${encodeURIComponent(l)}`);
  if (!res.ok) throw new Error(res.status === 404 ? "Guide not found" : "Failed to fetch guide");
  return res.json();
}
export async function fetchAdminGuides(): Promise<Guide[]> {
  const res = await fetch(`${API_BASE}/admin/guides`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch guides");
  return res.json();
}
export async function fetchGuideSeoContext(): Promise<{
  vehicles: Array<{ id: number; name: string; category: string; description: string; specs: Record<string, unknown> }>;
  guides: Array<Pick<Guide, "id" | "title" | "slug" | "primaryKeyword" | "contentCluster" | "targetPage">>;
  corePages: string[];
}> {
  const res = await fetch(`${API_BASE}/admin/guides/context`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to load SEO context");
  return res.json();
}
export async function auditGuideSeo(data: GuideInput, excludeId?: number): Promise<SeoAuditResult> {
  const res = await fetch(`${API_BASE}/admin/guides/audit`, { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify({ ...data, excludeId }) });
  if (!res.ok) throw new Error("SEO audit failed");
  return res.json();
}
export async function fixGuideSeoWithAi(data: GuideInput, excludeId?: number, verifiedNotes?: string): Promise<{ draft: GuideInput; audit: SeoAuditResult; unresolvedAutoFixes?: string[] }> {
  const res = await fetch(`${API_BASE}/admin/guides/fix-seo`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ guide: data, excludeId, verifiedNotes }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "AI SEO correction failed");
  return res.json();
}
export async function refreshGuideWithAi(id: number, context: Record<string, unknown>): Promise<GeneratedGuideDraft> {
  const res = await fetch(`${API_BASE}/admin/guides/${id}/refresh`, { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify(context) });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "AI refresh failed");
  return res.json();
}
export async function generateGuideWithAi(input: {
  topic: string;
  service?: string;
  city?: string;
  keyword?: string;
  audience?: string;
  featuredAssets?: string;
  internalLinks?: string;
  tone?: string;
  wordCount?: number;
  notes?: string;
}): Promise<GeneratedGuideDraft> {
  const res = await fetch(`${API_BASE}/admin/guides/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "AI generation failed");
  return res.json();
}
export async function generateGuideCoverWithAi(input: { title: string; excerpt?: string; service?: string; city?: string }): Promise<string> {
  const res = await fetch(`${API_BASE}/admin/guides/generate-cover`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "AI cover generation failed");
  return (await res.json()).url;
}
export async function translateGuideDraftWithAi(input: {
  title: string;
  excerpt: string;
  content: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  internalLinks?: string;
  excludeId?: number;
}): Promise<Record<string, Record<string, string>>> {
  const res = await fetch(`${API_BASE}/admin/guides/translate-draft`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "AI translation failed");
  return (await res.json()).translations;
}
export async function createGuide(data: GuideInput): Promise<Guide> {
  const res = await fetch(`${API_BASE}/admin/guides`, { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify(data) });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "Failed to create guide");
  return res.json();
}
export async function updateGuide(id: number, data: GuideInput): Promise<Guide> {
  const res = await fetch(`${API_BASE}/admin/guides/${id}`, { method: "PUT", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify(data) });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "Failed to update guide");
  return res.json();
}
export async function deleteGuide(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/guides/${id}`, { method: "DELETE", headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to delete guide");
}
