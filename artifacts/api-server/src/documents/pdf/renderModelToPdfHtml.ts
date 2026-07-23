/**
 * PDF orchestrator: DocumentModel → printable HTML.
 *
 * Composes the three reusable stages: model → blocks → packed pages → HTML.
 * The resulting HTML is fed to the existing puppeteer renderer unchanged.
 */
import { paginateBlocks } from "../core/paginateBlocks";
import { renderBlocksToHtml } from "../core/renderBlocksToHtml";
import { esc } from "../core/util";
import type { DocumentModel } from "../model/types";
import { renderModelToBlocks } from "./renderModelToBlocks";

export function renderModelToPdfHtml(model: DocumentModel): string {
  const blocks = renderModelToBlocks(model);
  const pages = paginateBlocks(blocks);
  return renderBlocksToHtml({
    pages,
    theme: model.theme,
    confidential: model.meta.confidential,
    watermarkText: esc(model.meta.watermarkText),
    footer: {
      brand: model.meta.brand,
      date: model.meta.generatedAt,
      confidentialLabel: model.meta.watermarkText,
    },
  });
}
