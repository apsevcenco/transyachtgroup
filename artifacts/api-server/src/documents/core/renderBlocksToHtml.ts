import { adaptiveCss } from "./theme";
import type { DocPage, RenderTheme } from "./types";

/** Minimal HTML escaping for footer text supplied by the caller. */
function escFooter(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Render paginated blocks into a complete A4 HTML document.
 *
 * Standalone pages (cover) are emitted bare; packed pages wrap each block in a
 * `.block` element so the CSS `break-inside: avoid` rule keeps each block whole.
 * Every non-cover page carries the shared footer (brand · confidential ·
 * page X of Y · generated date), pinned to the page bottom.
 *
 * NOTE: `watermarkText` must already be HTML-escaped by the caller.
 */
export function renderBlocksToHtml(input: {
  pages: DocPage[];
  theme: RenderTheme;
  confidential: boolean;
  watermarkText: string;
  /** Shared per-page footer content. Raw text — escaped here. */
  footer?: { brand: string; date: string; confidentialLabel: string };
}): string {
  const { pages, theme, confidential, watermarkText, footer } = input;

  // Footer numbers only the content (non-cover) pages: "Page 1 of N".
  const contentTotal = pages.filter((p) => !p.standalone).length;
  let contentSeq = 0;

  const footerHtml = (): string => {
    if (!footer) return "";
    contentSeq += 1;
    const left = [
      `<span class="pf-brand">${escFooter(footer.brand)}</span>`,
      confidential ? escFooter(footer.confidentialLabel) : "",
    ]
      .filter(Boolean)
      .join(" · ");
    const right = `Page ${contentSeq} of ${contentTotal} · ${escFooter(footer.date)}`;
    return `<div class="page-footer"><span>${left}</span><span>${right}</span></div>`;
  };

  const body = pages
    .map((p) =>
      p.standalone
        ? `<section class="page cover-page">${p.blocks.map((b) => b.html).join("")}</section>`
        : `<section class="${p.blocks.some((b) => b.splittable) ? "page-flow" : "page"}">${p.blocks
            .map(
              (b) =>
                `<div class="${b.splittable ? "block-flow" : "block"}">${b.html}</div>`,
            )
            .join("")}${footerHtml()}</section>`,
    )
    .join("\n");

  return `<!doctype html>
<html><head><meta charset="utf-8" /><style>${adaptiveCss(theme, confidential)}</style></head>
<body>
  ${confidential ? `<div class="watermark">${watermarkText}</div>` : ""}
  ${body}
</body></html>`;
}
