/**
 * Semantic, renderer-independent document model for the Adaptive Document Engine.
 *
 * This is the single source a document is described in. Both the PDF renderer
 * (`pdf/renderModelToBlocks` → paginate → HTML → puppeteer) and the future DOCX
 * renderer consume this same tree, so a document is authored once and rendered
 * to either medium.
 *
 * Rules:
 *  - Nodes are SEMANTIC, never HTML. No `<div>` strings live here.
 *  - All text is RAW / un-escaped. Each renderer escapes for its own medium
 *    (HTML-escape for PDF, native text for DOCX). Builders must NOT pre-escape.
 *  - The node set is deliberately wide enough to express every planned document
 *    type — including a professional multi-page survey report (findings tables,
 *    galleries, sea-trial tables, signature, legal callouts).
 */
import type { RenderTheme } from "../core/types";

export type { RenderTheme };

/** Document-level metadata shared by every type. */
export interface DocMeta {
  /** Document type id (e.g. "valuation_report"). */
  type: string;
  /** Brand / company name shown in cover eyebrow + (future) running header. */
  brand: string;
  /** Localised document title (e.g. "VALUATION REPORT"). */
  title: string;
  /** Language key (english | french | …). */
  language: string;
  /** Diagonal confidential watermark on every page. */
  confidential: boolean;
  /** Watermark text (raw). */
  watermarkText: string;
  /** Formatted generation date (raw). */
  generatedAt: string;
  /** Optional legal disclaimer line (raw). */
  disclaimer?: string;
}

/** Full-bleed cover page. Rendered as a standalone, fill-exempt page. */
export interface CoverSpec {
  eyebrow: string;
  name: string;
  subtitle?: string;
  date: string;
  /** Validated image URL (https) or omitted for a solid-colour cover. */
  photoUrl?: string;
  /** Brand logo — https URL or data:image base64. Rendered top-left on the cover. */
  logoUrl?: string;
  cells: { label: string; value: string }[];
  /** Formatted headline figure (e.g. asking price / estimated value). */
  price?: string;
}

export interface DocumentModel {
  meta: DocMeta;
  theme: RenderTheme;
  cover?: CoverSpec;
  /** Ordered body content. Each top-level node becomes one or more page blocks. */
  body: ContentNode[];
}

// ─── content nodes ──────────────────────────────────────────────────────────

/** Standalone section title (used to break a large document into sections). */
export interface HeadingNode {
  kind: "heading";
  level?: 1 | 2 | 3;
  text: string;
}

/** Label → value grid (spec sheets, contact blocks). */
export interface KeyValueGridNode {
  kind: "keyValue";
  heading?: string;
  rows: { label: string; value: string }[];
  emptyText?: string;
  /**
   * Layout:
   *  - "list"  (default) → single-column label/value rows.
   *  - "pairs" → paired specification grid (label | value | label | value).
   *  - "inline" → one compact horizontal strip of `Label value · …` segments
   *    (e.g. the proposal's commercial snapshot row).
   */
  layout?: "list" | "pairs" | "inline";
  /**
   * Render the grid inside a bordered card with the heading as a title bar
   * (e.g. the proposal's broker-contact card). Ignored for "inline"/"pairs".
   */
  boxed?: boolean;
}

/**
 * A bordered category card: a title bar over a list of name (+ optional meta)
 * rows. Used for the proposal's equipment inventory so each category reads as a
 * premium card rather than a raw list.
 */
export interface CardNode {
  kind: "card";
  heading: string;
  items: { name: string; meta?: string }[];
}

/** Side-by-side columns of nested nodes (e.g. specs | accommodation). */
export interface ColumnsNode {
  kind: "columns";
  heading?: string;
  columns: { subHeading?: string; nodes: ContentNode[] }[];
}

/** Prose paragraph. May carry \n; large bodies flow across pages. */
export interface ParagraphNode {
  kind: "paragraph";
  heading?: string;
  text: string;
  /** Render inside a tinted panel. */
  panel?: boolean;
  muted?: boolean;
  emptyText?: string;
  /** Start a fresh page before this node (semantic group boundary). */
  breakBefore?: boolean;
}

export type CellTone = "pos" | "neg" | "neu" | "a" | "b" | "c" | "d";

export interface TableCell {
  text: string;
  /** Secondary muted line under the main text. */
  sub?: string;
  /** Small uppercase accent line (e.g. comparable source). */
  source?: string;
  /** Colour-coded chip (impact, survey recommendation grade …). */
  tag?: { text: string; tone: CellTone };
  align?: "left" | "right" | "center";
  bold?: boolean;
  italic?: boolean;
  /** Render text in the accent colour (e.g. survey recommendations). */
  accent?: boolean;
  muted?: boolean;
}

export interface TableColumn {
  header?: string;
  align?: "left" | "right" | "center";
  widthPct?: number;
}

/** Generic professional table. Splits across pages with a repeated header. */
export interface TableNode {
  kind: "table";
  heading?: string;
  columns: TableColumn[];
  rows: TableCell[][];
  emptyText?: string;
  /** Start a fresh page before this node (semantic group boundary). */
  breakBefore?: boolean;
}

/** Big-number cards (value range, ROI, cost totals) + optional confidence bar. */
export interface MetricsNode {
  kind: "metrics";
  heading?: string;
  valueHeading?: string;
  cards: { label: string; value: string; emphasis?: boolean }[];
  confidence?: { label: string; pct: number };
  /** Muted caption under the cards (range / data-completeness summary). */
  caption?: string;
}

/** Photo gallery. Chunked into row-groups so no image is split across a page. */
export interface GalleryNode {
  kind: "gallery";
  heading?: string;
  images: { url: string; caption?: string }[];
  /** Columns per row (default 3). */
  columns?: number;
  /** Start a fresh page before this node (semantic group boundary). */
  breakBefore?: boolean;
}

/** Single image (charts, diagrams). */
export interface ImageNode {
  kind: "image";
  url: string;
  heightMm?: number;
  caption?: string;
}

/** Tinted callout box (disclaimers, legal, info). */
export interface CalloutNode {
  kind: "callout";
  text: string;
  tone?: "muted" | "info" | "legal";
}

/** Declaration signature: image (or fallback line) + name + role label. */
export interface SignatureNode {
  kind: "signature";
  heading?: string;
  /** https or data:image base64 — validated by the renderer. */
  signatureUrl?: string;
  name?: string;
  line?: string;
}

export interface DividerNode {
  kind: "divider";
}

export interface SpacerNode {
  kind: "spacer";
  mm?: number;
}

export type ContentNode =
  | HeadingNode
  | KeyValueGridNode
  | CardNode
  | ColumnsNode
  | ParagraphNode
  | TableNode
  | MetricsNode
  | GalleryNode
  | ImageNode
  | CalloutNode
  | SignatureNode
  | DividerNode
  | SpacerNode;
