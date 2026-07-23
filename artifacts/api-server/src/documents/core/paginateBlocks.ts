import { PACK_BUDGET_MM, type DocBlock, type DocPage } from "./types";

/**
 * Greedy bin-packing of blocks onto A4 pages.
 *
 * Rules:
 *  - A `standalone` block (cover) always gets its own fresh page.
 *  - Otherwise blocks are appended to the current page until the next block
 *    would exceed `budgetMm`, at which point a new page is started.
 *
 * This naturally lets adjacent small sections share a page (e.g. Yacht Summary
 * + Valuation Result, or Market Notes + Prepared By + Disclaimer) and avoids
 * the legacy "one section per page" empty-space problem. Because each block is
 * also rendered with `break-inside: avoid`, headings can never be orphaned from
 * their content.
 */
export function paginateBlocks(
  blocks: DocBlock[],
  budgetMm: number = PACK_BUDGET_MM,
): DocPage[] {
  const pages: DocPage[] = [];
  let current: DocBlock[] = [];
  let used = 0;

  const flush = (): void => {
    if (current.length > 0) {
      pages.push({ blocks: current, standalone: false });
      current = [];
      used = 0;
    }
  };

  for (const block of blocks) {
    if (block.standalone) {
      flush();
      pages.push({ blocks: [block], standalone: true });
      continue;
    }
    // A semantic group boundary: start a fresh page so this block (and the ones
    // after it) read as a distinct group. Only flushes a page that already has
    // content, so it can never create an empty page.
    if (block.breakBefore) {
      flush();
    }
    // An oversized splittable block gets its own page so it can flow across as
    // many physical pages as it needs (no forced confinement, no empty page).
    if (block.splittable && block.estimatedHeight > budgetMm) {
      flush();
      pages.push({ blocks: [block], standalone: false });
      continue;
    }
    if (current.length > 0 && used + block.estimatedHeight > budgetMm) {
      flush();
    }
    current.push(block);
    used += block.estimatedHeight;
  }
  flush();

  return pages;
}
