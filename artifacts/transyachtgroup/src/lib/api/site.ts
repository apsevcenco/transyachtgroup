import { API_BASE, authHeaders, getLang } from "./core";

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
