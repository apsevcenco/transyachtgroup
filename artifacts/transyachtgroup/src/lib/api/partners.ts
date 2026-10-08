import { API_BASE, authHeaders } from "./core";

export interface PartnerContact {
  id: number;
  city: string;
  category: string;
  organization: string;
  email: string;
  phone?: string | null;
  contactPerson?: string | null;
  notes?: string | null;
  sourceStatus?: string | null;
  sourceCheckedAt?: string | null;
  sourceUrl?: string | null;
  status: string;
  lastContactedAt?: string | null;
  nextFollowUpAt?: string | null;
  lastReplyAt?: string | null;
  unreadCount?: number;
  tags: string[];
  createdAt?: string | null;
  updatedAt?: string | null;
}
export type PartnerContactInput = Omit<PartnerContact, "id" | "createdAt" | "updatedAt" | "lastReplyAt" | "unreadCount">;
export interface PartnerMessage {
  id: number;
  partnerContactId: number | null;
  businessLetterId: number | null;
  direction: "outbound" | "inbound";
  email: string;
  subject: string | null;
  bodyText: string | null;
  status: string;
  error: string | null;
  hasAttachment: boolean;
  readAt: string | null;
  createdAt: string;
}
export interface PartnerSummary {
  dueFollowUps: number;
  unreadReplies: number;
  unmatchedReplies: number;
}
export async function sendPartnerDigestNow(): Promise<{ sent: boolean; reason?: string }> {
  const res = await fetch(`${API_BASE}/admin/partner-contacts/digest`, { method: "POST", headers: authHeaders() });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "Failed to send the summary");
  return res.json();
}
export interface PartnerImportResult {
  received: number;
  valid: number;
  invalid: { index: number; reason: string }[];
  invalidCount: number;
  duplicatesInFile: number;
  alreadyInCrm: number;
  willImport?: number;
  inserted?: number;
}
export async function importPartnerContacts(
  rows: Array<Record<string, string | null>>,
  dryRun: boolean,
): Promise<PartnerImportResult> {
  const res = await fetch(`${API_BASE}/admin/partner-contacts/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ rows, dryRun }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "Import failed");
  return res.json();
}
export type PartnerIntent = "interested" | "question" | "not_interested" | "unsubscribe" | "out_of_office" | "other" | "no_reply";
export interface PartnerAssistDraft {
  mode: "reply" | "follow_up";
  intent: PartnerIntent;
  summary: string;
  suggestedStatus: string;
  subject: string;
  body: string;
  language: string;
}
export async function assistPartnerContact(
  contactId: number,
  input: { mode: "reply" | "follow_up"; instructions?: string; language?: string },
): Promise<PartnerAssistDraft> {
  const res = await fetch(`${API_BASE}/admin/partner-contacts/${contactId}/ai-assist`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "AI assistant failed");
  return res.json();
}
export async function sendPartnerMessage(contactId: number, input: { subject: string; body: string; language?: string }): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/partner-contacts/${contactId}/send-message`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "Failed to send message");
}
export async function fetchPartnerSummary(): Promise<PartnerSummary> {
  const res = await fetch(`${API_BASE}/admin/partner-contacts/summary`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch partner summary");
  return res.json();
}
export async function fetchPartnerMessages(contactId: number): Promise<PartnerMessage[]> {
  const res = await fetch(`${API_BASE}/admin/partner-contacts/${contactId}/messages`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch message history");
  return res.json();
}
export async function markPartnerMessagesRead(contactId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/partner-contacts/${contactId}/messages/read`, { method: "POST", headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to mark messages read");
}
export async function fetchUnmatchedPartnerMessages(): Promise<PartnerMessage[]> {
  const res = await fetch(`${API_BASE}/admin/partner-messages/unmatched`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch unmatched replies");
  return res.json();
}
export async function markPartnerMessageRead(messageId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/partner-messages/${messageId}/read`, { method: "POST", headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to mark message read");
}
export async function fetchPartnerContacts(params?: { q?: string; city?: string; category?: string; status?: string; view?: "due" | "unread"; limit?: number }): Promise<PartnerContact[]> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set("q", params.q);
  if (params?.city) qs.set("city", params.city);
  if (params?.category) qs.set("category", params.category);
  if (params?.status) qs.set("status", params.status);
  if (params?.view) qs.set("view", params.view);
  if (params?.limit) qs.set("limit", String(params.limit));
  const res = await fetch(`${API_BASE}/admin/partner-contacts?${qs}`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch partner contacts");
  return res.json();
}
export async function createPartnerContact(data: PartnerContactInput): Promise<PartnerContact> {
  const res = await fetch(`${API_BASE}/admin/partner-contacts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "Failed to create partner contact");
  return res.json();
}
export async function updatePartnerContact(id: number, data: Partial<PartnerContactInput>): Promise<PartnerContact> {
  const res = await fetch(`${API_BASE}/admin/partner-contacts/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "Failed to update partner contact");
  return res.json();
}
export async function deletePartnerContact(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/partner-contacts/${id}`, { method: "DELETE", headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to delete partner contact");
}
