import { API_BASE, authHeaders } from "./core";

export type ReviewWorkflow = {
  id: number; bookingId: number | null; clientName: string; clientEmail: string | null;
  clientPhone: string | null; vehicleName: string | null; language: string; channel: string;
  status: string; requestMessage: string | null; reviewUrl: string | null; rating: number | null;
  reviewText: string | null; googleReviewUrl: string | null; replyDraft: string | null;
  showOnSite: boolean; sentAt: string | null; receivedAt: string | null; createdAt: string | null;
  automatic: boolean; whatsappStatus: string; emailStatus: string; deliveryError: string | null; sendAttempts: number;
};
export type ReviewDeliverySettings = { id: number; enabled: boolean; googleReviewUrl: string | null; defaultLanguage: string; sendWhatsapp: boolean; sendEmail: boolean };
export type CompletedBookingForReview = { id: number; clientName: string | null; clientEmail: string | null; clientPhone: string | null; vehicleName: string | null; endDate: string };
async function reviewJson(path: string, init?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...authHeaders(), ...(init?.headers || {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Review operation failed");
  return data;
}
export const fetchReviewWorkflows = (): Promise<ReviewWorkflow[]> => reviewJson("/admin/reviews");
export const fetchCompletedBookingsForReviews = (): Promise<CompletedBookingForReview[]> => reviewJson("/admin/reviews/bookings");
export const createReviewWorkflow = (data: Record<string, unknown>): Promise<ReviewWorkflow> => reviewJson("/admin/reviews", { method: "POST", body: JSON.stringify(data) });
export const updateReviewWorkflow = (id: number, data: Record<string, unknown>): Promise<ReviewWorkflow> => reviewJson(`/admin/reviews/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const generateReviewReply = (id: number): Promise<ReviewWorkflow> => reviewJson(`/admin/reviews/${id}/ai-reply`, { method: "POST" });
export const generateReviewRequestMessage = (id: number, direction = ""): Promise<ReviewWorkflow> => reviewJson(`/admin/reviews/${id}/ai-message`, { method: "POST", body: JSON.stringify({ direction }) });
export const sendReviewRequest = (id: number, channel: "whatsapp" | "email" | "both"): Promise<ReviewWorkflow> => reviewJson(`/admin/reviews/${id}/send`, { method: "POST", body: JSON.stringify({ channel }) });
export const fetchReviewDeliverySettings = (): Promise<ReviewDeliverySettings> => reviewJson("/admin/reviews/settings");
export const saveReviewDeliverySettings = (data: ReviewDeliverySettings): Promise<ReviewDeliverySettings> => reviewJson("/admin/reviews/settings", { method: "PUT", body: JSON.stringify(data) });
export const deleteReviewWorkflow = (id: number): Promise<void> => reviewJson(`/admin/reviews/${id}`, { method: "DELETE" });
export const fetchPublicReviews = async (): Promise<Array<{ id: number; clientName: string; vehicleName: string | null; rating: number; reviewText: string; googleReviewUrl: string | null }>> => {
  const res = await fetch(`${API_BASE}/reviews`); if (!res.ok) return []; return res.json();
};
