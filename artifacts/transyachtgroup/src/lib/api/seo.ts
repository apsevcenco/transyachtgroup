import { API_BASE, authHeaders } from "./core";

export type SeoAuditResult = {
  score: number;
  issues: Array<{ code: string; severity: "error" | "warning" | "info"; message: string; points: number }>;
  stats: Record<string, number>;
  cannibalization: Array<{ id: number; title: string; slug: string; similarity: number }>;
};
export type SeoOverviewRow = {
  id: number | string;
  title: string;
  slug?: string;
  pageType?: string;
  path?: string;
  url?: string;
  contentCluster?: string | null;
  targetPage?: string | null;
  seoScore?: number | null;
  localMetrics: { views: number; leads: number; clicks: number };
  searchMetrics: { clicks?: number; impressions?: number; ctr?: number; position?: number; source?: string; importedAt?: string } | null;
  opportunity: string | null;
};
export async function fetchGuideSeoOverview(): Promise<SeoOverviewRow[]> {
  const res = await fetch(`${API_BASE}/admin/guides/overview`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to load SEO overview");
  return res.json();
}
export type SeoPlanStatus = "planned" | "drafting" | "ready" | "published" | "skipped";
export type SeoPlanItem = { week: number; topic: string; keyword: string; cluster: string; targetPage: string; service: string; city: string; intent: string; reason: string; status: SeoPlanStatus };
export type SeoPlanStrategy = { direction: string; region: string; season: string; priorityServices: string; priorityFleet: string; keywords: string };
export type SeoContentPlan = { id: number; title: string; strategy?: Partial<SeoPlanStrategy> | null; items: SeoPlanItem[]; createdAt: string | null; updatedAt: string | null };
export async function generateGuideSeoPlan(strategy: SeoPlanStrategy): Promise<SeoContentPlan> {
  const res = await fetch(`${API_BASE}/admin/guides/plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ strategy }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "SEO plan generation failed");
  return res.json();
}
export async function fetchGuideSeoPlans(): Promise<SeoContentPlan[]> {
  const res = await fetch(`${API_BASE}/admin/guides/plans`, { headers: authHeaders() });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "Failed to load saved SEO plans");
  return res.json();
}
export async function updateGuideSeoPlanItem(planId: number, itemIndex: number, status: SeoPlanStatus): Promise<SeoContentPlan> {
  const res = await fetch(`${API_BASE}/admin/guides/plans/${planId}/items/${itemIndex}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "Failed to update SEO plan");
  return res.json();
}
export type SeoCompetitor = { id: number; name: string; baseUrl: string; notes: string | null; active: boolean; lastScannedAt: string | null };
export type SeoCompetitorSnapshot = { id: number; competitorId: number; pageUrl: string; title: string | null; h1: string | null; changed: boolean; scannedAt: string | null };
export type SeoOpportunity = { id: number; competitorId: number | null; title: string; rationale: string; keyword: string | null; targetPage: string | null; priority: "high" | "medium" | "low"; status: "new" | "planned" | "ignored"; context: Record<string, unknown>; createdAt: string | null };
export type SeoIntelligence = { competitors: SeoCompetitor[]; snapshots: SeoCompetitorSnapshot[]; opportunities: SeoOpportunity[] };
export async function fetchSeoIntelligence(): Promise<SeoIntelligence> {
  const res = await fetch(`${API_BASE}/admin/seo-intelligence`, { headers: authHeaders() });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "Failed to load SEO intelligence");
  return res.json();
}
export async function createSeoCompetitor(input: { name: string; baseUrl: string; notes?: string }): Promise<SeoCompetitor> {
  const res = await fetch(`${API_BASE}/admin/seo-intelligence/competitors`, { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify(input) });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "Failed to add competitor");
  return res.json();
}
export async function setSeoCompetitorActive(id: number, active: boolean): Promise<SeoCompetitor> {
  const res = await fetch(`${API_BASE}/admin/seo-intelligence/competitors/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify({ active }) });
  if (!res.ok) throw new Error("Failed to update competitor");
  return res.json();
}
export async function scanSeoCompetitor(id: number): Promise<SeoCompetitorSnapshot> {
  const res = await fetch(`${API_BASE}/admin/seo-intelligence/competitors/${id}/scan`, { method: "POST", headers: authHeaders() });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "Competitor scan failed");
  return res.json();
}
export async function analyzeSeoIntelligence(): Promise<SeoOpportunity[]> {
  const res = await fetch(`${API_BASE}/admin/seo-intelligence/analyze`, { method: "POST", headers: authHeaders() });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "SEO intelligence analysis failed");
  return res.json();
}
export async function updateSeoOpportunity(id: number, status: SeoOpportunity["status"]): Promise<SeoOpportunity> {
  const res = await fetch(`${API_BASE}/admin/seo-intelligence/opportunities/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify({ status }) });
  if (!res.ok) throw new Error("Failed to update SEO opportunity");
  return res.json();
}
export async function importGuideSearchMetrics(rows: Array<Record<string, unknown>>, onProgress?: (done: number, total: number) => void): Promise<{ updated: number }> {
  // Batches keep each request small (no 413) and let one slow batch finish before the next starts.
  const unique = [...new Map(rows.map((row) => [String(row.url || ""), row])).values()].filter((row) => row.url);
  let updated = 0;
  for (let start = 0; start < unique.length; start += 200) {
    const res = await fetch(`${API_BASE}/admin/guides/search-metrics`, { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify({ rows: unique.slice(start, start + 200) }) });
    if (!res.ok) {
      const detail = (await res.json().catch(() => null))?.error;
      const reason = res.status === 401 ? "Your admin session expired; log in again." : res.status === 413 ? "The file is too large for one request." : detail || `Server error ${res.status}`;
      throw new Error(`Search metrics import failed after ${updated} rows: ${reason}`);
    }
    updated += (await res.json()).updated || 0;
    onProgress?.(Math.min(start + 200, unique.length), unique.length);
  }
  return { updated };
}
