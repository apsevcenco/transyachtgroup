/**
 * Generates artifacts/api-server/src/documents/builders/proposal.ts
 * with the site logo pre-embedded as a base64 data URI.
 *
 * Run: node scripts/gen-proposal-builder.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const LOGO_PATH = path.join(ROOT, "artifacts/transyachtgroup/public/images/logo-transparent.png");
const OUT = path.join(ROOT, "artifacts/api-server/src/documents/builders/proposal.ts");

const logoB64 = fs.readFileSync(LOGO_PATH).toString("base64");
const LOGO_DATA_URI = `data:image/png;base64,${logoB64}`;

const src = `/**
 * Proposal document builder for TransYachtGroup.
 *
 * Accepts a vehicle record (same shape as GET /api/vehicles/:id) and an
 * optional set of validated photo URLs, and produces a DocumentModel that
 * the adaptive PDF engine renders into a 3-body-page PDF:
 *
 *   Cover  — full-bleed hero photo + logo + name + key stats
 *   Page 1 — specification grid (all available spec fields)
 *   Page 2 — photo gallery
 *   Page 3 — contact block
 *
 * AUTO-GENERATED in part — run scripts/gen-proposal-builder.mjs to refresh
 * the embedded logo whenever public/images/logo-transparent.png changes.
 */
import type { ContentNode, DocumentModel } from "../model/types";
import type { DocumentTemplate, ExportSettings } from "../documentTypes";
import { getTheme } from "../core/theme";

// ─── types ───────────────────────────────────────────────────────────────────

/** Vehicle as returned by GET /api/vehicles/:id */
export interface VehicleRecord {
  id: number;
  name: string;
  category: string;
  description: string;
  image: string;
  images: string[];
  featured?: boolean;
  visible?: boolean;
  specs: Record<string, string>;
  translations?: Record<string, Record<string, unknown>>;
  createdAt?: string;
}

export interface ProposalContact {
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
}

export interface BuildProposalInput {
  vehicle: VehicleRecord;
  /** Validated, reachable https photo URLs (pre-probed by generateDocument). */
  photos: string[];
  settings?: ExportSettings;
  template?: DocumentTemplate;
  /** Override contact details (fetched from CMS by the route layer). */
  contact?: ProposalContact;
}

// ─── i18n ────────────────────────────────────────────────────────────────────

type Lang = "en" | "ru";

const LABELS: Record<Lang, Record<string, string>> = {
  en: {
    eyebrow: "TRANSYACHTGROUP",
    generatedLabel: "Proposal",
    specifications: "Specifications",
    gallery: "Photo Gallery",
    contact: "Contact Us",
    contactDesc:
      "Our concierge team is available to arrange your experience. We respond with utmost discretion within 2 hours.",
    phone: "Phone",
    whatsapp: "WhatsApp",
    email: "Email",
    website: "Website",
    pricePerDay: "Price / Day",
    pricePerWeek: "Price / Week",
    length: "Length",
    beam: "Beam",
    draft: "Draft",
    cabins: "Cabins",
    guests: "Guests",
    crew: "Crew",
    cruisingSpeed: "Cruising Speed",
    maxSpeed: "Max Speed",
    fuelCapacity: "Fuel Capacity",
    waterCapacity: "Water Capacity",
    yearBuilt: "Year Built",
    builder: "Builder",
  },
  ru: {
    eyebrow: "TRANSYACHTGROUP",
    generatedLabel: "Коммерческое предложение",
    specifications: "Характеристики",
    gallery: "Фотогалерея",
    contact: "Связаться с нами",
    contactDesc:
      "Наша команда консьержей готова организовать ваш отдых. Отвечаем с полной конфиденциальностью в течение 2 часов.",
    phone: "Телефон",
    whatsapp: "WhatsApp",
    email: "Эл. почта",
    website: "Веб-сайт",
    pricePerDay: "Цена / день",
    pricePerWeek: "Цена / неделя",
    length: "Длина",
    beam: "Ширина",
    draft: "Осадка",
    cabins: "Каюты",
    guests: "Гостей",
    crew: "Экипаж",
    cruisingSpeed: "Крейсерская скорость",
    maxSpeed: "Максимальная скорость",
    fuelCapacity: "Запас топлива",
    waterCapacity: "Запас воды",
    yearBuilt: "Год постройки",
    builder: "Верфь",
  },
};

// Ordered spec keys — controls display order in the spec grid.
// fullDescription and unitSystem are excluded (handled separately).
const SPEC_KEYS: string[] = [
  "yearBuilt",
  "builder",
  "length",
  "beam",
  "draft",
  "cabins",
  "guests",
  "crew",
  "cruisingSpeed",
  "maxSpeed",
  "fuelCapacity",
  "waterCapacity",
  "pricePerDay",
  "pricePerWeek",
];

