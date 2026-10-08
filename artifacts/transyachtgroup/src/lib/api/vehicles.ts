import { API_BASE, authHeaders, getLang } from "./core";

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
