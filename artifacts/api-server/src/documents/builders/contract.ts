/**
 * Rental Agreement (contract) PDF builder for TransYachtGroup.
 *
 * Unlike proposal.ts / fleetOffer.ts this document is legally fixed: the Key
 * Conditions clauses and the Renter's Liability paragraph must render
 * verbatim, so it owns its own exact two-page A4 layout (same technique as
 * fleetOffer.ts — manual `<section>`s, not the adaptive block engine, which
 * is built for content that reflows).
 */
import {
  GOLD,
  GOLD_INK,
  NEAR_BLACK,
  WHITE,
  LIGHT_GREY,
  DARK_GREY,
  MUTED_GREY,
  HAIRLINE,
} from "../core/theme";
import { FONT_FACE_CSS } from "../core/fonts.generated";
import { esc } from "../core/util";
import { stripHtml } from "./proposal";

export interface ContractRenter {
  name: string;
  dob: string; // ISO date
  pob: string;
  nationality: string;
  passport: string;
  passportExpiry: string; // ISO date
  licence: string;
  licenceExpiry: string; // ISO date
  licenceIssuedBy: string;
  phone: string;
}

export interface ContractVehicle {
  name: string;
  category?: string;
  plate?: string;
  vin?: string;
  fuelType?: string;
  transmission?: string;
  colour?: string;
}

export interface ContractInput {
  contractNumber: string;
  /** ISO date — defaults to today if omitted. */
  dateOfIssue?: string;
  renter: ContractRenter;
  vehicle: ContractVehicle;
  pickupDate: string; // ISO date
  returnDate: string; // ISO date
  pickupLocation: string;
  returnLocation: string;
  totalAmount: number;
  depositAmount: number;
  kmPerDay: number;
  extraKmPrice: number;
  representativeName: string;
}

const COMPANY_NAME = "TRANS YACHT GROUPE SARL";
const COMPANY_ADDRESS = "49 Bd d'Alsace, 06400 Cannes";
const COMPANY_PHONE = "+33 7 68 88 38 88";
const COMPANY_EMAIL = "info@transyachtgroup.com";
const COMPANY_SIRET = "84779022700056";

const KEY_CONDITIONS: { title: string; body: string }[] = [
  {
    title: "TERRITORY",
    body: "The Vehicle may be used ONLY within France. Any use outside France constitutes a material breach and results in immediate termination of the agreement.",
  },
  {
    title: "AUTHORISED DRIVER",
    body: "Only the named Renter may operate the Vehicle.",
  },
  {
    title: "PROHIBITED USE",
    body: "No sub-rental, racing, off-road, towing or commercial passenger service.",
  },
  {
    title: "FUEL",
    body: "Full-to-Full. Shortfall charged at market rate + EUR 50 service fee.",
  },
  {
    title: "LATE RETURN",
    body: "After 29-minute grace period, one additional day's rate is charged per commenced day of delay + EUR 100 fee.",
  },
  {
    title: "ACCIDENTS",
    body: "Call 112 if injured, contact Lessor +33 7 68 88 38 88, complete constat amiable within 24h, do not admit liability.",
  },
  { title: "SMOKING", body: "Strictly prohibited. EUR 100 cleaning penalty." },
  { title: "LOST KEYS", body: "EUR 500 per set." },
  {
    title: "WRONG FUEL",
    body: "Full cost of draining and towing borne by Renter.",
  },
  {
    title: "GOVERNING LAW",
    body: "French law. Disputes: Tribunal de Commerce de Nice.",
  },
];

const RENTER_LIABILITY_TEXT =
  "The Renter is fully liable for: (a) any damage to the Vehicle caused by their fault or negligence; " +
  "(b) theft due to Renter's negligence; (c) traffic fines and penalties incurred during the rental period; " +
  "(d) costs arising from use of wrong fuel, loss of keys, or late return. The Lessor reserves the right to " +
  "invoice the Renter directly for any such amounts. Use of the Vehicle outside France or by an unauthorised " +
  "driver entitles the Lessor to terminate this Agreement immediately without refund of any amounts paid.";

