import { renderProposalHtml, type ProposalContact, type RentalDates, type TransferDetails } from "./builders/proposal";
import { renderPdf } from "./pdf/generatePdf";
import { validateImageUrls } from "./core/util";
import { logger } from "../lib/logger";
import {
  PDF_CONTENT_TYPE,
  normalizeTemplate,
  type GenerateDocumentRequest,
  type GeneratedDocument,
} from "./documentTypes";

function safeFileBase(name: string, fallback: string): string {
  const base = (name || fallback)
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 60);
  return base || fallback;
}

/**
 * Universal document dispatcher.
 *
 * Currently supports: documentType "proposal" + format "pdf".
 * Architecture matches YachtWorth so future document types (valuation_report,
 * roi_report) and formats (docx) can be plugged in without touching the route layer.
 *
 * @param contact  Optional contact details fetched by the route layer from the CMS.
 *                 When omitted the builder falls back to its built-in defaults.
 * @param proposalExtras  Admin-only proposal options: a specific rental quote
 *                        (dates/rate/total) or transfer booking, and the
 *                        white-label flag. None of these are exposed on the
 *                        public proposal route.
 */
export async function generateDocument(
  req: GenerateDocumentRequest,
  contact?: ProposalContact,
  proposalExtras?: { rentalDates?: RentalDates; transferDetails?: TransferDetails; whiteLabel?: boolean },
): Promise<GeneratedDocument> {
  if (req.documentType !== "proposal") {
    throw Object.assign(new Error(`Unsupported documentType: ${req.documentType}`), {
      statusCode: 501,
    });
  }

  if (req.format === "docx") {
    throw Object.assign(new Error("DOCX format is not yet supported."), { statusCode: 501 });
  }

  const vehicle = req.yachtProfile as any;
  const settings = req.exportSettings ?? {};
  const template = normalizeTemplate(req.template ?? settings.template);
  const fileBase = safeFileBase(vehicle?.name ?? "proposal", "proposal");

  const candidatePhotos: string[] = Array.isArray(vehicle?.photo_urls)
    ? vehicle.photo_urls
    : [];
  const { valid, rejected } = candidatePhotos.length
    ? await validateImageUrls(candidatePhotos)
    : { valid: [], rejected: [] };

  if (rejected.length) {
    logger.warn(
      { documentType: "proposal", rejected, validCount: valid.length },
      "proposal export: excluded unreachable/non-image photos",
    );
  }

  const html = renderProposalHtml({
    vehicle,
    photos: valid,
    settings,
    template,
    contact,
    rentalDates: proposalExtras?.rentalDates,
    transferDetails: proposalExtras?.transferDetails,
    whiteLabel: proposalExtras?.whiteLabel,
  });
  const buffer = await renderPdf(html);
  return {
    buffer,
    contentType: PDF_CONTENT_TYPE,
    fileName: `${fileBase}_proposal.pdf`,
  };
}
