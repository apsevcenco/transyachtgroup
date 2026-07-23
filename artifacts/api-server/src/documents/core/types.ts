/**
 * Adaptive Document Engine — shared types (pilot).
 *
 * A document is built from an ordered list of {@link DocBlock}s. Each block
 * carries a heuristic height (mm) used by the paginator to greedily pack blocks
 * onto A4 pages, filling each page as much as possible before starting a new
 * one. This eliminates the "one section per page" empty-space problem of the
 * legacy section-per-page templates.
 *
 * This module is intentionally independent from the legacy templates — it is
 * opt-in behind `exportSettings.engine: "adaptive"` and never changes the
 * existing legacy output.
 */

export interface RenderTheme {
  pageBg: string;
  text: string;
  textMuted: string;
  accent: string;
  /** Deeper accent used for small uppercase labels where `accent` is too faint on white. */
  accentInk: string;
  line: string;
  coverBg: string;
  coverText: string;
  coverAccent: string;
  /** Solid table-header background (the one shared table style). */
  tableHeadBg: string;
  /** Table-header text colour (reads on `tableHeadBg`). */
  tableHeadText: string;
  /** Alternating ("zebra") table-row background. */
  rowAlt: string;
  panelBg: string;
}

export interface DocBlock {
  id: string;
  type: string;
  /** Estimated rendered height in millimetres — consumed by `paginateBlocks`. */
  estimatedHeight: number;
  /** Forced onto its own fresh page (e.g. the cover). */
  standalone?: boolean;
  /** Exempt from the >=50% page-fill quality expectation (e.g. the cover). */
  fillExempt?: boolean;
  /**
   * May break across pages. Used for unbounded-length text blocks (e.g. very
   * long market notes) so they flow naturally instead of being forced whole
   * onto a single page (which would overflow into a near-empty extra page).
   */
  splittable?: boolean;
  /**
   * Start a fresh page before this block (if the current page already has
   * content). Used by builders to declare semantic group boundaries — e.g.
   * keeping "Market Notes + Contact + Disclaimer" together on a final page
   * instead of letting greedy packing strand the disclaimer alone. Never forces
   * an empty page: it only flushes a page that already has blocks.
   */
  breakBefore?: boolean;
  /** Pre-rendered, pre-escaped, themed HTML fragment for this block. */
  html: string;
}

export interface DocPage {
  blocks: DocBlock[];
  standalone: boolean;
}

/** Usable A4 content height: 297mm − 16mm top − 16mm bottom margins. */
export const A4_CONTENT_HEIGHT_MM = 265;

/**
 * Conservative packing budget. Deliberately lower than the true usable height
 * so that heuristic height estimates (which are approximate) plus inter-block
 * margins never overflow a physical page into a near-empty extra page.
 */
export const PACK_BUDGET_MM = 255;
