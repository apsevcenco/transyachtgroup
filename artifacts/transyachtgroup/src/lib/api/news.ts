import { API_BASE, authHeaders, getLang } from "./core";
import type { SeoAuditResult } from "./seo";

export type News = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage: string | null;
  gallery: string[];
  metaTitle: string | null;
  metaDescription: string | null;
  translations: Record<string, Record<string, string>> | null;
  primaryKeyword: string | null;
  contentCluster: string | null;
  targetPage: string | null;
  brief: string | null;
  scheduledAt: string | null;
  seoScore: number | null;
  seoAudit: SeoAuditResult | null;
  searchMetrics: { clicks?: number; impressions?: number; ctr?: number; position?: number; source?: string; importedAt?: string } | null;
  published: boolean;
  publishedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};
export type NewsInput = Pick<News, "slug" | "title" | "excerpt" | "content" | "coverImage" | "gallery" | "metaTitle" | "metaDescription" | "translations" | "primaryKeyword" | "contentCluster" | "targetPage" | "brief" | "scheduledAt" | "published">;
export type GeneratedNewsDraft = Omit<NewsInput, "coverImage" | "gallery" | "published" | "scheduledAt" | "brief" | "primaryKeyword">;
export async function fetchNews(lang?: string): Promise<News[]> {
  const l = lang || getLang();
  const res = await fetch(`${API_BASE}/news?lang=${encodeURIComponent(l)}`);
  if (!res.ok) throw new Error("Failed to fetch news");
  return res.json();
}
export async function fetchNewsItem(slug: string, lang?: string): Promise<News> {
  const l = lang || getLang();
  const res = await fetch(`${API_BASE}/news/${encodeURIComponent(slug)}?lang=${encodeURIComponent(l)}`);
  if (!res.ok) throw new Error(res.status === 404 ? "News not found" : "Failed to fetch news");
  return res.json();
}
export async function fetchAdminNews(): Promise<News[]> {
  const res = await fetch(`${API_BASE}/admin/news`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch news");
  return res.json();
}
export async function generateNewsWithAi(input: { topic: string; keyword?: string; brief?: string; wordCount?: number }): Promise<GeneratedNewsDraft> {
  const res = await fetch(`${API_BASE}/admin/news/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "AI news generation failed");
  return res.json();
}
export async function translateNewsDraftWithAi(input: {
  title: string;
  excerpt: string;
  content: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
}): Promise<Record<string, Record<string, string>>> {
  const res = await fetch(`${API_BASE}/admin/news/translate-draft`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "AI news translation failed");
  return (await res.json()).translations;
}
export async function auditNewsSeo(data: NewsInput, excludeId?: number): Promise<SeoAuditResult> {
  const res = await fetch(`${API_BASE}/admin/news/audit`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ ...data, excludeId }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "News SEO audit failed");
  return res.json();
}
export async function fixNewsSeoWithAi(data: NewsInput, excludeId?: number): Promise<{ draft: NewsInput; audit: SeoAuditResult; unresolvedAutoFixes?: string[] }> {
  const res = await fetch(`${API_BASE}/admin/news/fix-seo`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ news: data, excludeId }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "AI news SEO correction failed");
  return res.json();
}
export async function createNews(data: NewsInput): Promise<News> {
  const res = await fetch(`${API_BASE}/admin/news`, { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify(data) });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "Failed to create news");
  return res.json();
}
export async function updateNews(id: number, data: NewsInput): Promise<News> {
  const res = await fetch(`${API_BASE}/admin/news/${id}`, { method: "PUT", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify(data) });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "Failed to update news");
  return res.json();
}
export async function deleteNews(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/news/${id}`, { method: "DELETE", headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to delete news");
}