const DEFAULT_CONTACT: ProposalContact = {
  phone: "+41 79 000 00 00",
  whatsapp: "+41 79 000 00 00",
  email: "info@transyachtgroup.com",
  website: "www.transyachtgroup.com",
};

// Pre-embedded logo — regenerate with: node scripts/gen-proposal-builder.mjs
const LOGO_DATA_URI =
  "${LOGO_DATA_URI}";

// ─── builder ─────────────────────────────────────────────────────────────────

export function buildProposalModel(input: BuildProposalInput): DocumentModel {
  const { vehicle, photos, settings = {}, template = "minimal" } = input;
  const lang: Lang = settings.language === "russian" ? "ru" : "en";
  const L = LABELS[lang];
  const theme = getTheme(template);
  const specs = vehicle.specs ?? {};

  const now = new Date().toLocaleDateString(lang === "ru" ? "ru-RU" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const contact: ProposalContact = { ...DEFAULT_CONTACT, ...input.contact };

  // Cover photo: first validated external photo, fallback to main image if https
  const coverPhoto =
    photos[0] ??
    (typeof vehicle.image === "string" && vehicle.image.startsWith("https")
      ? vehicle.image
      : undefined);

  // Cover stat cells (up to 4)
  const coverCells: { label: string; value: string }[] = [];
  if (specs["length"]) coverCells.push({ label: L["length"], value: specs["length"] });
  if (specs["guests"]) coverCells.push({ label: L["guests"], value: specs["guests"] });
  if (specs["cabins"]) coverCells.push({ label: L["cabins"], value: specs["cabins"] });
  if (specs["yearBuilt"]) coverCells.push({ label: L["yearBuilt"], value: specs["yearBuilt"] });

  // ── body nodes ──────────────────────────────────────────────────────────────

  const body: ContentNode[] = [];

  // Page 1 — Specifications
  const specRows = SPEC_KEYS.filter((k) => specs[k])
    .map((k) => ({ label: L[k] ?? k, value: String(specs[k]) }));

  if (specRows.length) {
    body.push({
      kind: "keyValue",
      heading: L["specifications"],
      rows: specRows,
      layout: "pairs",
    });
  }

  const descriptionText = specs["fullDescription"] || vehicle.description || "";
  if (descriptionText) {
    body.push({
      kind: "paragraph",
      text: descriptionText,
      panel: true,
    });
  }

  // Page 2 — Photo gallery (breakBefore so it always starts fresh)
  const galleryUrls = photos.length
    ? photos
    : (vehicle.images ?? []).filter((u) => typeof u === "string" && u.startsWith("https"));

  if (galleryUrls.length) {
    body.push({
      kind: "gallery",
      heading: L["gallery"],
      images: galleryUrls.map((url) => ({ url })),
      columns: 3,
      breakBefore: true,
    });
  }

  // Page 3 — Contact (breakBefore so it starts on a fresh page)
  const contactRows: { label: string; value: string }[] = [
    contact.phone    ? { label: L["phone"],    value: contact.phone }    : null,
    contact.whatsapp ? { label: L["whatsapp"], value: contact.whatsapp } : null,
    contact.email    ? { label: L["email"],    value: contact.email }    : null,
    contact.website  ? { label: L["website"],  value: contact.website }  : null,
  ].filter((r): r is { label: string; value: string } => r !== null);

  body.push({
    kind: "paragraph",
    heading: L["contact"],
    text: L["contactDesc"],
    breakBefore: true,
  });

  if (contactRows.length) {
    body.push({
      kind: "keyValue",
      rows: contactRows,
      layout: "list",
      boxed: true,
    });
  }

  // ── assemble model ──────────────────────────────────────────────────────────

  return {
    meta: {
      type: "proposal",
      brand: "TRANSYACHTGROUP",
      title: L["generatedLabel"],
      language: lang,
      confidential: false,
      watermarkText: "",
      generatedAt: now,
    },
    theme,
    cover: {
      eyebrow: L["eyebrow"],
      name: vehicle.name,
      date: now,
      photoUrl: coverPhoto,
      logoUrl: LOGO_DATA_URI,
      cells: coverCells,
      price: specs["pricePerDay"] ? \`\${specs["pricePerDay"]} / day\` : undefined,
    },
    body,
  };
}
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, src, "utf8");
const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
console.log(`Written proposal.ts — ${kb} KB  (logo: ${(logoB64.length / 1024).toFixed(0)} KB base64)`);
