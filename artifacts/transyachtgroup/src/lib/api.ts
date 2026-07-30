const API_BASE = import.meta.env.VITE_API_URL || "/api";

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

export async function adminLogin(password: string) {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
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
  if (includeHidden) qs.set("all", "true");
  if (category) qs.set("category", category);
  const res = await fetch(`${API_BASE}/vehicles?${qs}`);
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
  status: "confirmed" | "tentative" | "blocked" | "maintenance" | "completed";
  clientName?: string | null;
  clientPhone?: string | null;
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
) {
  const qs = new URLSearchParams({ vehicleId: String(vehicleId), start, end });
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

export interface ContractGenerateRequest {
  /** Idempotency key: retries return the exact same issued PDF. */
  requestId: string;
  /** Optional — links the contract to a booking for audit purposes. */
  bookingId?: number | null;
  vehicleId: number;
  renterName: string;
  renterDob: string;
  renterPob: string;
  renterNationality: string;
  renterPassport: string;
  renterPassportExpiry: string;
  renterLicence: string;
  renterLicenceExpiry: string;
  renterLicenceIssuedBy: string;
  renterPhone: string;
  pickupDate: string;
  returnDate: string;
  pickupLocation: string;
  returnLocation: string;
  totalAmount: number;
  depositAmount: number;
  kmPerDay: number;
  extraKmPrice: number;
  /** Leave blank to auto-generate TYG-DDMMYY-XXX. */
  contractNumber?: string;
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
    throw new Error(
      data.error || `Failed to generate contract (${res.status})`,
    );
  }
  return res.blob();
}