function formatDate(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return esc(iso);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** "23 Jul 2026" — compact form for the charges table's Period column. */
function formatDateShort(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return esc(iso);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Inclusive day count — matches totalDaysInclusive() in routes/bookings.ts. */
function daysInclusive(start: string, end: string): number {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  const days = Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
  return Math.max(1, days);
}

function fmtEur(n: number): string {
  return `€ ${n.toLocaleString("en-GB", { maximumFractionDigits: 2 })}`;
}

function kv(label: string, value: string): string {
  return `<tr><td class="ctr-kv-l">${esc(label)}</td><td class="ctr-kv-v">${value}</td></tr>`;
}

export function renderContractHtml(input: ContractInput): string {
  const dateOfIssue =
    input.dateOfIssue || new Date().toISOString().slice(0, 10);
  const days = daysInclusive(input.pickupDate, input.returnDate);
  const agreedMileage = input.kmPerDay * days;
  const totalDue = input.totalAmount + input.depositAmount;
  const vehicleName = stripHtml(input.vehicle.name);

  const HEAD = `'Porter FT', 'Wix MadeFor Display', -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
  const BODY = `'Wix MadeFor Display', -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;

  const css = `
    ${FONT_FACE_CSS}
    @page { size: A4; margin: 15mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      font-family: ${BODY};
      color: ${DARK_GREY};
      background: ${WHITE};
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      font-size: 9.5px;
      line-height: 1.4;
    }
    .ctr-page { page-break-after: always; position: relative; width: 180mm; height: 267mm; overflow: hidden; padding-bottom: 12mm; }
    .ctr-page:last-child { page-break-after: auto; }

    .ctr-header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 3.5mm; border-bottom: 2px solid ${GOLD}; margin-bottom: 5mm; }
    .ctr-company-name { font-family: ${HEAD}; font-size: 17px; font-weight: 800; color: ${DARK_GREY}; letter-spacing: 0.2px; }
    .ctr-company-addr { font-size: 8.5px; color: ${MUTED_GREY}; margin-top: 1.5mm; }
    .ctr-contact { text-align: right; font-size: 8.5px; color: ${DARK_GREY}; line-height: 1.6; }
    .ctr-contact .l { font-family: ${HEAD}; color: ${GOLD_INK}; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; font-size: 7.5px; margin-right: 3px; }

    .ctr-doc-title { font-family: ${HEAD}; font-size: 13px; font-weight: 800; letter-spacing: 1.4px; text-transform: uppercase; text-align: center; color: ${DARK_GREY}; margin-bottom: 5mm; }

    .ctr-meta-row { display: flex; gap: 4mm; margin-bottom: 4mm; }
    .ctr-meta-box { flex: 1; border: 1px solid ${HAIRLINE}; border-radius: 2px; padding: 2.5mm 3.5mm; }
    .ctr-meta-l { font-family: ${HEAD}; font-size: 7.5px; letter-spacing: 1px; text-transform: uppercase; color: ${GOLD_INK}; font-weight: 700; margin-bottom: 1mm; }
    .ctr-meta-v { font-family: ${HEAD}; font-size: 12px; font-weight: 700; color: ${DARK_GREY}; }

    .ctr-pickup { border-left: 3px solid ${GOLD}; background: ${LIGHT_GREY}; border-radius: 2px; padding: 2.5mm 3.5mm; margin-bottom: 5mm; font-size: 9.5px; }
    .ctr-pickup .l { font-family: ${HEAD}; color: ${GOLD_INK}; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; font-size: 7.5px; margin-right: 5px; }

    .ctr-sec { break-inside: avoid; page-break-inside: avoid; margin-bottom: 3.5mm; }
    .ctr-sec-h { background: ${NEAR_BLACK}; color: ${WHITE}; font-family: ${HEAD}; font-size: 9.5px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase; padding: 2mm 3.5mm; }

    table.ctr-kv { width: 100%; border-collapse: collapse; border: 1px solid ${HAIRLINE}; border-top: 0; }
    table.ctr-kv td { padding: 1.8mm 3.5mm; font-size: 9px; border-bottom: 1px solid ${HAIRLINE}; vertical-align: top; }
    table.ctr-kv tr:last-child td { border-bottom: 0; }
    .ctr-kv-l { background: ${LIGHT_GREY}; font-family: ${HEAD}; font-size: 7.5px; letter-spacing: 0.6px; text-transform: uppercase; color: ${MUTED_GREY}; font-weight: 700; width: 34%; }
    .ctr-kv-v { background: ${WHITE}; color: ${DARK_GREY}; font-weight: 500; }

    table.ctr-charges { width: 100%; border-collapse: collapse; border: 1px solid ${HAIRLINE}; border-top: 0; }
    table.ctr-charges th { background: ${NEAR_BLACK}; color: ${WHITE}; font-family: ${HEAD}; font-size: 8px; letter-spacing: 0.8px; text-transform: uppercase; font-weight: 700; text-align: left; padding: 2mm 3mm; }
    table.ctr-charges td { padding: 2mm 3mm; font-size: 9px; border-bottom: 1px solid ${HAIRLINE}; color: ${DARK_GREY}; }
    table.ctr-charges tbody tr:nth-child(even) td { background: ${LIGHT_GREY}; }
    table.ctr-charges tr.ctr-total td { font-family: ${HEAD}; font-weight: 800; font-size: 11px; color: ${GOLD_INK}; border-top: 2px solid ${GOLD}; border-bottom: 0; padding-top: 2.5mm; padding-bottom: 2.5mm; }
    .ctr-ta-r { text-align: right; }

    .ctr-cond-body { border: 1px solid ${HAIRLINE}; border-top: 0; padding: 3mm 3.5mm 1.5mm; }
    .ctr-cond-item { font-size: 8.5px; line-height: 1.55; margin-bottom: 1.8mm; color: ${DARK_GREY}; }
    .ctr-cond-item b { font-family: ${HEAD}; color: ${DARK_GREY}; }

    .ctr-liability-h { font-family: ${HEAD}; font-size: 11px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; color: ${DARK_GREY}; border-bottom: 2px solid ${GOLD}; padding-bottom: 2mm; margin-bottom: 4mm; }
    .ctr-liability-body { font-size: 9.5px; line-height: 1.65; color: ${DARK_GREY}; text-align: justify; }

    .ctr-sig-row { display: flex; gap: 8mm; margin-top: 9mm; }
    .ctr-sig-col { flex: 1; break-inside: avoid; }
    .ctr-sig-h { background: ${NEAR_BLACK}; color: ${WHITE}; font-family: ${HEAD}; font-size: 8.5px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; padding: 2mm 3mm; }
    .ctr-sig-body { border: 1px solid ${HAIRLINE}; border-top: 0; padding: 5mm 4mm 4mm; }
    .ctr-sig-line { border-top: 1px solid ${DARK_GREY}; margin-top: 14mm; padding-top: 2mm; }
    .ctr-sig-name { font-family: ${HEAD}; font-weight: 700; font-size: 9.5px; }
    .ctr-sig-role { font-size: 8px; color: ${MUTED_GREY}; margin-top: 1mm; }
    .ctr-sig-date { font-size: 8px; color: ${MUTED_GREY}; margin-top: 5mm; }

    .ctr-payment { margin-top: 7mm; border: 1px solid ${GOLD}; border-radius: 2px; break-inside: avoid; }
    .ctr-payment-h { background: ${NEAR_BLACK}; color: ${WHITE}; font-family: ${HEAD}; font-size: 8.5px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; padding: 2mm 3.5mm; }
    .ctr-payment-body { padding: 3.5mm 3.5mm 4mm; font-size: 9px; }
    .ctr-payment-row { display: flex; gap: 6mm; margin-top: 3.5mm; }
    .ctr-payment-field { flex: 1; }
    .ctr-payment-l { font-family: ${HEAD}; font-size: 7.5px; letter-spacing: 0.6px; text-transform: uppercase; color: ${GOLD_INK}; font-weight: 700; margin-bottom: 1mm; }
    .ctr-payment-blank { border-bottom: 1px solid ${HAIRLINE}; min-height: 5mm; }

    .ctr-footer { position: absolute; left: 0; right: 0; bottom: 0; display: flex; justify-content: space-between; align-items: center; font-family: ${HEAD}; font-size: 7.5px; letter-spacing: 0.6px; text-transform: uppercase; color: ${MUTED_GREY}; border-top: 1px solid ${HAIRLINE}; padding-top: 2.5mm; }
    .ctr-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; align-items: start; }
    .ctr-two-col .ctr-kv-l { width: 42%; }
    .ctr-two-col table.ctr-kv td { padding: 1.45mm 2.5mm; font-size: 8.4px; }
    .ctr-two-col .ctr-sec-h { padding: 1.7mm 2.5mm; }
    .ctr-page-2 .ctr-header { margin-bottom: 3.5mm; }
    .ctr-page-2 .ctr-cond-body { padding-top: 2.4mm; }
    .ctr-page-2 .ctr-cond-item { font-size: 8.1px; line-height: 1.42; margin-bottom: 1.25mm; }
    .ctr-page-2 .ctr-liability-body { font-size: 8.8px; line-height: 1.5; }
    .ctr-page-2 .ctr-sig-row { margin-top: 6mm; }
    .ctr-page-2 .ctr-sig-body { padding-top: 4mm; }
    .ctr-page-2 .ctr-sig-line { margin-top: 10mm; }
    .ctr-page-2 .ctr-payment { margin-top: 5mm; }
    .ctr-page-2 .ctr-payment-body { padding-top: 2.5mm; padding-bottom: 3mm; }
  `;

  function footer(pageNum: 1 | 2): string {
    return (
      `<div class="ctr-footer">` +
      `<span>${esc(COMPANY_NAME)} &nbsp;|&nbsp; SIRET ${esc(COMPANY_SIRET)}</span>` +
      `<span>Page ${pageNum} / 2</span>` +
      `</div>`
    );
  }

  const headerHtml =
    `<div class="ctr-header">` +
    `<div><div class="ctr-company-name">${esc(COMPANY_NAME)}</div><div class="ctr-company-addr">${esc(COMPANY_ADDRESS)}</div></div>` +
    `<div class="ctr-contact">` +
    `<div><span class="l">Phone</span>${esc(COMPANY_PHONE)}</div>` +
    `<div><span class="l">Email</span>${esc(COMPANY_EMAIL)}</div>` +
    `</div>` +
    `</div>`;

  const metaHtml =
    `<div class="ctr-meta-row">` +
    `<div class="ctr-meta-box"><div class="ctr-meta-l">Contract No.</div><div class="ctr-meta-v">${esc(input.contractNumber)}</div></div>` +
    `<div class="ctr-meta-box"><div class="ctr-meta-l">Date of Issue</div><div class="ctr-meta-v">${esc(formatDate(dateOfIssue))}</div></div>` +
    `</div>`;

  const pickupHtml = `<div class="ctr-pickup"><span class="l">Pick-up Location</span>${esc(input.pickupLocation)}</div>`;

  const renterSection =
    `<div class="ctr-sec">` +
    `<div class="ctr-sec-h">A. Renter Details</div>` +
    `<table class="ctr-kv"><tbody>` +
    kv("Full Name", esc(input.renter.name)) +
    kv("Date of Birth", esc(formatDate(input.renter.dob))) +
    kv("Place of Birth", esc(input.renter.pob)) +
    kv("Nationality", esc(input.renter.nationality)) +
    kv(
      "Passport No. & Expiry",
      `${esc(input.renter.passport)} — Expires ${esc(formatDate(input.renter.passportExpiry))}`,
    ) +
    kv(
      "Driving Licence",
      `${esc(input.renter.licence)} — Expires ${esc(formatDate(input.renter.licenceExpiry))} — Issued by ${esc(input.renter.licenceIssuedBy)}`,
    ) +
    kv("Phone", esc(input.renter.phone)) +
    `</tbody></table>` +
    `</div>`;

  const vehicleSection =
    `<div class="ctr-sec">` +
    `<div class="ctr-sec-h">B. Vehicle Details</div>` +
    `<table class="ctr-kv"><tbody>` +
    kv("Make / Model", esc(vehicleName)) +
    kv("Category", esc(input.vehicle.category || "—")) +
    kv("Registration Plate", esc(input.vehicle.plate || "—")) +
    kv("VIN", esc(input.vehicle.vin || "—")) +
    kv("Fuel Type", esc(input.vehicle.fuelType || "—")) +
    kv("Transmission", esc(input.vehicle.transmission || "—")) +
    kv("Colour", esc(input.vehicle.colour || "—")) +
    `</tbody></table>` +
    `</div>`;

  const rentalSection =
    `<div class="ctr-sec">` +
    `<div class="ctr-sec-h">C. Rental Period</div>` +
    `<table class="ctr-kv"><tbody>` +
    kv(
      "Pick-up",
      `${esc(formatDate(input.pickupDate))} — ${esc(input.pickupLocation)}`,
    ) +
    kv(
      "Return",
      `${esc(formatDate(input.returnDate))} — ${esc(input.returnLocation)}`,
    ) +
    kv("Total Days", `${days} day${days === 1 ? "" : "s"}`) +
    kv(
      "Agreed Mileage",
      `${agreedMileage.toLocaleString("en-GB")} km (${input.kmPerDay} km/day × ${days} day${days === 1 ? "" : "s"})`,
    ) +
    kv("Excess Mileage Rate", `${fmtEur(input.extraKmPrice)} / km`) +
    `</tbody></table>` +
    `</div>`;

  const chargesSection =
    `<div class="ctr-sec">` +
    `<div class="ctr-sec-h">D. Charges</div>` +
    `<table class="ctr-charges">` +
    `<thead><tr><th>Item</th><th>Period</th><th class="ctr-ta-r">Amount</th></tr></thead>` +
    `<tbody>` +
    `<tr><td>Vehicle Rental</td><td>${esc(formatDateShort(input.pickupDate))} → ${esc(formatDateShort(input.returnDate))} (${days} day${days === 1 ? "" : "s"})</td><td class="ctr-ta-r">${esc(fmtEur(input.totalAmount))}</td></tr>` +
    `<tr><td>Excess Mileage</td><td>Billed after return — per km over agreed allowance</td><td class="ctr-ta-r">TBD</td></tr>` +
    `<tr><td>Insurance</td><td>Included in rental</td><td class="ctr-ta-r">Included</td></tr>` +
    `<tr><td>Security Deposit (Refundable)</td><td>Held for duration of rental</td><td class="ctr-ta-r">${esc(fmtEur(input.depositAmount))}</td></tr>` +
    `<tr class="ctr-total"><td colspan="2">TOTAL DUE</td><td class="ctr-ta-r">${esc(fmtEur(totalDue))}</td></tr>` +
    `</tbody></table>` +
    `</div>`;

  const conditionsSection =
    `<div class="ctr-sec">` +
    `<div class="ctr-sec-h">Key Conditions of Hire</div>` +
    `<div class="ctr-cond-body">` +
    KEY_CONDITIONS.map(
      (c, i) =>
        `<div class="ctr-cond-item"><b>${i + 1}. ${esc(c.title)}:</b> ${esc(c.body)}</div>`,
    ).join("") +
    `</div>` +
    `</div>`;

  const page1 =
    `<section class="ctr-page">` +
    headerHtml +
    `<div class="ctr-doc-title">Vehicle Rental Agreement</div>` +
    metaHtml +
    pickupHtml +
    `<div class="ctr-two-col">${renterSection}${vehicleSection}</div>` +
    rentalSection +
    chargesSection +
    footer(1) +
    `</section>`;

  const liabilitySection =
    `<div class="ctr-sec">` +
    `<div class="ctr-liability-h">Renter's Liability</div>` +
    `<div class="ctr-liability-body">${esc(RENTER_LIABILITY_TEXT)}</div>` +
    `</div>`;

  const signatureRow =
    `<div class="ctr-sig-row">` +
    `<div class="ctr-sig-col">` +
    `<div class="ctr-sig-h">Lessor</div>` +
    `<div class="ctr-sig-body">` +
    `<div class="ctr-sig-line"><div class="ctr-sig-name">${esc(input.representativeName)}</div><div class="ctr-sig-role">For and on behalf of ${esc(COMPANY_NAME)}</div></div>` +
    `<div class="ctr-sig-date">Date: ___________________</div>` +
    `</div>` +
    `</div>` +
    `<div class="ctr-sig-col">` +
    `<div class="ctr-sig-h">Renter</div>` +
    `<div class="ctr-sig-body">` +
    `<div class="ctr-sig-line"><div class="ctr-sig-name">${esc(input.renter.name)}</div><div class="ctr-sig-role">Signature of the Renter</div></div>` +
    `<div class="ctr-sig-date">Date: ___________________</div>` +
    `</div>` +
    `</div>` +
    `</div>`;

  const paymentSection =
    `<div class="ctr-payment">` +
    `<div class="ctr-payment-h">Payment Confirmation</div>` +
    `<div class="ctr-payment-body">` +
    `This confirms receipt of the total rental amount and security deposit detailed in Section D above.` +
    `<div class="ctr-payment-row">` +
    `<div class="ctr-payment-field"><div class="ctr-payment-l">Amount Received</div><div class="ctr-payment-blank"></div></div>` +
    `<div class="ctr-payment-field"><div class="ctr-payment-l">Method (Cash / Card / Transfer)</div><div class="ctr-payment-blank"></div></div>` +
    `</div>` +
    `<div class="ctr-payment-row">` +
    `<div class="ctr-payment-field"><div class="ctr-payment-l">Date</div><div class="ctr-payment-blank"></div></div>` +
    `<div class="ctr-payment-field"><div class="ctr-payment-l">Received By</div><div class="ctr-payment-blank"></div></div>` +
    `</div>` +
    `</div>` +
    `</div>`;

  const page2 =
    `<section class="ctr-page ctr-page-2">` +
    headerHtml +
    conditionsSection +
    liabilitySection +
    signatureRow +
    paymentSection +
    footer(2) +
    `</section>`;

  return (
    `<!doctype html>\n<html><head><meta charset="utf-8" /><style>\n${css}\n</style></head>\n` +
    `<body>\n${page1}\n${page2}\n</body></html>`
  );
}
