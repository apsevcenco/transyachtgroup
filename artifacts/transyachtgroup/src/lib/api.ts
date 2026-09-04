const API_BASE = import.meta.env.VITE_API_URL || "/api";

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

export type SeoAuditResult = {
  score: number;
  issues: Array<{ code: string; severity: "error" | "warning" | "info"; message: string; points: number }>;
  stats: Record<string, number>;
  cannibalization: Array<{ id: number; title: string; slug: string; similarity: number }>;
};

export type GeneratedGuideDraft = Omit<GuideInput, "slug" | "published"> & { coverImageWarning?: string | null; generationWarning?: string | null; translationWarning?: string | null };

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
  brief: string | null;
  scheduledAt: string | null;
  published: boolean;
  publishedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type NewsInput = Pick<News, "slug" | "title" | "excerpt" | "content" | "coverImage" | "gallery" | "metaTitle" | "metaDescription" | "translations" | "primaryKeyword" | "brief" | "scheduledAt" | "published">;

export type GeneratedNewsDraft = Omit<NewsInput, "coverImage" | "gallery" | "published" | "scheduledAt" | "brief" | "primaryKeyword">;

function getToken(): string | null {
  return localStorage.getItem("admin_token");
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function getLang(): string {
  return localStorage.getItem("tyg_lang") || "en";
}

export async function adminLogin(password: string, otp?: string) {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, otp }),
    });
  } catch {
    throw new Error("Cannot reach API — check your connection");
  }
  if (res.status === 401) throw new Error("Invalid password");
  if (!res.ok)
    throw new Error(`Login failed (${res.status} — check API connection)`);
  const data = await res.json();
  localStorage.setItem("admin_token", data.token);
  return data;
}

export async function adminLogout() {
  await fetch(`${API_BASE}/admin/logout`, {
    method: "POST",
    headers: authHeaders(),
  });
  localStorage.removeItem("admin_token");
}

export async function checkAuth(): Promise<boolean> {
  const token = getToken();
  if (!token) return false;
  try {
    const res = await fetch(`${API_BASE}/admin/check`, {
      headers: authHeaders(),
    });
    const data = await res.json();
    return data.authenticated === true;
  } catch {
    return false;
  }
}

export async function fetchVehicles(
  lang?: string,
  includeHidden?: boolean,
  category?: "car" | "yacht",
) {
  const l = lang || getLang();
  const qs = new URLSearchParams({ lang: l });
  if (category) qs.set("category", category);
  const path = includeHidden ? "/admin/vehicles" : "/vehicles";
  const res = await fetch(`${API_BASE}${path}?${qs}`, {
    headers: includeHidden ? authHeaders() : undefined,
  });
  if (!res.ok) throw new Error("Failed to fetch vehicles");
  return res.json();
}

export async function fetchVehicle(id: number, lang?: string) {
  const l = lang || getLang();
  const res = await fetch(`${API_BASE}/vehicles/${id}?lang=${l}`);
  if (!res.ok) throw new Error("Failed to fetch vehicle");
  return res.json();
}

export async function fetchFeaturedVehicles(lang?: string) {
  const l = lang || getLang();
  const res = await fetch(`${API_BASE}/vehicles/featured?lang=${l}`);
  if (!res.ok) throw new Error("Failed to fetch featured vehicles");
  return res.json();
}

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

