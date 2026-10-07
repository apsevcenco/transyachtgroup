// Turns a spreadsheet (already read into a grid of cells) into partner contact
// rows. Pure functions only, so the messy part — guessing which column is
// which — can be checked without a browser.

export type Grid = unknown[][];

export const IMPORT_FIELDS = [
  "city",
  "organization",
  "email",
  "phone",
  "contactPerson",
  "notes",
  "sourceStatus",
  "sourceCheckedAt",
  "sourceUrl",
  "category",
] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];
// Column index per field, -1 when the field is not in the file.
export type ColumnMap = Record<ImportField, number>;

export type ImportRowInput = {
  city: string;
  organization: string;
  email: string;
  phone: string;
  contactPerson: string;
  notes: string;
  sourceStatus: string;
  sourceCheckedAt: string | null;
  sourceUrl: string;
  category: string;
};

export const IMPORT_CATEGORIES = [
  { value: "hotel", label: "Hotels" },
  { value: "concierge", label: "Concierge services" },
  { value: "travel_agency", label: "Travel agencies" },
  { value: "luxury_rental", label: "Luxury rentals" },
] as const;

// Column order of the original Kontakty_5_gorodov.xlsx, used when a file has no
// recognisable header row.
export const DEFAULT_LAYOUT: ColumnMap = {
  city: 0,
  organization: 1,
  email: 2,
  phone: 3,
  contactPerson: 4,
  notes: 5,
  sourceStatus: 6,
  sourceCheckedAt: 7,
  sourceUrl: 8,
  category: -1,
};

const EMAIL_FIND = /[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}/gi;

export function cellText(cell: unknown): string {
  if (cell === null || cell === undefined) return "";
  if (cell instanceof Date) return cell.toISOString().slice(0, 10);
  return String(cell).trim();
}

export function extractEmails(value: unknown): string[] {
  return Array.from(new Set((cellText(value).match(EMAIL_FIND) || []).map((email) => email.toLowerCase())));
}

// First row (within the top of the sheet) that looks like a header: it names an
// email column. -1 when there is none.
export function findHeaderRow(grid: Grid): number {
  for (let index = 0; index < Math.min(grid.length, 12); index++) {
    const hasEmailHeader = (grid[index] || []).some((cell) => {
      const text = cellText(cell);
      return text.length > 0 && text.length < 40 && /e-?mail|courriel|почт/i.test(text);
    });
    if (hasEmailHeader) return index;
  }
  return -1;
}

// Order matters: a header is given to the first field it matches, so the narrow
// patterns (status, checked) must come before the broad "source"/"name" ones.
const FIELD_PATTERNS: [ImportField, RegExp][] = [
  ["email", /e-?mail|courriel|почт/i],
  ["phone", /phone|\bt[ée]l\b|t[ée]l[ée]phone|телефон|^тел\b/i],
  ["city", /\bcity\b|ville|город/i],
  ["sourceCheckedAt", /check|v[ée]rif|date|дат|провер/i],
  ["sourceStatus", /status|statut|статус/i],
  ["sourceUrl", /url|link|lien|source|ссылк|источник|сайт|web/i],
  ["notes", /note|remark|comment|коммент|примеч/i],
  ["contactPerson", /contact|person|role|responsable|контакт|лицо|должност/i],
  ["organization", /organi[sz]|name|\bnom\b|hotel|h[ôo]tel|company|soci[ée]t|название|организац|наименов|отел/i],
  ["category", /categor|cat[ée]gorie|\btype\b|тип|категор/i],
];

export function guessColumns(headerRow: unknown[]): ColumnMap {
  const map: ColumnMap = { city: -1, organization: -1, email: -1, phone: -1, contactPerson: -1, notes: -1, sourceStatus: -1, sourceCheckedAt: -1, sourceUrl: -1, category: -1 };
  headerRow.forEach((cell, column) => {
    const text = cellText(cell);
    if (!text) return;
    const match = FIELD_PATTERNS.find(([field, pattern]) => map[field] === -1 && pattern.test(text));
    if (match) map[match[0]] = column;
  });
  return map;
}

export function guessCategory(value: string): string | null {
  const text = value.toLowerCase();
  if (/concierge|консьерж/.test(text)) return "concierge";
  if (/h[ôo]tel|отел|resort|palace/.test(text)) return "hotel";
  if (/travel|agen|турагент|туроператор|voyage/.test(text)) return "travel_agency";
  if (/rental|rent\b|location|прокат|аренд|car hire|luxury/.test(text)) return "luxury_rental";
  return null;
}

export function toIsoDate(cell: unknown): string | null {
  if (cell instanceof Date) return Number.isNaN(cell.getTime()) ? null : cell.toISOString().slice(0, 10);
  const text = cellText(cell);
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = text.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  return null;
}

// Rows of a sheet -> contacts. A cell with several addresses becomes one
// contact per address, the same way the original seed script did.
export function buildRows(
  grid: Grid,
  map: ColumnMap,
  headerRow: number,
  defaultCategory: string,
): { rows: ImportRowInput[]; skippedNoEmail: number } {
  const cell = (row: unknown[], field: ImportField) => (map[field] >= 0 ? row[map[field]] : undefined);

  let start = headerRow + 1;
  if (headerRow < 0 && map.email >= 0) {
    // No header: skip title rows until the first row that actually has an email.
    const first = grid.findIndex((row) => extractEmails(row?.[map.email]).length > 0);
    start = first < 0 ? grid.length : first;
  }

  const rows: ImportRowInput[] = [];
  let skippedNoEmail = 0;
  for (const row of grid.slice(start)) {
    if (!row || row.every((value) => !cellText(value))) continue;
    const emails = map.email >= 0 ? extractEmails(row[map.email]) : [];
    if (!emails.length) {
      skippedNoEmail += 1;
      continue;
    }
    const category = (map.category >= 0 ? guessCategory(cellText(cell(row, "category"))) : null) || defaultCategory;
    for (const email of emails) {
      rows.push({
        city: cellText(cell(row, "city")),
        organization: cellText(cell(row, "organization")),
        email,
        phone: cellText(cell(row, "phone")),
        contactPerson: cellText(cell(row, "contactPerson")),
        notes: cellText(cell(row, "notes")),
        sourceStatus: cellText(cell(row, "sourceStatus")),
        sourceCheckedAt: toIsoDate(cell(row, "sourceCheckedAt")),
        sourceUrl: cellText(cell(row, "sourceUrl")),
        category,
      });
    }
  }
  return { rows, skippedNoEmail };
}

// Same identity the database uses, so duplicates can be dropped before upload.
export function rowKey(row: Pick<ImportRowInput, "email" | "organization" | "city" | "category">): string {
  return [row.email, row.organization, row.city].map((part) => part.trim().toLowerCase()).join("|") + `|${row.category}`;
}

// Minimal CSV reader: quoted fields, escaped quotes, and the delimiter Excel
// uses in the file's locale (comma, semicolon or tab).
export function parseCsv(input: string): Grid {
  const text = input.replace(/^﻿/, "");
  const firstLine = text.split(/\r?\n/, 1)[0] || "";
  const counts: [string, number][] = [",", ";", "\t"].map((d) => [d, firstLine.split(d).length - 1]);
  const delimiter = counts.sort((a, b) => b[1] - a[1])[0][0];

  const grid: Grid = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      grid.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    grid.push(row);
  }
  return grid;
}
