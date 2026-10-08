import { API_BASE, authHeaders } from "./core";

export interface Customer {
  id: number;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  dateOfBirth?: string | null;
  placeOfBirth?: string | null;
  nationality?: string | null;
  passportNumber?: string | null;
  passportExpiry?: string | null;
  driverLicenseNumber?: string | null;
  driverLicenseExpiry?: string | null;
  driverLicenseIssuedBy?: string | null;
  legalEntity?: string | null;
  address?: string | null;
  notes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}
export type CustomerInput = Omit<Customer, "id" | "createdAt" | "updatedAt">;
export async function fetchCustomers(params?: { q?: string; limit?: number }): Promise<Customer[]> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set("q", params.q);
  if (params?.limit) qs.set("limit", String(params.limit));
  const res = await fetch(`${API_BASE}/admin/customers?${qs}`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch customers");
  return res.json();
}
export async function createCustomer(data: CustomerInput): Promise<Customer> {
  const res = await fetch(`${API_BASE}/admin/customers`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "Failed to create customer");
  return res.json();
}
export async function updateCustomer(id: number, data: Partial<CustomerInput>): Promise<Customer> {
  const res = await fetch(`${API_BASE}/admin/customers/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "Failed to update customer");
  return res.json();
}
