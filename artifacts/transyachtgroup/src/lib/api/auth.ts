import { API_BASE, authHeaders, getToken } from "./core";

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
