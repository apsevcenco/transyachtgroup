/**
 * Fleet Offer / Price List document builder for TransYachtGroup.
 *
 * A multi-vehicle price list, not a single-vehicle proposal: given an admin's
 * vehicle selection and a rental period, produces a PDF with one compact row
 * per vehicle (name, days × day-rate = total, included km / extra-km rate /
 * deposit, up to 3 photos). Reuses the same theme, fonts, and page-chunking
 * technique as builders/proposal.ts's renderProposalHtml (manual per-page
 * `<section>`s with their own footer — Puppeteer's page.pdf() does not repeat
 * `position: fixed` elements across pages on its own).
 */
import type { DocumentTemplate } from "../documentTypes";
import { getTheme, adaptiveCss } from "../core/theme";
import { esc } from "../core/util";
import {
  type ProposalContact,
  DEFAULT_CONTACT,
  LOGO_DATA_URI,
  stripHtml,
  compressPhotoUrl,
} from "./proposal";

export interface FleetOfferVehicle {
  id: number;
  name: string;
  category: string;
  specs: Record<string, string>;
  /** Validated, reachable https photo URLs (pre-probed by the route layer) — up to 3 used. */
  photos: string[];
}

export interface FleetOfferInput {
  vehicles: FleetOfferVehicle[];
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
  /** Override contact details (fetched from CMS by the route layer). */
  contact?: ProposalContact;
  template?: DocumentTemplate;
  /** Strips the logo and contact details from the footer — a clean list for agents to resell. */
  whiteLabel?: boolean;
}

function parseSpecNumber(raw: string | undefined): number | undefined {
  const s = stripHtml(raw).trim();
  if (!s) return undefined;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : undefined;
}

function fmtPrice(raw: string | undefined): string | undefined {
  const s = stripHtml(raw).trim();
  if (!s) return undefined;
  return /[€$£₣]|CHF|EUR|USD|GBP/.test(s) ? s : `€ ${s}`;
}

function fmtKm(raw: string | undefined): string | undefined {
  const s = stripHtml(raw).trim();
  if (!s) return undefined;
  return /km|mi\b/i.test(s) ? s : `${s} km`;
}

function fmtEur(n: number): string {
  return `€ ${n.toLocaleString("en-GB", { maximumFractionDigits: 2 })}`;
}

