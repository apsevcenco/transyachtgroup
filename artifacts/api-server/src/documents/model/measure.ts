/**
 * Height heuristics (mm) for the adaptive engine's PDF paginator.
 *
 * These are intentionally CONSERVATIVE: the bin-packer (PACK_BUDGET_MM, ~10%
 * under the true usable A4 height) must never overflow a page, but must also
 * not leave obvious empty space. Values are calibrated against real Chromium
 * output and may be tuned per node type.
 *
 * Used only by the PDF renderer. DOCX reflows natively and ignores these.
 */
import type { ContentNode, TableCell, TableColumn } from "./types";

// Calibrated against real Chromium output at the premium theme. Kept slightly
// above measured heights (safety) but NOT inflated — over-estimation causes
// chronic under-fill (lone footers on otherwise-empty pages).
export const HEADING_MM = 14; // eyebrow/section heading + its margin
export const SUBHEAD_MM = 8;
export const KV_ROW_MM = 8; // one label/value row
export const ROW_BASE_MM = 9; // one single-line table row
export const SUB_LINE_MM = 5;
export const SRC_LINE_MM = 4;
export const LINE_MM = 5; // one wrapped text line
export const VALUE_HEAD_MM = 10;
export const METRIC_CARDS_MM = 46;
export const CONF_MM = 22;
export const CALLOUT_MM = 16;
export const DIVIDER_MM = 6;
export const SIGNATURE_MM = 40;
export const IMAGE_DEFAULT_MM = 60;
export const GALLERY_GAP_MM = 2;
export const GAL_IMG_MM = 36; // MUST match `.gal-img { height }` in theme.ts
export const GAL_CAP_MM = 6;
export const CARD_HEAD_MM = 10; // bordered-card title bar
export const CARD_PAD_MM = 7; // card top+bottom padding + border
export const CARD_ITEM_MM = 7; // one item name line
export const CARD_META_MM = 4; // one item meta sub-line
export const INLINE_STRIP_MM = 9; // compact inline strip padding (excl. wrapped lines)
export const CONTENT_WIDTH_MM = 180; // A4 minus 15mm side margins
export const MM_PER_CHAR = 1.9; // rough avg glyph advance at body size

/** Wrapped-line count for `chars` text inside a column of the given width (%). */
function linesFor(text: string | undefined, widthPct: number): number {
  const len = (text ?? "").length;
  if (!len) return 0;
  return Math.ceil(len / charsPerLine(widthPct));
}

/** Approx chars that fit on one line of a column of the given width (%). */
function charsPerLine(widthPct: number): number {
  const mm = (CONTENT_WIDTH_MM * widthPct) / 100;
  return Math.max(10, Math.floor(mm / MM_PER_CHAR));
}

export function measureTableRow(cells: TableCell[], columns: TableColumn[]): number {
  let extra = 0;
  cells.forEach((c, i) => {
    const widthPct = columns[i]?.widthPct ?? 100 / Math.max(1, cells.length);
    let e = 0;
    // primary text beyond the first (base) line
    e += Math.max(0, linesFor(c.text, widthPct) - 1) * LINE_MM;
    // secondary lines are themselves wrap-aware
    if (c.sub) e += Math.max(1, linesFor(c.sub, widthPct)) * SUB_LINE_MM;
    if (c.source) e += Math.max(1, linesFor(c.source, widthPct)) * SRC_LINE_MM;
    extra = Math.max(extra, e);
  });
  return ROW_BASE_MM + extra;
}

function tableHasHeader(columns: TableColumn[]): boolean {
  return columns.some((c) => c.header != null && c.header !== "");
}

export function measureTable(
  heading: string | undefined,
  columns: TableColumn[],
  rows: TableCell[][],
): number {
  const head = heading ? HEADING_MM : 0;
  const headerRow = tableHasHeader(columns) ? ROW_BASE_MM : 0;
  const body = rows.reduce((sum, r) => sum + measureTableRow(r, columns), 0);
  return head + headerRow + (rows.length ? body : LINE_MM);
}

export function measureParagraph(
  heading: string | undefined,
  text: string,
  panel: boolean,
): number {
  const len = (text ?? "").length;
  const lines = Math.max(1, Math.ceil(len / charsPerLine(100)));
  return (heading ? HEADING_MM : 0) + (panel ? 10 : 0) + lines * LINE_MM;
}

export function measureNode(node: ContentNode): number {
  switch (node.kind) {
    case "heading":
      return 14;
    case "keyValue": {
      const head = node.heading ? HEADING_MM : 0;
      if (node.layout === "inline") {
        const txt = node.rows.map((r) => `${r.label} ${r.value}`).join("  ·  ");
        const lines = Math.max(1, Math.ceil(txt.length / charsPerLine(94)));
        return head + INLINE_STRIP_MM + lines * LINE_MM;
      }
      if (node.boxed && node.layout !== "pairs") {
        const rows = node.rows.length || 1;
        return CARD_HEAD_MM + CARD_PAD_MM + rows * KV_ROW_MM;
      }
      if (!node.rows.length) return head + LINE_MM;
      // Paired grid packs two label/value pairs per row → half the row count.
      const gridRows =
        node.layout === "pairs" ? Math.ceil(node.rows.length / 2) : node.rows.length;
      return head + gridRows * KV_ROW_MM;
    }
    case "card": {
      const body = node.items.reduce((s, it) => {
        const nameLines = Math.max(1, linesFor(it.name, 44));
        const metaLines = it.meta ? Math.max(1, linesFor(it.meta, 44)) : 0;
        return s + nameLines * CARD_ITEM_MM + metaLines * CARD_META_MM + 2;
      }, 0);
      return CARD_HEAD_MM + CARD_PAD_MM + body;
    }
    case "columns": {
      const head = node.heading ? HEADING_MM : 0;
      const tallest = node.columns.reduce((max, col) => {
        const h =
          (col.subHeading ? SUBHEAD_MM : 0) +
          col.nodes.reduce((s, n) => s + measureNode(n), 0);
        return Math.max(max, h);
      }, 0);
      return head + tallest;
    }
    case "paragraph":
      return measureParagraph(node.heading, node.text, node.panel === true);
    case "table":
      return measureTable(node.heading, node.columns, node.rows);
    case "metrics":
      return (
        (node.heading ? HEADING_MM : 0) +
        (node.valueHeading ? VALUE_HEAD_MM : 0) +
        METRIC_CARDS_MM +
        (node.confidence ? CONF_MM : 0) +
        (node.caption ? LINE_MM : 0)
      );
    case "gallery": {
      const cols = node.columns ?? 3;
      const hasCaption = node.images.some((im) => im.caption);
      const cellH = GAL_IMG_MM + (hasCaption ? GAL_CAP_MM : 0);
      const galleryRows = Math.ceil(node.images.length / cols);
      return (node.heading ? HEADING_MM : 0) + galleryRows * (cellH + GALLERY_GAP_MM);
    }
    case "image":
      return (node.heightMm ?? IMAGE_DEFAULT_MM) + (node.caption ? SUB_LINE_MM : 0);
    case "callout": {
      const lines = Math.max(1, Math.ceil((node.text ?? "").length / 110));
      return CALLOUT_MM + (lines - 1) * LINE_MM;
    }
    case "signature":
      return (node.heading ? HEADING_MM : 0) + SIGNATURE_MM;
    case "divider":
      return DIVIDER_MM;
    case "spacer":
      return node.mm ?? 6;
    default: {
      const _exhaustive: never = node;
      return _exhaustive ? 0 : 0;
    }
  }
}
