import type { Booking } from "@/lib/api";

export interface VehicleLite {
  id: number;
  name: string;
  category: string;
  image: string | null;
  images: string[];
  ownership?: string;
  agentId?: number | null;
  pricePerDay?: number | null;
  pricePerMonth?: number | null;
}

// The admin vehicle form derives `image` from `images[0]` when unset, but not
// every record follows that convention — fall back to `image` alone so the
// photo preview modal isn't empty for vehicles with only a single photo.
export function vehiclePhotos(x: { image?: string | null; images?: unknown }): string[] {
  const imgs = Array.isArray(x.images) ? x.images.filter((i): i is string => !!i) : [];
  if (imgs.length > 0) return imgs;
  return x.image ? [x.image] : [];
}

export const STATUSES: Booking["status"][] = ["confirmed", "tentative", "blocked", "maintenance", "completed"];

export const STATUS_LABELS: Record<Booking["status"], string> = {
  confirmed: "Confirmed",
  tentative: "Tentative",
  blocked: "Blocked",
  maintenance: "Maintenance",
  completed: "Completed",
};

export const STATUS_COLORS: Record<Booking["status"], string> = {
  confirmed: "bg-[hsl(43,67%,55%)]",
  tentative: "bg-blue-500",
  blocked: "bg-red-500/80",
  maintenance: "bg-white/30",
  completed: "bg-green-600/80",
};

export const DAY_W = 32;
export const VEHICLE_COL_W = 220;
export const ROW_H = 48;

export function stripTags(s: string | null | undefined): string {
  return String(s ?? "").replace(/<[^>]*>/g, "").trim();
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function numToStr(n: number | null | undefined): string {
  return n == null ? "" : String(n);
}

export function strToNum(s: string): number | null {
  const trimmed = s.trim();
  if (trimmed === "") return null;
  const n = parseInt(trimmed, 10);
  return isNaN(n) ? null : n;
}

export interface EditTarget {
  booking?: Booking;
  vehicleId: number;
  date?: string;
}
