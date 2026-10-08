import { langFromPathname } from "@/lib/langRoutes";

export const API_BASE = import.meta.env.VITE_API_URL || "/api";
export function getToken(): string | null {
  return localStorage.getItem("admin_token");
}
export function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
// The language comes from the URL prefix (/fr/...); a stored preference never overrides it.
export function getLang(): string {
  return langFromPathname(window.location.pathname);
}
