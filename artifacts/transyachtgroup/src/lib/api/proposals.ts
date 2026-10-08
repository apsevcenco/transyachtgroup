import { API_BASE, authHeaders, getLang } from "./core";

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
export async function translateBusinessLetter(
  id: number,
  language: BusinessLetterRequest["language"],
  source?: BusinessLetterRequest & { id?: number; title?: string },
): Promise<BusinessLetterRecord> {
  const res = await fetch(`${API_BASE}/admin/proposals/business-letters/${id}/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ language, source }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to translate business letter");
  }
  return res.json();
}
export async function sendBusinessLetter(
  id: number,
  recipients: string,
  options?: { subject?: string; coverMessage?: string; attachPdf?: boolean; sendMode?: "body_only" | "cover_with_pdf" },
): Promise<BusinessLetterRecord & { sentCount?: number; failedRecipients?: string[]; skippedRecipients?: string[] }> {
  const res = await fetch(`${API_BASE}/admin/proposals/business-letters/${id}/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ recipients, ...options }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to send business letter");
  }
  return res.json();
}
