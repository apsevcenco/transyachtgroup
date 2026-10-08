import { API_BASE, authHeaders } from "./core";

export interface ContractGenerateRequest {
  /** Idempotency key: retries return the exact same issued PDF. */
  requestId: string;
  /** Optional — links the contract to a booking for audit purposes. */
  bookingId?: number | null;
  customerId?: number | null;
  vehicleId: number;
  renterName: string;
  renterLegalEntity?: string;
  renterDob: string;
  renterPob: string;
  renterNationality: string;
  renterPassport: string;
  renterPassportExpiry: string;
  renterLicence: string;
  renterLicenceExpiry: string;
  renterLicenceIssuedBy: string;
  renterPhone: string;
  renterEmail: string;
  additionalDriverName?: string;
  additionalDriverDob?: string;
  additionalDriverLicence?: string;
  additionalDriverLicenceExpiry?: string;
  additionalDriverLicenceIssuedBy?: string;
  pickupDate: string;
  returnDate: string;
  pickupTime: string;
  returnTime: string;
  pickupLocation: string;
  returnLocation: string;
  totalAmount: number;
  deliveryCost: number;
  vatPercent?: number;
  depositAmount: number;
  kmPerDay: number;
  extraKmPrice: number;
  /** Present only when replacing an existing saved contract. */
  editContractNumber?: string;
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
    const message = data.error || `Failed to generate contract (${res.status})`;
    throw new Error(data.detail ? `${message}: ${data.detail}` : message);
  }
  return res.blob();
}
export type OneOffContractGenerateRequest = Partial<
  Omit<ContractGenerateRequest, "requestId" | "bookingId" | "editContractNumber">
> & {
  contractNumber?: string;
};
/** Generates a PDF without numbering, registering or saving a contract. */
export async function generateOneOffContract(
  req: OneOffContractGenerateRequest,
): Promise<Blob> {
  const res = await fetch(`${API_BASE}/admin/contracts/generate-once`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const message =
      data.error || `Failed to generate one-off contract (${res.status})`;
    throw new Error(data.detail ? `${message}: ${data.detail}` : message);
  }
  return res.blob();
}
export interface StoredContract {
  contractNumber: string;
  issuedAt: string | null;
  createdAt: string | null;
  pdfSha256: string | null;
  snapshot: {
    renter?: {
      name?: string;
      legalEntity?: string | null;
      dob?: string;
      pob?: string;
      nationality?: string;
      passport?: string;
      passportExpiry?: string;
      licence?: string;
      licenceExpiry?: string;
      licenceIssuedBy?: string;
      phone?: string;
      email?: string;
    };
    additionalDriver?: {
      name?: string;
      dob?: string;
      licence?: string;
      licenceExpiry?: string;
      licenceIssuedBy?: string;
    };
    vehicle?: { name?: string };
    pickupDate?: string;
    returnDate?: string;
    pickupTime?: string;
    returnTime?: string;
    pickupLocation?: string;
    returnLocation?: string;
    totalAmount?: number;
    deliveryCost?: number;
    vatPercent?: number;
    depositAmount?: number;
    kmPerDay?: number;
    extraKmPrice?: number;
    representativeName?: string;
  } | null;
}
export async function fetchBookingContracts(
  bookingId: number,
): Promise<StoredContract[]> {
  const res = await fetch(`${API_BASE}/admin/contracts/booking/${bookingId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load saved contracts");
  return res.json();
}
export async function downloadStoredContract(
  contractNumber: string,
): Promise<Blob> {
  const res = await fetch(
    `${API_BASE}/admin/contracts/${encodeURIComponent(contractNumber)}/pdf`,
    { headers: authHeaders() },
  );
  if (!res.ok) throw new Error("Failed to download saved contract");
  return res.blob();
}
