import type { DocumentTemplate } from "../documentTypes";
import type { RenderTheme } from "./types";
import { FONT_FACE_CSS } from "./fonts.generated";

/**
 * TransYacht Group Document Design System — palette.
 *
 * White page / near-black cover / gold accents. Matches the website's dark
 * brand theme while keeping PDF page backgrounds white for print legibility.
 */
export const NEAR_BLACK = "#0A0A0A"; // cover bg, table headers
export const GOLD = "#D4A843";       // site gold — rules, accents, large figures
export const GOLD_INK = "#9C7B1A";   // deeper gold — small uppercase labels on white
export const WHITE = "#ffffff";
export const LIGHT_GREY = "#F3F4F6"; // zebra rows, panels, metric-card fill
export const DARK_GREY = "#2A2A30";  // body text
export const MUTED_GREY = "#6E6E76"; // secondary / muted text
export const HAIRLINE = "#E4E6EA";   // thin dividers / cell borders

const BASE: RenderTheme = {
  pageBg: WHITE,
  text: DARK_GREY,
  textMuted: MUTED_GREY,
  accent: GOLD,
  accentInk: GOLD_INK,
  line: HAIRLINE,
  coverBg: NEAR_BLACK,
  coverText: WHITE,
  coverAccent: GOLD,
  tableHeadBg: NEAR_BLACK,
  tableHeadText: WHITE,
  rowAlt: LIGHT_GREY,
  panelBg: LIGHT_GREY,
};

export const THEMES: Record<DocumentTemplate, RenderTheme> = {
  minimal: { ...BASE },
  classic: { ...BASE },
  premium: { ...BASE },
};

export function getTheme(t: DocumentTemplate): RenderTheme {
  return THEMES[t];
}

/**
 * Shared CSS for the adaptive block layout.
 *
 * Typography: Porter FT (headings/figures) + Wix MadeFor Display (body), both
 * embedded as base64 @font-face so they render identically in server-side Chromium.
 *
 * Layout rules:
 *  - `.page` packs multiple blocks (forced break after each, except the last)
 *    and pins a shared footer to the bottom.
 *  - `.block` never splits across a page (`break-inside: avoid`) — no orphan headings.
 *  - Block spacing (24px between blocks) is deliberately larger than line spacing
 *    (1.4) so sections breathe without near-empty pages.
 *  - flex children get `min-width: 0` to prevent the vertical text-wrap bug.
 */