// The CMS phone field has held multilingual markup before (English/Arabic/
// Russian labels wrapped around the same number) — stripHtml() alone leaves
// all of that as plain text, far too long for a single footer line. Pull out
// just the number itself: an optional leading "+", then digits/spaces/
// parens/hyphens, ending in a digit.
function extractPhone(raw: string | undefined): string {
  const stripped = stripHtml(raw).replace(/\s+/g, " ").trim();
  const match = stripped.match(/\+?\d[\d\s()-]{4,}\d/);
  return match ? match[0].replace(/\s+/g, " ").trim() : stripped;
}

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** "17 Jul 2026" — used alongside a pickup/return time, where the full month name would run long. */
function formatDateShort(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// Fleet Offer has its own exact A4 grid: 265mm printable height inside the
// shared 16mm top/bottom @page margins. Compact 22mm rows allow nine vehicles
// while retaining fixed header/footer zones and a safe content reserve.
const VEHICLES_PER_PAGE = 9;

export function renderFleetOfferHtml(input: FleetOfferInput): string {
  const {
    vehicles,
    dateRange,
    deliveryLocation,
    collectionLocation,
    validity = "24 hours",
    template = "minimal",
    whiteLabel = false,
  } = input;

  const theme = getTheme(template);
  const t = theme;
  const contact: ProposalContact = { ...DEFAULT_CONTACT, ...input.contact };
  const days = dateRange.days;
  const dayWord = days === 1 ? "day" : "days";

  const now = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const HEAD = `'Porter FT', 'Wix MadeFor Display', -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;

  const fleetOfferCss = `
    @page { size: A4; margin: 16mm 15mm; }
    .fo-page {
      page-break-after: always;
      position: relative;
      width: 180mm;
      height: 265mm;
      padding: 0;
      display: grid;
      grid-template-rows: 12mm minmax(0, 1fr) 24mm;
      overflow: hidden;
    }
    .fo-page:last-child { page-break-after: auto; }
    .fo-logo { height: 9mm; width: auto; object-fit: contain; display: block; }
    .fo-hdr {
      display: flex;
      justify-content: space-between;
      align-items: center;
      height: 12mm;
      margin: 0;
    }
    .fo-title {
      font-family: ${HEAD};
      font-size: 14px;
      font-weight: 800;
      letter-spacing: 0.3px;
      color: ${t.text};
    }
    .fo-date {
      font-family: ${HEAD};
      font-size: 8px;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: ${t.textMuted};
    }
    .fo-meta {
      background: ${t.panelBg};
      border-left: 3px solid ${t.accent};
      border-radius: 2px;
      padding: 2.5mm 3.5mm;
      margin: 0 0 2mm;
      display: flex;
      flex-wrap: wrap;
      gap: 2px 16px;
    }
    .fo-meta-item { font-size: 9px; color: ${t.text}; }
    .fo-meta-l {
      font-family: ${HEAD};
      color: ${t.accentInk};
      font-size: 7.5px;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      font-weight: 700;
      margin-right: 4px;
    }
    .fo-content { min-height: 0; overflow: hidden; padding-top: 2mm; }
    .fo-rows { display: flex; flex-direction: column; gap: 0; }
    .fo-row {
      display: flex;
      gap: 3mm;
      border: 1px solid ${t.line};
      padding: 6px 10px;
      min-height: 22mm;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .fo-row:first-child { border-radius: 3px 3px 0 0; }
    .fo-row:last-child { border-radius: 0 0 3px 3px; }
    .fo-row + .fo-row { border-top: 0; }
    .fo-info { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; gap: 0.8mm; }
    .fo-name { font-family: ${HEAD}; font-size: 13px; font-weight: 800; color: ${t.text}; }
    .fo-price { font-family: ${HEAD}; font-size: 15px; font-weight: 800; color: ${t.accentInk}; }
    .fo-price-sub { font-family: ${HEAD}; font-size: 8.5px; font-weight: 500; color: ${t.textMuted}; margin-left: 6px; }
    .fo-price-na { font-family: ${HEAD}; font-size: 10px; font-weight: 700; color: ${t.textMuted}; font-style: italic; }
    .fo-specs { display: flex; flex-wrap: wrap; gap: 2px 14px; margin-top: 1mm; }
    .fo-spec-item { font-size: 8.5px; color: ${t.text}; }
    .fo-spec-l {
      font-family: ${HEAD};
      color: ${t.accentInk};
      font-size: 7px;
      letter-spacing: 0.6px;
      text-transform: uppercase;
      font-weight: 700;
      margin-right: 3px;
    }
    .fo-photos { display: flex; gap: 1.5mm; flex-shrink: 0; }
    .fo-photo { width: 24mm; height: 18mm; border-radius: 2px; overflow: hidden; background: ${t.panelBg}; }
    .fo-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .fo-page > .page-footer {
      position: static;
      width: 100%;
      height: 24mm;
      padding: 2mm 0 0;
      display: grid;
      grid-template-rows: 14mm auto;
      gap: 1.5mm;
      align-content: start;
      border-top: 1px solid ${t.line};
    }
    .fo-ft-brand {
      display: grid;
      grid-template-columns: 42mm 42mm minmax(0, 1fr);
      grid-template-areas:
        "brand phone email"
        "brand website website";
      align-items: center;
      background: ${t.coverBg};
      border-radius: 2px;
      padding: 2mm 3mm;
      column-gap: 4mm;
      row-gap: 1mm;
      font-size: 8px;
      line-height: 1.3;
      min-width: 0;
    }
    .fo-ft-brandname {
      font-family: ${HEAD};
      color: ${t.coverAccent};
      font-weight: 800;
      letter-spacing: 0.4px;
      grid-area: brand;
      white-space: nowrap;
    }
    .fo-ft-item { min-width: 0; white-space: nowrap; }
    .fo-ft-phone { grid-area: phone; }
    .fo-ft-email { grid-area: email; }
    .fo-ft-website { grid-area: website; }
    .fo-ft-l { font-family: ${HEAD}; color: ${t.coverAccent}; font-weight: 700; letter-spacing: 0.4px; margin-right: 3px; }
    .fo-ft-v { color: rgba(255,255,255,0.92); }
    .fo-ft-page { justify-self: end; white-space: nowrap; }
  `;

  function vehicleRow(v: FleetOfferVehicle): string {
    const specs = v.specs ?? {};
    const pricePerDay = parseSpecNumber(specs.pricePerDay);

    const priceHtml =
      pricePerDay != null
        ? `<div class="fo-price">${esc(fmtEur(pricePerDay * days))}` +
          `<span class="fo-price-sub">${days} ${dayWord} × ${esc(fmtEur(pricePerDay))}/day</span></div>`
        : `<div class="fo-price-na">Price on request</div>`;

    // kmIncluded is a per-day allowance — show the total for the whole
    // rental period. Falls back to the raw spec value when it isn't a clean
    // number (e.g. "Unlimited").
    const kmPerDay = parseSpecNumber(specs.kmIncluded);
    const kmItem =
      kmPerDay != null
        ? { l: "Included", v: `${kmPerDay * days} km total (${days} ${dayWord} × ${kmPerDay} km/day)` }
        : fmtKm(specs.kmIncluded)
          ? { l: "Included", v: fmtKm(specs.kmIncluded)! }
          : null;

    const specItems = (
      [
        kmItem,
        fmtPrice(specs.extraPricePerKm)
          ? { l: "Extra / km", v: fmtPrice(specs.extraPricePerKm)! }
          : null,
        fmtPrice(specs.deposit)
          ? { l: "Deposit", v: fmtPrice(specs.deposit)! }
          : null,
      ] as Array<{ l: string; v: string } | null>
    ).filter((r): r is { l: string; v: string } => r !== null);

    const specsHtml = specItems.length
      ? `<div class="fo-specs">` +
        specItems
          .map(
            (i) =>
              `<span class="fo-spec-item"><span class="fo-spec-l">${esc(i.l)}</span>${esc(i.v)}</span>`,
          )
          .join("") +
        `</div>`
      : "";

    const photosHtml = v.photos.length
      ? `<div class="fo-photos">` +
        v.photos
          .slice(0, 3)
          .map(
            (p) =>
              `<div class="fo-photo"><img src="${esc(compressPhotoUrl(p, 400))}" /></div>`,
          )
          .join("") +
        `</div>`
      : "";

    return (
      `<div class="fo-row">` +
      `<div class="fo-info"><div class="fo-name">${esc(stripHtml(v.name))}</div>${priceHtml}${specsHtml}</div>` +
      photosHtml +
      `</div>`
    );
  }

  const logoHtml =
    !whiteLabel && LOGO_DATA_URI
      ? `<img class="fo-logo" src="${LOGO_DATA_URI}" />`
      : `<span></span>`;

  const metaHtml =
    `<div class="fo-meta">` +
    (deliveryLocation
      ? `<span class="fo-meta-item"><span class="fo-meta-l">Delivery</span>${esc(deliveryLocation)}</span>`
      : "") +
    (collectionLocation
      ? `<span class="fo-meta-item"><span class="fo-meta-l">Collection</span>${esc(collectionLocation)}</span>`
      : "") +
    `<span class="fo-meta-item"><span class="fo-meta-l">Dates</span>${esc(
      dateRange.pickupTime && dateRange.returnTime
        ? `${formatDateShort(dateRange.start)}, ${dateRange.pickupTime} → ${formatDateShort(dateRange.end)}, ${dateRange.returnTime} · ${days} ${dayWord}`
        : `${formatDate(dateRange.start)} – ${formatDate(dateRange.end)} (${days} ${dayWord})`,
    )}</span>` +
    `<span class="fo-meta-item"><span class="fo-meta-l">Valid for</span>${esc(validity)}</span>` +
    `</div>`;

  const chunks: FleetOfferVehicle[][] = [];
  for (let i = 0; i < vehicles.length; i += VEHICLES_PER_PAGE)
    chunks.push(vehicles.slice(i, i + VEHICLES_PER_PAGE));
  const pageChunks = chunks.length ? chunks : [[]];
  const totalPages = pageChunks.length;

  function pageFooter(pageNum: number): string {
    const contactItems: { label: string; value: string }[] = [];
    if (contact.phone)
      contactItems.push({ label: "PHONE", value: extractPhone(contact.phone) });
    if (contact.email)
      contactItems.push({
        label: "EMAIL",
        value: stripHtml(contact.email).trim(),
      });
    if (contact.website)
      contactItems.push({
        label: "WEBSITE",
        value: stripHtml(contact.website).trim(),
      });

    const brandPart = whiteLabel
      ? `<span></span>`
      : `<span class="fo-ft-brand"><span class="fo-ft-brandname">TRANSYACHTGROUP</span>` +
        contactItems
          .map(
            (i) =>
              `<span class="fo-ft-item fo-ft-${i.label.toLowerCase()}"><span class="fo-ft-l">${esc(i.label)}</span><span class="fo-ft-v">${esc(i.value)}</span></span>`,
          )
          .join("") +
        `</span>`;
    return (
      `<div class="page-footer">${brandPart}` +
      `<span class="fo-ft-page">Page ${pageNum} of ${totalPages} · ${esc(now)}</span></div>`
    );
  }

  const pagesHtml = pageChunks
    .map((chunk, idx) => {
      const pageNum = idx + 1;
      return (
        `<section class="fo-page">\n` +
        `<div class="fo-hdr">${logoHtml}<span class="fo-title">Fleet Offer</span><span class="fo-date">${esc(now)}</span></div>\n` +
        `<div class="fo-content">` +
        (pageNum === 1 ? metaHtml + "\n" : "") +
        `<div class="fo-rows">${chunk.map(vehicleRow).join("")}</div></div>\n` +
        pageFooter(pageNum) +
        "\n</section>"
      );
    })
    .join("\n");

  return (
    `<!doctype html>\n<html><head><meta charset="utf-8" /><style>\n` +
    adaptiveCss(theme, false) +
    `\n` +
    fleetOfferCss +
    `\n` +
    `</style></head>\n<body>\n${pagesHtml}\n</body></html>`
  );
}
