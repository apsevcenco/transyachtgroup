import { normalizeEmail } from "./partnerMailUtils.ts";

export const IMPORT_CATEGORIES = ["hotel", "concierge", "travel_agency", "luxury_rental"] as const;
export const MAX_IMPORT_ROWS = 400;

export type ImportRow = {
  city: string;
  category: string;
  organization: string;
  email: string;
  phone: string | null;
  contactPerson: string | null;
  notes: string | null;
  sourceStatus: string | null;
  sourceCheckedAt: string | null;
  sourceUrl: string | null;
};

const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

// Same identity as the unique index on partner_contacts
// (lower(email), lower(organization), lower(city), category).
export function importKey(row: { email: string; organization: string; city: string; category: string }): string {
  return [row.email, row.organization, row.city].map((part) => part.trim().toLowerCase()).join("|") + `|${row.category}`;
}

function optionalText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function isoDateOrNull(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : value;
}

export function validateImportRows(input: unknown): {
  rows: ImportRow[];
  invalid: { index: number; reason: string }[];
  duplicatesInFile: number;
} {
  if (!Array.isArray(input)) throw new Error("INVALID_IMPORT");
  const rows: ImportRow[] = [];
  const invalid: { index: number; reason: string }[] = [];
  const seen = new Set<string>();
  let duplicatesInFile = 0;

  input.forEach((raw, index) => {
    const item = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const city = optionalText(item.city, 200);
    const organization = optionalText(item.organization, 300);
    const rawEmail = typeof item.email === "string" ? normalizeEmail(item.email) : "";
    const category = typeof item.category === "string" ? item.category.trim() : "";

    if (!organization) return void invalid.push({ index, reason: "missing organization" });
    if (!city) return void invalid.push({ index, reason: "missing city" });
    if (!rawEmail || rawEmail.length > 254 || !EMAIL_RE.test(rawEmail)) return void invalid.push({ index, reason: "invalid email" });
    if (!(IMPORT_CATEGORIES as readonly string[]).includes(category)) return void invalid.push({ index, reason: "unknown category" });

    const row: ImportRow = {
      city,
      category,
      organization,
      email: rawEmail,
      phone: optionalText(item.phone, 100),
      contactPerson: optionalText(item.contactPerson, 300),
      notes: optionalText(item.notes, 2_000),
      sourceStatus: optionalText(item.sourceStatus, 300),
      sourceCheckedAt: isoDateOrNull(item.sourceCheckedAt),
      sourceUrl: optionalText(item.sourceUrl, 1_000),
    };
    const key = importKey(row);
    if (seen.has(key)) {
      duplicatesInFile += 1;
      return;
    }
    seen.add(key);
    rows.push(row);
  });

  return { rows, invalid, duplicatesInFile };
}
