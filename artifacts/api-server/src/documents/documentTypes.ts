/**
 * Shared types for the universal Document Generation Engine.
 *
 * Design principle (do NOT duplicate yacht data in every tool):
 *   - yachtProfile   = shared yacht data (specs, photos)
 *   - reportData     = tool-specific content (for proposals: equipment + pricing + broker)
 *   - exportSettings = template, language, branding, output format
 *
 * The engine is intentionally additive and independent from the existing
 * Expo client-side ("Legacy") proposal PDF generator.
 */

export type DocumentType = "proposal" | "valuation_report" | "roi_report";
export type DocumentFormat = "pdf" | "docx";

export type DocumentEngine = "legacy" | "adaptive";
export type DocumentTemplate = "minimal" | "classic" | "premium";

export type ProposalLanguage =
  | "english"
  | "french"
  | "italian"
  | "spanish"
  | "german"
  | "russian";

export type ProposalType = "sale" | "charter" | "both";

export interface YachtProfile {
  name: string;
  builder?: string | null;
  model?: string | null;
  yacht_type?: string | null;
  year_built?: number | null;
  length_meters?: number | null;
  beam_meters?: number | null;
  draft_meters?: number | null;
  flag?: string | null;
  home_port?: string | null;
  cabins?: number | null;
  guests?: number | null;
  crew?: number | null;
  berths?: number | null;
  heads?: number | null;
  crew_cabins?: number | null;
  engine_maker?: string | null;
  engine_model?: string | null;
  engine_count?: number | null;
  total_hp?: number | null;
  engine_hours?: number | null;
  engine_hours_port?: number | null;
  engine_hours_starboard?: number | null;
  max_speed_knots?: number | null;
  cruising_speed_knots?: number | null;
  range_nm?: number | null;
  fuel_capacity_l?: number | null;
  water_capacity_l?: number | null;
  hull_material?: string | null;
  hull_type?: string | null;
  registration_number?: string | null;
  imo_number?: string | null;
  hull_id?: string | null;
  vat_status?: string | null;
  photo_url?: string | null;
  photo_urls?: string[] | null;
  cover_photo_url?: string | null;
}

export interface ProposalEquipmentItem {
  category?: string | null;
  equipment_type?: string | null;
  brand?: string | null;
  model?: string | null;
  quantity?: number | null;
  power_kw?: number | null;
  power_hp?: number | null;
  capacity_liters?: number | null;
  capacity_persons?: number | null;
  total_watts?: number | null;
  year_installed?: number | null;
  hours?: number | null;
  notes?: string | null;
}

/** Proposal-specific content (NOT yacht specs). */
export interface ProposalReportData {
  equipment?: ProposalEquipmentItem[];
  proposal_type?: ProposalType;
  sale_price_eur?: number | null;
  charter_low_eur_week?: number | null;
  charter_high_eur_week?: number | null;
  charter_apa_pct?: number | null;
  charter_vat_pct?: number | null;
  price_on_application?: boolean | null;
  charter_on_application?: boolean | null;
  delivery?: string | null;
  sea_trial?: string | null;
  charter_area?: string | null;
  myba_contract?: boolean | null;
  notes?: string | null;
  broker_name?: string | null;
  broker_company?: string | null;
  broker_email?: string | null;
  broker_phone?: string | null;
  broker_website?: string | null;
}

/** Broker / surveyor contact block (used by valuation reports). */
export interface BrokerInfo {
  name?: string | null;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
}

export interface ExportSettings {
  template?: DocumentTemplate;
  language?: ProposalLanguage;
  sections?: string[];
  confidential?: boolean;
  brand_name?: string | null;
  accent_color?: string | null;
  branding?: string | null;
  brokerInfo?: BrokerInfo | null;
  engine?: DocumentEngine;
}

// ─── valuation report ──────────────────────────────────────────────────────────

export interface ComparableYacht {
  name?: string | null;
  builder?: string | null;
  model?: string | null;
  year?: number | null;
  length_meters?: number | null;
  price?: number | null;
  currency?: string | null;
  location?: string | null;
  source?: string | null;
  notes?: string | null;
}

export interface ValuationFactor {
  factor?: string | null;
  impact?: string | null;
  weight?: number | null;
  notes?: string | null;
}

export interface ValuationReportData {
  estimatedValueLow?: number | null;
  estimatedValueMid?: number | null;
  estimatedValueHigh?: number | null;
  openMarketValue?: number | null;
  discreetSaleValue?: number | null;
  quickSaleValue?: number | null;
  currency?: string | null;
  comparableYachts?: ComparableYacht[];
  valuationFactors?: ValuationFactor[];
  marketNotes?: string | null;
  confidenceScore?: number | null;
  completenessScore?: number | null;
  completenessFilled?: number | null;
  completenessTotal?: number | null;
  legalDisclaimer?: string | null;
}

// ─── charter ROI report ─────────────────────────────────────────────────────

export interface RoiExpenseLine {
  category?: string | null;
  amount_eur?: number | null;
  formula?: string | null;
}

export interface RoiYearlyPoint {
  year_offset?: number | null;
  value_eur?: number | null;
}

export interface RoiComparableLine {
  name?: string | null;
  location?: string | null;
  weekly_rate_eur?: number | null;
}

/** Exit scenario — sale after 5 years. Present only when purchase price was entered. */
export interface RoiExitScenarioData {
  purchase_price_eur?: number | null;
  charter_income_5y_eur?: number | null;
  vessel_value_at_sale_eur?: number | null;
  total_return_eur?: number | null;
  exit_result_eur?: number | null;
  exit_result_pct?: number | null;
  total_loan_paid_eur?: number | null;
  exit_result_after_loan_eur?: number | null;
}

/** Charter-ROI-specific content (NOT yacht specs). */
export interface RoiReportData {
  annualRevenueEur?: number | null;
  annualExpensesEur?: number | null;
  netProfitEur?: number | null;
  roiPct?: number | null;
  paybackYears?: number | null;
  occupancyPct?: number | null;
  expectedCharterWeeks?: number | null;
  avgDailyRateEur?: number | null;
  dailyRateLowSeasonEur?: number | null;
  dailyRateHighSeasonEur?: number | null;
  marketRating?: string | null;
  riskScore?: number | null;
  currency?: string | null;
  confidence?: string | null;
  regionLabel?: string | null;
  methodology?: string | null;
  reasoning?: string | null;
  recommendations?: string[] | null;
  expenses?: RoiExpenseLine[] | null;
  projection5y?: RoiYearlyPoint[] | null;
  depreciationCurve?: RoiYearlyPoint[] | null;
  comparables?: RoiComparableLine[] | null;
  /** Exit scenario — sale after 5 years (present only when purchase price entered). */
  exitScenario?: RoiExitScenarioData | null;
  legalDisclaimer?: string | null;
}

export interface GenerateDocumentRequest {
  documentType: DocumentType;
  format: DocumentFormat;
  template?: DocumentTemplate;
  yachtProfile: YachtProfile;
  reportData?: ProposalReportData | ValuationReportData | RoiReportData;
  exportSettings?: ExportSettings;
}

export interface GeneratedDocument {
  buffer: Buffer;
  contentType: string;
  fileName: string;
}

export const PDF_CONTENT_TYPE = "application/pdf";
export const DOCX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function normalizeTemplate(t: unknown): DocumentTemplate {
  if (t === "classic") return "classic";
  if (t === "premium" || t === "dark") return "premium";
  return "minimal";
}