export function adaptiveCss(t: RenderTheme, confidential: boolean): string {
  const HEAD = `'Porter FT', 'Wix MadeFor Display', -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
  const BODY = `'Wix MadeFor Display', -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
  return `
  ${FONT_FACE_CSS}
  @page { size: A4; margin: 16mm 15mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: ${BODY};
    color: ${t.text};
    background: ${t.pageBg};
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    font-size: 10.5px;
    line-height: 1.4;
  }
  /* a packed content page: pins the shared footer to the bottom */
  .page {
    page-break-after: always;
    position: relative;
    height: 261mm;
    overflow: hidden;
    padding: 4mm 0 14mm;
  }
  .page:last-child { page-break-after: auto; }
  .page-flow { page-break-after: always; position: relative; min-height: 261mm; padding: 4mm 0 14mm; }
  .page-flow:last-child { page-break-after: auto; }
  .cover-page { padding: 0; min-height: 0; }
  .block { break-inside: avoid; page-break-inside: avoid; }
  .block + .block { margin-top: 10px; }
  .muted { color: ${t.textMuted}; }
  /* shared section label */
  .eyebrow {
    font-family: ${HEAD};
    color: ${t.accentInk};
    font-size: 10px;
    letter-spacing: 1.4px;
    font-weight: 700;
    text-transform: uppercase;
    border-bottom: 1px solid ${t.accent};
    padding-bottom: 6px;
    margin-bottom: 8px;
  }
  /* shared per-page footer */
  .page-footer {
    position: absolute;
    left: 0; right: 0; bottom: 7mm;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-family: ${HEAD};
    font-size: 8px;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    color: ${t.textMuted};
    border-top: 1px solid ${t.line};
    padding-top: 5px;
  }
  .page-footer .pf-brand { color: ${t.accentInk}; font-weight: 700; }
  /* cover (full-bleed photo OR solid dark cover) */
  .cover {
    page-break-after: always;
    height: 265mm;
    background: ${t.coverBg};
    color: ${t.coverText};
    position: relative;
    overflow: hidden;
  }
  .cover-photo { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .cover-overlay {
    position: absolute; inset: 0;
    background: linear-gradient(to bottom, rgba(10,10,10,0.45) 0%, rgba(10,10,10,0.12) 30%, rgba(10,10,10,0.55) 62%, rgba(10,10,10,0.86) 100%);
  }
  /* solid (photoless) cover gets a subtle gold hairline frame */
  .cover-frame {
    position: absolute; inset: 12mm;
    border: 1px solid rgba(212,168,67,0.45);
  }
  .cover-inner {
    position: absolute;
    left: 14mm;
    right: 14mm;
    bottom: 14mm;
    padding: 12mm 10mm 10mm;
    background: linear-gradient(
      to bottom,
      rgba(10,10,10,0.20),
      rgba(10,10,10,0.78)
    );
    border-top: 1px solid rgba(212,168,67,0.45);
  }
  .cover-eyebrow {
    font-family: ${HEAD};
    color: ${t.coverAccent}; letter-spacing: 2.2px; font-size: 11px; font-weight: 700;
    text-transform: uppercase; margin-bottom: 12px;
  }
  .cover-name { font-family: ${HEAD}; font-size: 36px; font-weight: 800; letter-spacing: -0.5px; margin: 0 0 6px; }
  .cover-sub { font-size: 13px; opacity: 0.92; margin-bottom: 18px; }
  .cover-grid { display: flex; flex-wrap: wrap; gap: 0; border-top: 1px solid rgba(255,255,255,0.32); }
  .cover-cell { flex: 1 1 20%; padding: 11px 6px 0; min-width: 80px; }
  .cover-cell .cl { font-family: ${HEAD}; font-size: 8.5px; letter-spacing: 1.5px; text-transform: uppercase; color: ${t.coverAccent}; }
  .cover-cell .cv { font-size: 13px; font-weight: 500; }
  .cover-price { font-family: ${HEAD}; margin-top: 16px; font-size: 23px; font-weight: 800; color: ${t.coverAccent}; }
  .cover-logo { position: absolute; top: 14mm; left: 15mm; height: 11mm; width: auto; object-fit: contain; }
  .cover-date { font-family: ${HEAD}; position: absolute; top: 16mm; right: 16mm; font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; opacity: 0.75; }
  /* paired key/value list (single column) */
  table.spec { width: 100%; border-collapse: collapse; }
  table.spec td { padding: 7px 4px; border-bottom: 1px solid ${t.line}; vertical-align: top; }
  .spec-l { font-family: ${HEAD}; color: ${t.accentInk}; font-size: 9px; letter-spacing: 1px; text-transform: uppercase; width: 40%; font-weight: 700; }
  .spec-v { font-weight: 500; color: ${t.text}; }
  /* paired specification grid (label | value | label | value) */
  table.kv-grid { width: 100%; border-collapse: collapse; table-layout: fixed; }
  table.kv-grid td { padding: 7px 8px; vertical-align: top; overflow-wrap: break-word; word-break: break-word; }
  table.kv-grid tr:nth-child(even) td { background: ${t.rowAlt}; }
  .kvg-l { font-family: ${HEAD}; color: ${t.accentInk}; font-size: 8.5px; letter-spacing: 1px; text-transform: uppercase; font-weight: 700; width: 17%; }
  .kvg-v { font-weight: 500; color: ${t.text}; width: 33%; }
  .two-col { display: flex; gap: 20px; }
  .two-col > div { flex: 1; min-width: 0; }
  .sub-h { font-family: ${HEAD}; font-size: 12px; font-weight: 700; margin: 0 0 9px; color: ${t.text}; }
  /* metric cards */
  .val-head { font-family: ${HEAD}; font-size: 12px; font-weight: 700; margin-bottom: 13px; color: ${t.text}; }
  .val-row { display: flex; gap: 12px; margin-bottom: 18px; }
  .val-box { flex: 1; min-width: 0; background: ${t.panelBg}; padding: 18px 14px; border-radius: 3px; text-align: center; }
  .val-box-mid { background: ${t.coverBg}; }
  .val-label { font-family: ${HEAD}; color: ${t.accentInk}; font-size: 9px; letter-spacing: 1.5px; text-transform: uppercase; font-weight: 700; margin-bottom: 8px; }
  .val-amount { font-family: ${HEAD}; font-size: 19px; font-weight: 800; color: ${t.text}; line-height: 1.2; }
  .val-box-mid .val-label { color: ${t.coverAccent}; }
  .val-box-mid .val-amount { font-size: 21px; color: ${t.coverText}; }
  /* confidence */
  .conf { margin-top: 4px; }
  .conf-head { font-family: ${HEAD}; color: ${t.accentInk}; font-size: 9px; letter-spacing: 1.5px; text-transform: uppercase; font-weight: 700; margin-bottom: 8px; }
  .conf-bar { background: ${t.panelBg}; border-radius: 10px; height: 12px; overflow: hidden; }
  .conf-fill { background: ${t.accent}; height: 100%; }
  .conf-val { font-family: ${HEAD}; margin-top: 6px; font-weight: 700; font-size: 13px; color: ${t.text}; }
  .val-cap { font-family: ${BODY}; margin-top: 12px; font-size: 10px; color: ${t.textMuted}; line-height: 1.5; }
  /* professional table: dark header + white text + zebra body rows */
  table.tbl { width: 100%; border-collapse: collapse; overflow: hidden; border-radius: 3px; }
  table.tbl th {
    font-family: ${HEAD};
    text-align: left; background: ${t.tableHeadBg}; color: ${t.tableHeadText};
    font-size: 9px; letter-spacing: 1px; text-transform: uppercase; font-weight: 700;
    padding: 8px 9px;
  }
  table.tbl td { padding: 8px 9px; border-bottom: 1px solid ${t.line}; vertical-align: top; }
  table.tbl tbody tr:nth-child(even) td { background: ${t.rowAlt}; }
  .tbl-sub { color: ${t.textMuted}; font-weight: 400; font-size: 9.5px; margin-top: 2px; }
  .tbl-src { font-family: ${HEAD}; color: ${t.accentInk}; font-weight: 700; font-size: 8.5px; letter-spacing: 0.5px; text-transform: uppercase; margin-top: 3px; }
  .tbl-accent { font-family: ${HEAD}; color: ${t.accentInk}; font-size: 8.5px; letter-spacing: 1px; text-transform: uppercase; font-weight: 700; }
  .ta-r { text-align: right; }
  .ta-c { text-align: center; }
  .b { font-weight: 700; }
  .i { font-style: italic; }
  /* impact / status chips */
  .chip { display: inline-block; padding: 3px 9px; border-radius: 10px; font-size: 9px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; background: ${t.panelBg}; color: ${t.text}; }
  .imp-pos { background: ${t.panelBg}; color: ${t.accentInk}; }
  .imp-neg { background: ${t.panelBg}; color: ${t.textMuted}; }
  .imp-neu { background: ${t.panelBg}; color: ${t.textMuted}; }
  .tag-a, .tag-b, .tag-c, .tag-d { background: ${t.panelBg}; color: ${t.text}; }
  .fw { display: inline-block; margin-left: 8px; color: ${t.textMuted}; font-weight: 700; font-size: 10px; }
  /* notes + contact + disclaimer */
  .notes { background: ${t.panelBg}; border-left: 3px solid ${t.accent}; border-radius: 3px; padding: 12px 14px; }
  .notes p { margin: 0; }
  .contact { margin-top: 4px; }
  .disclaimer { color: ${t.textMuted}; font-size: 9px; font-style: italic; }
  /* generic adaptive-engine section headings */
  .sec-h { font-family: ${HEAD}; font-weight: 800; color: ${t.text}; margin: 0 0 10px; border-bottom: 2px solid ${t.accent}; padding-bottom: 6px; }
  .sec-h.h1 { font-size: 16px; }
  .sec-h.h2 { font-size: 14px; }
  .sec-h.h3 { font-size: 12px; }
  /* galleries */
  .gallery { display: flex; flex-wrap: wrap; gap: 2mm; }
  .gal-cell { overflow: hidden; }
  .gal-img { width: 100%; height: 36mm; object-fit: cover; border-radius: 3px; display: block; }
  .gal-cap { font-size: 9px; color: ${t.textMuted}; margin-top: 3px; }
  .single-img { width: 100%; object-fit: cover; display: block; border-radius: 3px; }
  /* callout */
  .callout { background: ${t.panelBg}; border-left: 3px solid ${t.accent}; padding: 10px 14px; border-radius: 3px; font-size: 10px; }
  .callout.legal { font-style: italic; color: ${t.textMuted}; }
  /* signature */
  .sig-img { max-width: 60%; max-height: 30mm; object-fit: contain; display: block; }
  .sig-line { border-top: 1px solid ${t.text}; width: 60%; margin-top: 22px; }
  .sig-name { font-family: ${HEAD}; font-weight: 700; margin-top: 6px; }
  .sig-role { font-size: 10px; margin-top: 2px; }
  .divider { border-top: 1px solid ${t.line}; }
  /* equipment category cards + boxed broker card */
  .eq-card, .kv-card { border: 1px solid ${t.line}; border-radius: 4px; overflow: hidden; background: ${t.pageBg}; break-inside: avoid; }
  .eq-card-h { font-family: ${HEAD}; font-size: 9px; letter-spacing: 1.2px; text-transform: uppercase; font-weight: 700; color: ${t.tableHeadText}; background: ${t.tableHeadBg}; padding: 6px 10px; }
  /* equipment-only: gold accent rule under the dark category header */
  .eq-card > .eq-card-h { border-bottom: 2px solid ${t.accent}; }
  .eq-card-body { padding: 4px 11px 6px; }
  .eq-row { display: flex; flex-direction: column; align-items: stretch; gap: 2px; padding: 6px 0; border-bottom: 1px solid ${t.line}; }
  .eq-row:last-child { border-bottom: 0; }
  .eq-name { font-weight: 700; color: ${t.text}; font-size: 10px; line-height: 1.3; }
  .eq-meta { color: ${t.textMuted}; font-size: 8.5px; font-weight: 400; line-height: 1.3; }
  /* compact inline commercial snapshot */
  .kv-inline { background: ${t.panelBg}; border-left: 3px solid ${t.accent}; border-radius: 3px; padding: 11px 14px; display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 8px; }
  .kvi-l { font-family: ${HEAD}; color: ${t.accentInk}; font-size: 8.5px; letter-spacing: 1px; text-transform: uppercase; font-weight: 700; margin-right: 7px; }
  .kvi-v { font-weight: 700; color: ${t.text}; font-size: 11px; }
  .kvi-sep { color: ${t.accent}; font-weight: 700; margin: 0 4px; }
  /* boxed key/value card */
  .kv-card-body { padding: 2px 12px 6px; }
  table.kvc-tbl { width: 100%; border-collapse: collapse; }
  table.kvc-tbl td { padding: 6px 0; border-bottom: 1px solid ${t.line}; vertical-align: top; }
  table.kvc-tbl tr:last-child td { border-bottom: 0; }
  .kvc-l { font-family: ${HEAD}; color: ${t.accentInk}; font-size: 8.5px; letter-spacing: 1px; text-transform: uppercase; font-weight: 700; width: 30%; }
  .kvc-v { font-weight: 500; color: ${t.text}; }
  ${
    confidential
      ? `.watermark { position: fixed; top: 45%; left: 0; right: 0; text-align: center;
           font-family: ${HEAD};
           font-size: 60px; font-weight: 800; color: ${t.accent}; opacity: 0.07;
           transform: rotate(-28deg); letter-spacing: 8px; z-index: 0; }`
      : ".watermark { display: none; }"
  }
  `;
}
