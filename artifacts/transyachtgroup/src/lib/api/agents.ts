import { API_BASE, authHeaders } from "./core";

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
