import { API_BASE, authHeaders } from "./core";

export interface Booking {
  id: number;
  customerId?: number | null;
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