export async function fetchGuideSeoOverview(): Promise<Array<Guide & { localMetrics: { views: number; leads: number; clicks: number }; opportunity: string | null }>> {
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

export async function importGuideSearchMetrics(rows: Array<Record<string, unknown>>): Promise<{ updated: number }> {
  const res = await fetch(`${API_BASE}/admin/guides/search-metrics`, { method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify({ rows }) });
  if (!res.ok) throw new Error("Search metrics import failed");
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

export async function createVehicle(data: {
  name: string;
  category: string;
  description: string;
  image: string;
  images?: string[];
  featured?: boolean;
  specs?: Record<string, string>;
  translations?: Record<string, Record<string, string>>;
  ownership?: string;
  agentId?: number | null;
}) {
  const res = await fetch(`${API_BASE}/vehicles`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create vehicle");
  return res.json();
}

export async function updateVehicle(
  id: number,
  data: {
    name: string;
    category: string;
    description: string;
    image: string;
    images?: string[];
    featured?: boolean;
    visible?: boolean;
    specs?: Record<string, string>;
    translations?: Record<string, Record<string, string>>;
    ownership?: string;
    agentId?: number | null;
  },
) {
  const res = await fetch(`${API_BASE}/vehicles/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update vehicle");
  return res.json();
}

export async function deleteVehicle(id: number) {
  const res = await fetch(`${API_BASE}/vehicles/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete vehicle");
  return res.json();
}

export type DeletedVehicle = {
  id: number;
  name: string;
  category: string;
  description: string;
  image: string;
  images: string[] | null;
  deletedAt: string;
  deletedBy: string | null;
};

export type VehicleDeletionLog = {
  id: number;
  vehicleId: number | null;
  vehicleName: string;
  vehicleCategory: string;
  action: "trashed" | "restored" | "permanently_deleted";
  actor: string;
  ipAddress: string | null;
  userAgent: string | null;
  snapshot: Record<string, unknown>;
  createdAt: string;
};

export async function fetchVehicleTrash(): Promise<DeletedVehicle[]> {
  const res = await fetch(`${API_BASE}/admin/vehicles/trash`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to load vehicle trash");
  return res.json();
}

export async function fetchVehicleDeletionLog(): Promise<VehicleDeletionLog[]> {
  const res = await fetch(`${API_BASE}/admin/vehicles/deletion-log`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to load deletion log");
  return res.json();
}

export async function restoreVehicle(id: number) {
  const res = await fetch(`${API_BASE}/admin/vehicles/${id}/restore`, { method: "POST", headers: authHeaders() });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "Failed to restore vehicle");
  return res.json();
}

export async function permanentlyDeleteVehicle(id: number, confirmation: string) {
  const res = await fetch(`${API_BASE}/admin/vehicles/${id}/permanent`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ confirmation }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "Failed to permanently delete vehicle");
  return res.json();
}

export interface Agent {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  createdAt: string;
}

export async function fetchAgents() {
  const res = await fetch(`${API_BASE}/agents`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch agents");
  return res.json() as Promise<Agent[]>;
}

export async function fetchAgent(id: number) {
  const res = await fetch(`${API_BASE}/agents/${id}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch agent");
  return res.json() as Promise<Agent>;
}

export async function createAgent(data: {
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
}) {
  const res = await fetch(`${API_BASE}/agents`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create agent");
  return res.json() as Promise<Agent>;
}

export async function updateAgent(
  id: number,
  data: {
    name: string;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
  },
) {
  const res = await fetch(`${API_BASE}/agents/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update agent");
  return res.json() as Promise<Agent>;
}

export async function deleteAgent(id: number) {
  const res = await fetch(`${API_BASE}/agents/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete agent");
  return res.json();
}

export async function fetchContent(
  lang?: string,
): Promise<Record<string, string>> {
  const l = lang || getLang();
  const res = await fetch(`${API_BASE}/content?lang=${l}`);
  if (!res.ok) throw new Error("Failed to fetch content");
  return res.json();
}

export async function fetchContentAll() {
  const res = await fetch(`${API_BASE}/content/all`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch content");
  return res.json();
}

export async function updateContent(
  key: string,
  value: string,
  translations?: Record<string, string>,
) {
  const res = await fetch(`${API_BASE}/content/${key}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ value, translations }),
  });
  if (!res.ok) throw new Error("Failed to update content");
  return res.json();
}

export async function translateText(
  text: string,
  sourceLang: string,
  targetLangs: string[],
): Promise<Record<string, string>> {
  const res = await fetch(`${API_BASE}/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ text, sourceLang, targetLangs }),
  });
  if (!res.ok) {
    const errData = await res
      .json()
      .catch(() => ({ error: "Translation failed" }));
    throw new Error(errData.error || "Translation failed");
  }
  const data = await res.json();
  return data.translations;
}

export async function submitRequest(data: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  interest?: string;
  message: string;
}) {
  const res = await fetch(`${API_BASE}/requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to submit request");
  return res.json();
}

export async function fetchRequests() {
  const res = await fetch(`${API_BASE}/requests`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch requests");
  return res.json();
}

export async function updateRequest(id: number, data: Record<string, unknown>) {
  const res = await fetch(`${API_BASE}/requests/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update request");
  return res.json();
}

export async function deleteRequest(id: number) {
  const res = await fetch(`${API_BASE}/requests/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete request");
  return res.json();
}

export async function fetchAnalyticsStats(from?: string, to?: string) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const res = await fetch(`${API_BASE}/analytics/stats?${params}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch analytics");
  return res.json();
}

export async function seedData() {
  const res = await fetch(`${API_BASE}/admin/seed`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to seed data");
  return res.json();
}

export interface Booking {
  id: number;
  vehicleId: number;
  startDate: string;
  endDate: string;
  startTime?: string | null;
  endTime?: string | null;
  status: "confirmed" | "tentative" | "blocked" | "maintenance" | "completed";
  clientName?: string | null;
  clientPhone?: string | null;
  clientEmail?: string | null;
  notes?: string | null;
  source?: "manual" | "ical";
  icalUrl?: string | null;
  rentalPeriodType?: "daily" | "monthly";
  totalAmount?: number | null;
  depositAmount?: number | null;
  vatPercent?: number | null;
  agentCommissionPercent?: number | null;
  agentName?: string | null;
  agentPhone?: string | null;
  agentEmail?: string | null;
  contractStatus?: "not_signed" | "sent" | "signed" | null;
  kmIncluded?: number | null;
  pricePerExtraKm?: number | null;
  // Car handover/return tracking — "own" vehicles only
  odometerOut?: number | null;
  odometerIn?: number | null;
  depositStatus?: "received" | "returned" | "partial" | null;
  driverCost?: number | null;
  fuelCost?: number | null;
  tollCost?: number | null;
  deliveryCost?: number | null;
  bookingPhotos?: string[] | null;
  // Yacht-only fields — omitted for car bookings
  departurePort?: string | null;
  returnPort?: string | null;
  charterRate?: number | null;
  charterRatePeriod?: "fixed" | "per_day" | "per_week" | null;
  captainName?: string | null;
  captainDayRate?: number | null;
  stewardessCount?: number | null;
  stewardessDayRate?: number | null;
  deckhandCount?: number | null;
  deckhandDayRate?: number | null;
  apaAmount?: number | null;
  depositPaid?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type BookingInput = Omit<Booking, "id" | "createdAt" | "updatedAt">;

export async function fetchBookings(params?: {
  vehicleId?: number;
  start?: string;
  end?: string;
}) {
  const qs = new URLSearchParams();
  if (params?.vehicleId != null) qs.set("vehicleId", String(params.vehicleId));
  if (params?.start) qs.set("start", params.start);
  if (params?.end) qs.set("end", params.end);
  const res = await fetch(`${API_BASE}/bookings?${qs}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch bookings");
  return res.json() as Promise<Booking[]>;
}

export async function fetchBooking(id: number) {
  const res = await fetch(`${API_BASE}/bookings/${id}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch booking");
  return res.json() as Promise<Booking>;
}

export async function checkAvailability(
  vehicleId: number,
  start: string,
  end: string,
  startTime?: string,
  endTime?: string,
) {
  const qs = new URLSearchParams({ vehicleId: String(vehicleId), start, end });
  if (startTime) qs.set("startTime", startTime);
  if (endTime) qs.set("endTime", endTime);
  const res = await fetch(`${API_BASE}/bookings/availability?${qs}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to check availability");
  return res.json() as Promise<{ available: boolean; conflicts: Booking[] }>;
}

export async function createBooking(data: BookingInput) {
  const res = await fetch(`${API_BASE}/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Failed to create booking");
  }
  return res.json() as Promise<Booking>;
}

export async function uploadPrivateBookingPhoto(file: File): Promise<string> {
  const res = await fetch(`${API_BASE}/bookings/photos`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": file.type },
    body: file,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to upload booking photo");
  }
  const data = await res.json();
  return data.signedUrl;
}

export async function uploadAdminPublicImage(
  file: File,
  scope: "vehicles" | "content-bg" | "content-office" | "guides" | "news" | "proposals",
): Promise<string> {
  const res = await fetch(`${API_BASE}/admin/uploads/public-image`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": file.type, "X-Upload-Scope": scope },
    body: file,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to upload image");
  }
  return (await res.json()).url;
}

export async function deleteAdminPublicImage(url: string): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/uploads/public-image`, {
    method: "DELETE",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to delete image");
  }
}

export async function updateBooking(id: number, data: BookingInput) {
  const res = await fetch(`${API_BASE}/bookings/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Failed to update booking");
  }
  return res.json() as Promise<Booking>;
}

export async function deleteBooking(id: number) {
  const res = await fetch(`${API_BASE}/bookings/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete booking");
  return res.json();
}

export async function syncIcalBookings(vehicleId: number, icalUrl: string) {
  const res = await fetch(`${API_BASE}/bookings/ical-sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ vehicleId, icalUrl }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Failed to sync iCal feed");
  }
  return res.json() as Promise<{
    imported: number;
    vehicleId: number;
    icalUrl: string;
  }>;
}

export interface RentalHistoryRecord {
  id: number;
  bookingId: number | null;
  completedAt: string;
  clientName: string | null;
  clientPhone: string | null;
  clientNotes: string | null;
  vehicleId: number | null;
  vehicleName: string;
  vehicleCategory: string;
  vehicleImage: string | null;
  startDate: string;
  endDate: string;
  totalDays: number;
  rentalPeriodType: "daily" | "monthly";
  totalAmount: number | null;
  depositAmount: number | null;
  vatPercent: number | null;
  agentCommissionPercent: number | null;
  charterRate: number | null;
  charterRatePeriod: string | null;
  apaAmount: number | null;
  captainName: string | null;
  captainDayRate: number | null;
  stewardessCount: number | null;
  stewardessDayRate: number | null;
  deckhandCount: number | null;
  deckhandDayRate: number | null;
  kmIncluded: number | null;
  pricePerExtraKm: number | null;
  departurePort: string | null;
  returnPort: string | null;
  source: string | null;
  icalUrl: string | null;
  contractStatus: string | null;
  driverCost: number | null;
  fuelCost: number | null;
  tollCost: number | null;
  deliveryCost: number | null;
  bookingPhotos: string[] | null;
}

export async function fetchRentalHistory(params?: {
  vehicleId?: number;
  category?: "car" | "yacht";
  start?: string;
  end?: string;
}) {
  const qs = new URLSearchParams();
  if (params?.vehicleId != null) qs.set("vehicleId", String(params.vehicleId));
  if (params?.category) qs.set("category", params.category);
  if (params?.start) qs.set("start", params.start);
  if (params?.end) qs.set("end", params.end);
  const res = await fetch(`${API_BASE}/rental-history?${qs}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch rental history");
  return res.json() as Promise<RentalHistoryRecord[]>;
}

export async function deleteRentalHistory(id: number) {
  const res = await fetch(`${API_BASE}/rental-history/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete rental history record");
  return res.json();
}

export async function downloadVehicleProposal(
  id: number,
  lang?: string,
): Promise<Blob> {
  const l = lang || getLang();
  const res = await fetch(`${API_BASE}/vehicles/${id}/proposal?lang=${l}`, {
    method: "POST",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      data.error || `Failed to generate proposal (${res.status})`,
    );
  }
  return res.blob();
}

export interface AdminProposalContact {
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
}

export interface AdminProposalRentalDates {
  /** ISO date (YYYY-MM-DD) */
  start: string;
  /** ISO date (YYYY-MM-DD) */
  end: string;
  mode: "daily" | "monthly";
  /** Rate per day (daily mode) or per month (monthly mode). */
  rate: number;
  /** Number of days (daily mode) or months (monthly mode). */
  periods: number;
  total: number;
  /** HH:MM pickup time on `start` */
  pickupTime?: string;
  /** HH:MM return time on `end` */
  returnTime?: string;
  pickupLocation?: string;
  returnLocation?: string;
}

export interface AdminProposalTransferDetails {
  from: string;
  to: string;
  /** ISO date (YYYY-MM-DD) */
  date: string;
  /** HH:MM */
  time: string;
  passengers: number;
  price: number;
}

export async function generateAdminProposal(
  id: number,
  opts: {
    lang?: "en" | "ru";
    pricingMode?: "daily" | "monthly" | "transfer";
    template?: "minimal" | "classic" | "premium";
    contact?: AdminProposalContact;
    rentalDates?: AdminProposalRentalDates;
    transferDetails?: AdminProposalTransferDetails;
    whiteLabel?: boolean;
  },
): Promise<Blob> {
  const res = await fetch(`${API_BASE}/admin/vehicles/${id}/proposal`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(opts),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      data.error || `Failed to generate proposal (${res.status})`,
    );
  }
  return res.blob();
}

export interface FleetOfferRequest {
  dateRange: {
    /** ISO date (YYYY-MM-DD) */
    start: string;
    /** ISO date (YYYY-MM-DD) */
    end: string;
    days: number;
    /** HH:MM pickup time on `start` */
    pickupTime?: string;
    /** HH:MM return time on `end` */
    returnTime?: string;
  };
  deliveryLocation?: string;
  collectionLocation?: string;
  /** e.g. "24 hours" */
  validity?: string;
  vehicleIds: number[];
  whiteLabel?: boolean;
}

export async function generateFleetOfferPdf(
  req: FleetOfferRequest,
): Promise<Blob> {
  const res = await fetch(`${API_BASE}/admin/proposals/fleet-offer`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      data.error || `Failed to generate fleet offer (${res.status})`,
    );
  }
  return res.blob();
}

export interface BusinessLetterRequest {
  recipientType: string;
  recipientName?: string;
  language: "en" | "fr" | "ru" | "ro" | "ar";
  topic: string;
  service: string;
  notes?: string;
  imageUrl?: string | null;
  contactName?: string;
  signerRole?: string;
  copy: BusinessLetterCopy;
}

export interface BusinessLetterDraftRequest {
  recipientType: string;
  recipientName?: string;
  language: "en" | "fr" | "ru" | "ro" | "ar";
  topic: string;
  service: string;
  notes?: string;
  contactName?: string;
}

export interface BusinessLetterCopy {
  headline: string;
  subheadline: string;
  greeting: string;
  opening: string;
  valueProposition: string;
  benefits: string[];
  partnerAngle: string;
  callToAction: string;
  signature: string;
}

export interface BusinessLetterRecord {
  id: number;
  title: string;
  recipientType: string;
  recipientName?: string | null;
  language: "en" | "fr" | "ru" | "ro" | "ar";
  topic: string;
  service: string;
  notes?: string | null;
  imageUrl?: string | null;
  signerName?: string | null;
  signerRole?: string | null;
  copy: BusinessLetterCopy;
  lastSentTo?: string | null;
  lastSentAt?: string | null;
  sendError?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export async function generateBusinessLetterDraft(
  req: BusinessLetterDraftRequest,
): Promise<BusinessLetterCopy> {
  const res = await fetch(`${API_BASE}/admin/proposals/business-letter-draft`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      data.error || `Failed to generate business letter draft (${res.status})`,
    );
  }
  return res.json();
}

export async function generateBusinessLetterPdf(
  req: BusinessLetterRequest,
): Promise<Blob> {
  const res = await fetch(`${API_BASE}/admin/proposals/business-letter`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      data.error || `Failed to generate business letter (${res.status})`,
    );
  }
  return res.blob();
}

export async function fetchBusinessLetters(): Promise<BusinessLetterRecord[]> {
  const res = await fetch(`${API_BASE}/admin/proposals/business-letters`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load saved business letters");
  return res.json();
}

export async function saveBusinessLetter(
  req: BusinessLetterRequest & { id?: number; title?: string },
): Promise<BusinessLetterRecord> {
  const res = await fetch(
    `${API_BASE}/admin/proposals/business-letters${req.id ? `/${req.id}` : ""}`,
    {
      method: req.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(req),
    },
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to save business letter");
  }
  return res.json();
}

export async function deleteBusinessLetter(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/proposals/business-letters/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete business letter");
}

export async function sendBusinessLetter(id: number, recipients: string): Promise<BusinessLetterRecord> {
  const res = await fetch(`${API_BASE}/admin/proposals/business-letters/${id}/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ recipients }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to send business letter");
  }
  return res.json();
}

export interface ContractGenerateRequest {
  /** Idempotency key: retries return the exact same issued PDF. */
  requestId: string;
  /** Optional — links the contract to a booking for audit purposes. */
  bookingId?: number | null;
  vehicleId: number;
  renterName: string;
  renterLegalEntity?: string;
  renterDob: string;
  renterPob: string;
  renterNationality: string;
  renterPassport: string;
  renterPassportExpiry: string;
  renterLicence: string;
  renterLicenceExpiry: string;
  renterLicenceIssuedBy: string;
  renterPhone: string;
  renterEmail: string;
  additionalDriverName?: string;
  additionalDriverDob?: string;
  additionalDriverLicence?: string;
  additionalDriverLicenceExpiry?: string;
  additionalDriverLicenceIssuedBy?: string;
  pickupDate: string;
  returnDate: string;
  pickupTime: string;
  returnTime: string;
  pickupLocation: string;
  returnLocation: string;
  totalAmount: number;
  deliveryCost: number;
  depositAmount: number;
  kmPerDay: number;
  extraKmPrice: number;
  /** Present only when replacing an existing saved contract. */
  editContractNumber?: string;
  representativeName: string;
}

export async function generateContract(
  req: ContractGenerateRequest,
): Promise<Blob> {
  const res = await fetch(`${API_BASE}/admin/contracts/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const message = data.error || `Failed to generate contract (${res.status})`;
    throw new Error(data.detail ? `${message}: ${data.detail}` : message);
  }
  return res.blob();
}

export type OneOffContractGenerateRequest = Partial<
  Omit<ContractGenerateRequest, "requestId" | "bookingId" | "editContractNumber">
> & {
  contractNumber?: string;
};

/** Generates a PDF without numbering, registering or saving a contract. */
export async function generateOneOffContract(
  req: OneOffContractGenerateRequest,
): Promise<Blob> {
  const res = await fetch(`${API_BASE}/admin/contracts/generate-once`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const message =
      data.error || `Failed to generate one-off contract (${res.status})`;
    throw new Error(data.detail ? `${message}: ${data.detail}` : message);
  }
  return res.blob();
}

export interface StoredContract {
  contractNumber: string;
  issuedAt: string | null;
  createdAt: string | null;
  pdfSha256: string | null;
  snapshot: {
    renter?: {
      name?: string;
      legalEntity?: string | null;
      dob?: string;
      pob?: string;
      nationality?: string;
      passport?: string;
      passportExpiry?: string;
      licence?: string;
      licenceExpiry?: string;
      licenceIssuedBy?: string;
      phone?: string;
      email?: string;
    };
    additionalDriver?: {
      name?: string;
      dob?: string;
      licence?: string;
      licenceExpiry?: string;
      licenceIssuedBy?: string;
    };
    vehicle?: { name?: string };
    pickupDate?: string;
    returnDate?: string;
    pickupTime?: string;
    returnTime?: string;
    pickupLocation?: string;
    returnLocation?: string;
    totalAmount?: number;
    deliveryCost?: number;
    depositAmount?: number;
    kmPerDay?: number;
    extraKmPrice?: number;
    representativeName?: string;
  } | null;
}

export async function fetchBookingContracts(
  bookingId: number,
): Promise<StoredContract[]> {
  const res = await fetch(`${API_BASE}/admin/contracts/booking/${bookingId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load saved contracts");
  return res.json();
}

export async function downloadStoredContract(
  contractNumber: string,
): Promise<Blob> {
  const res = await fetch(
    `${API_BASE}/admin/contracts/${encodeURIComponent(contractNumber)}/pdf`,
    { headers: authHeaders() },
  );
  if (!res.ok) throw new Error("Failed to download saved contract");
  return res.blob();
}

export type ReviewWorkflow = {
  id: number; bookingId: number | null; clientName: string; clientEmail: string | null;
  clientPhone: string | null; vehicleName: string | null; language: string; channel: string;
  status: string; requestMessage: string | null; reviewUrl: string | null; rating: number | null;
  reviewText: string | null; googleReviewUrl: string | null; replyDraft: string | null;
  showOnSite: boolean; sentAt: string | null; receivedAt: string | null; createdAt: string | null;
  automatic: boolean; whatsappStatus: string; emailStatus: string; deliveryError: string | null; sendAttempts: number;
};
export type ReviewDeliverySettings = { id: number; enabled: boolean; googleReviewUrl: string | null; defaultLanguage: string; sendWhatsapp: boolean; sendEmail: boolean };
export type CompletedBookingForReview = { id: number; clientName: string | null; clientEmail: string | null; clientPhone: string | null; vehicleName: string | null; endDate: string };

async function reviewJson(path: string, init?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...authHeaders(), ...(init?.headers || {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Review operation failed");
  return data;
}
export const fetchReviewWorkflows = (): Promise<ReviewWorkflow[]> => reviewJson("/admin/reviews");
export const fetchCompletedBookingsForReviews = (): Promise<CompletedBookingForReview[]> => reviewJson("/admin/reviews/bookings");
export const createReviewWorkflow = (data: Record<string, unknown>): Promise<ReviewWorkflow> => reviewJson("/admin/reviews", { method: "POST", body: JSON.stringify(data) });
export const updateReviewWorkflow = (id: number, data: Record<string, unknown>): Promise<ReviewWorkflow> => reviewJson(`/admin/reviews/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const generateReviewReply = (id: number): Promise<ReviewWorkflow> => reviewJson(`/admin/reviews/${id}/ai-reply`, { method: "POST" });
export const generateReviewRequestMessage = (id: number, direction = ""): Promise<ReviewWorkflow> => reviewJson(`/admin/reviews/${id}/ai-message`, { method: "POST", body: JSON.stringify({ direction }) });
export const sendReviewRequest = (id: number, channel: "whatsapp" | "email" | "both"): Promise<ReviewWorkflow> => reviewJson(`/admin/reviews/${id}/send`, { method: "POST", body: JSON.stringify({ channel }) });
export const fetchReviewDeliverySettings = (): Promise<ReviewDeliverySettings> => reviewJson("/admin/reviews/settings");
export const saveReviewDeliverySettings = (data: ReviewDeliverySettings): Promise<ReviewDeliverySettings> => reviewJson("/admin/reviews/settings", { method: "PUT", body: JSON.stringify(data) });
export const deleteReviewWorkflow = (id: number): Promise<void> => reviewJson(`/admin/reviews/${id}`, { method: "DELETE" });
export const fetchPublicReviews = async (): Promise<Array<{ id: number; clientName: string; vehicleName: string | null; rating: number; reviewText: string; googleReviewUrl: string | null }>> => {
  const res = await fetch(`${API_BASE}/reviews`); if (!res.ok) return []; return res.json();
};
