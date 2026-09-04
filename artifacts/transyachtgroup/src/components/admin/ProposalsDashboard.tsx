import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Loader2,
  ChevronDown,
  FileDown,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import {
  fetchVehicles,
  checkAvailability,
  generateAdminProposal,
  generateBusinessLetterDraft,
  generateBusinessLetterPdf,
  fetchBusinessLetters,
  saveBusinessLetter,
  deleteBusinessLetter,
  sendBusinessLetter,
  type Booking,
  type BusinessLetterRecord,
  type BusinessLetterCopy,
  uploadAdminPublicImage,
} from "@/lib/api";
import { compressImage } from "@/lib/imageCompress";
import { VehicleThumb } from "./VehicleThumb";
import { FleetOfferSection } from "./FleetOfferSection";
import { stripTags, vehiclePhotos, type VehicleLite } from "./bookingShared";

type GeneratorMode = "single" | "fleet" | "business";
type Lang = "en" | "ru";
type BusinessLang = "en" | "fr" | "ru" | "ro" | "ar";
type Branding = "branded" | "whiteLabel";
type PricingMode = "daily" | "monthly" | "transfer";

interface ProposalVehicle extends VehicleLite {
  specs: Record<string, string>;
}

function safeFileName(name: string): string {
  return (
    name
      .replace(/<[^>]*>/g, "")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-") || "proposal"
  );
}

// Spec values can carry rich-text HTML (the admin editor has saved plain
// numeric fields as "<span style='font-size: 14px;'>2500</span>" before) —
// stripping tags first keeps stray digits from style attributes (the "14"
// in font-size) from leaking into the parsed number.
function parseSpecNumber(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const n = parseInt(stripTags(raw), 10);
  return Number.isFinite(n) ? n : undefined;
}

function fmtEur(n: number): string {
  return `€${n.toLocaleString("en-GB", { maximumFractionDigits: 2 })}`;
}

// Rental industry convention: nights, not inclusive calendar days — June 10
// to June 15 is 5 days, not 6. A same-day pickup/return still counts as a
// full 1-day rental rather than 0 — day count is calendar-based, not tied to
// the pickup/return times.
function calcDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  if (e.getTime() === s.getTime()) return 1;
  const days = Math.round((e.getTime() - s.getTime()) / 86400000);
  return days > 0 ? days : 0;
}

// Calendar-month difference (like "June 10 -> Aug 10" = 2 months), not a
// fixed 30-day approximation. Any non-empty range still counts as at least
// 1 month rather than silently rounding down to 0 — a short custom range
// (e.g. two weeks) is a legitimate one-off "at minimum 1 month" quote, not
// an invalid one, and calcDays() already affords the same "any positive
// range counts" leniency in daily mode.
function calcMonths(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  if (e <= s) return 0;
  let months =
    (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
  if (e.getDate() < s.getDate()) months -= 1;
  return months > 0 ? months : 1;
}

export function ProposalsDashboard() {
  const [generatorMode, setGeneratorMode] = useState<GeneratorMode>("single");

  const [vehicles, setVehicles] = useState<ProposalVehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);

  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [lang, setLang] = useState<Lang>("en");
  const [branding, setBranding] = useState<Branding>("branded");

  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [pickupTime, setPickupTime] = useState("10:00");
  const [returnTime, setReturnTime] = useState("10:00");
  const [pickupLocation, setPickupLocation] = useState("");
  const [returnLocation, setReturnLocation] = useState("");
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availability, setAvailability] = useState<{
    available: boolean;
    conflicts: Booking[];
  } | null>(null);
  const [availabilityError, setAvailabilityError] = useState("");

  const [pricingMode, setPricingMode] = useState<PricingMode>("daily");
  const [pricePerDay, setPricePerDay] = useState("");
  const [pricePerMonth, setPricePerMonth] = useState("");
  const [days, setDays] = useState("");
  const [months, setMonths] = useState("");

  const [transferFrom, setTransferFrom] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [transferDate, setTransferDate] = useState("");
  const [transferTime, setTransferTime] = useState("");
  const [transferPassengers, setTransferPassengers] = useState("");
  const [transferPrice, setTransferPrice] = useState("");

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [businessLang, setBusinessLang] = useState<BusinessLang>("en");
  const [businessRecipientType, setBusinessRecipientType] = useState("Concierge service");
  const [businessRecipientName, setBusinessRecipientName] = useState("");
  const [businessTopic, setBusinessTopic] = useState("");
  const [businessService, setBusinessService] = useState("Luxury car rental and VIP transfers");
  const [businessNotes, setBusinessNotes] = useState("");
  const [businessContactName, setBusinessContactName] = useState("");
  const [businessSignerRole, setBusinessSignerRole] = useState("");
  const [businessImageUrl, setBusinessImageUrl] = useState<string | null>(null);
  const [businessCopy, setBusinessCopy] = useState<BusinessLetterCopy | null>(null);
  const [businessLetters, setBusinessLetters] = useState<BusinessLetterRecord[]>([]);
  const [businessLetterId, setBusinessLetterId] = useState<number | null>(null);
  const [businessRecipients, setBusinessRecipients] = useState("");
  const [businessEmailSubject, setBusinessEmailSubject] = useState("");
  const [businessCoverMessage, setBusinessCoverMessage] = useState("");
  const [businessSendMode, setBusinessSendMode] = useState<"body_only" | "cover_with_pdf">("cover_with_pdf");
  const [businessNotice, setBusinessNotice] = useState("");
  const [uploadingBusinessImage, setUploadingBusinessImage] = useState(false);

  useEffect(() => {
    fetchVehicles(undefined, true)
      .then((v: any[]) =>
        setVehicles(
          v.map((x) => ({
            id: x.id,
            name: stripTags(x.name),
            category: x.category,
            image: x.image || null,
            images: vehiclePhotos(x),
            specs: x.specs || {},
          })),
        ),
      )
      .catch(() => setVehicles([]))
      .finally(() => setLoadingVehicles(false));
  }, []);

  const loadBusinessLetters = useCallback(() => {
    fetchBusinessLetters()
      .then(setBusinessLetters)
      .catch(() => setBusinessLetters([]));
  }, []);

  useEffect(() => {
    loadBusinessLetters();
  }, [loadBusinessLetters]);

  const carVehicles = useMemo(
    () => vehicles.filter((v) => v.category === "car"),
    [vehicles],
  );
  const yachtVehicles = useMemo(
    () => vehicles.filter((v) => v.category === "yacht"),
    [vehicles],
  );
  const selectedVehicle = vehicles.find((v) => v.id === vehicleId) ?? null;

  // Prefill both rates from the vehicle's own specs whenever the selected
  // vehicle changes — still freely editable afterwards for a one-off quote.
  useEffect(() => {
    const specPricePerDay = parseSpecNumber(selectedVehicle?.specs.pricePerDay);
    setPricePerDay(specPricePerDay != null ? String(specPricePerDay) : "");
    const specPricePerMonth = parseSpecNumber(
      selectedVehicle?.specs.pricePerMonth,
    );
    setPricePerMonth(
      specPricePerMonth != null ? String(specPricePerMonth) : "",
    );
  }, [vehicleId]);

  // Auto-compute the period count from the date range, but leave it editable
  // afterwards — same pattern as the rates above.
  useEffect(() => {
    const d = calcDays(dateStart, dateEnd);
    setDays(d > 0 ? String(d) : "");
    const m = calcMonths(dateStart, dateEnd);
    setMonths(m > 0 ? String(m) : "");
  }, [dateStart, dateEnd]);

  const total = useMemo(() => {
    if (pricingMode === "monthly") {
      const m = parseInt(months, 10);
      const p = parseFloat(pricePerMonth);
      return Number.isFinite(m) && m > 0 && Number.isFinite(p) && p > 0
        ? m * p
        : 0;
    }
    const d = parseInt(days, 10);
    const p = parseFloat(pricePerDay);
    return Number.isFinite(d) && d > 0 && Number.isFinite(p) && p > 0
      ? d * p
      : 0;
  }, [pricingMode, days, months, pricePerDay, pricePerMonth]);

  const refPricePerThreeDays = parseSpecNumber(
    selectedVehicle?.specs.pricePerThreeDays,
  );

  const transferComplete =
    transferFrom.trim().length > 0 &&
    transferTo.trim().length > 0 &&
    transferDate.length > 0 &&
    transferTime.length > 0 &&
    Number.isInteger(Number(transferPassengers)) &&
    Number(transferPassengers) > 0 &&
    Number.isFinite(Number(transferPrice)) &&
    Number(transferPrice) > 0;

  // Reset availability state whenever the vehicle or date range changes, and
  // re-check automatically once a full range is picked (debounced).
  useEffect(() => {
    setAvailability(null);
    setAvailabilityError("");
    if (!vehicleId || !dateStart || !dateEnd) return;

    const handle = setTimeout(async () => {
      setCheckingAvailability(true);
      try {
        const result = await checkAvailability(vehicleId, dateStart, dateEnd);
        setAvailability(result);
      } catch (err: any) {
        setAvailabilityError(err.message || "Failed to check availability");
      } finally {
        setCheckingAvailability(false);
      }
    }, 400);

    return () => clearTimeout(handle);
  }, [vehicleId, dateStart, dateEnd]);

  const handleSelectVehicle = useCallback((id: number) => {
    setVehicleId(id);
    setPickerOpen(false);
    setError("");
  }, []);

  const handleGenerate = async () => {
    if (!selectedVehicle) return;
    setGenerating(true);
    setError("");
    try {
      let rentalDates: Parameters<
        typeof generateAdminProposal
      >[1]["rentalDates"];
      let transferDetails: Parameters<
        typeof generateAdminProposal
      >[1]["transferDetails"];

      if (pricingMode === "transfer") {
        const passengers = parseInt(transferPassengers, 10);
        const price = parseFloat(transferPrice);
        if (!transferComplete) {
          throw new Error(
            "Complete all transfer fields: from, to, date, time, passengers and price.",
          );
        }
        transferDetails = {
          from: transferFrom.trim(),
          to: transferTo.trim(),
          date: transferDate,
          time: transferTime,
          passengers,
          price,
        };
      } else {
        const rate = parseFloat(
          pricingMode === "monthly" ? pricePerMonth : pricePerDay,
        );
        const periods = parseInt(pricingMode === "monthly" ? months : days, 10);
        if (
          dateStart &&
          dateEnd &&
          periods > 0 &&
          Number.isFinite(rate) &&
          rate > 0 &&
          total > 0
        ) {
          rentalDates = {
            start: dateStart,
            end: dateEnd,
            mode: pricingMode,
            rate,
            periods,
            total,
            pickupTime,
            returnTime,
            pickupLocation: pickupLocation.trim() || undefined,
            returnLocation: returnLocation.trim() || undefined,
          };
        }
      }

      const blob = await generateAdminProposal(selectedVehicle.id, {
        lang,
        pricingMode,
        rentalDates,
        transferDetails,
        whiteLabel: branding === "whiteLabel",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeFileName(selectedVehicle.name)}-${
        pricingMode === "transfer" ? "transfer-offer" : "proposal"
      }.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || "Failed to generate proposal");
    } finally {
      setGenerating(false);
    }
  };

  const handleBusinessImage = async (file?: File) => {
    if (!file) return;
    setUploadingBusinessImage(true);
    setError("");
    try {
      const compressed = await compressImage(file, 1920, 0.86);
      const url = await uploadAdminPublicImage(compressed, "proposals");
      setBusinessImageUrl(url);
    } catch (err: any) {
      setError(err.message || "Failed to upload image");
    } finally {
      setUploadingBusinessImage(false);
    }
  };

  const handleGenerateBusinessLetter = async () => {
    if (!businessCopy) return;
    setGenerating(true);
    setError("");
    try {
      const blob = await generateBusinessLetterPdf({
        recipientType: businessRecipientType,
        recipientName: businessRecipientName,
        language: businessLang,
        topic: businessTopic,
        service: businessService,
        imageUrl: businessImageUrl,
        contactName: businessContactName,
        signerRole: businessSignerRole,
        copy: businessCopy,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeFileName(businessTopic || "business-letter")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || "Failed to generate business letter");
    } finally {
      setGenerating(false);
    }
  };

  const currentBusinessLetterPayload = () => {
    if (!businessCopy) return null;
    return {
      id: businessLetterId || undefined,
      title: businessTopic || businessCopy.headline,
      recipientType: businessRecipientType,
      recipientName: businessRecipientName,
      language: businessLang,
      topic: businessTopic,
      service: businessService,
      notes: businessNotes,
      imageUrl: businessImageUrl,
      contactName: businessContactName,
      signerRole: businessSignerRole,
      copy: businessCopy,
    };
  };

  const handleSaveBusinessLetter = async () => {
    const payload = currentBusinessLetterPayload();
    if (!payload) return;
    setGenerating(true);
    setError("");
    setBusinessNotice("");
    try {
      const saved = await saveBusinessLetter(payload);
      setBusinessLetterId(saved.id);
      setBusinessNotice("Letter saved.");
      loadBusinessLetters();
    } catch (err: any) {
      setError(err.message || "Failed to save business letter");
    } finally {
      setGenerating(false);
    }
  };

  const handleLoadBusinessLetter = (letter: BusinessLetterRecord) => {
    setBusinessLetterId(letter.id);
    setBusinessRecipientType(letter.recipientType);
    setBusinessRecipientName(letter.recipientName || "");
    setBusinessLang(letter.language);
    setBusinessTopic(letter.topic);
    setBusinessService(letter.service);
    setBusinessNotes(letter.notes || "");
    setBusinessContactName(letter.signerName || letter.copy.signature || "");
    setBusinessSignerRole(letter.signerRole || "");
    setBusinessImageUrl(letter.imageUrl || null);
    setBusinessCopy(letter.copy);
    setBusinessEmailSubject(letter.title || letter.copy.headline || "");
    setBusinessNotice(`Loaded: ${letter.title}`);
    setError("");
  };

  const handleDeleteBusinessLetter = async (id: number) => {
    setGenerating(true);
    setError("");
    setBusinessNotice("");
    try {
      await deleteBusinessLetter(id);
      if (businessLetterId === id) setBusinessLetterId(null);
      setBusinessNotice("Letter deleted.");
      loadBusinessLetters();
    } catch (err: any) {
      setError(err.message || "Failed to delete business letter");
    } finally {
      setGenerating(false);
    }
  };

  const handleSendBusinessLetter = async () => {
    let id = businessLetterId;
    setGenerating(true);
    setError("");
    setBusinessNotice("");
    try {
      if (!id) {
        const payload = currentBusinessLetterPayload();
        if (!payload) return;
        const saved = await saveBusinessLetter(payload);
        id = saved.id;
        setBusinessLetterId(saved.id);
      }
      await sendBusinessLetter(id, businessRecipients, {
        subject: businessEmailSubject || businessTopic || businessCopy?.headline,
        coverMessage: businessCoverMessage,
        attachPdf: businessSendMode === "cover_with_pdf",
        sendMode: businessSendMode,
      });
      setBusinessNotice("Letter sent.");
      loadBusinessLetters();
    } catch (err: any) {
      setError(err.message || "Failed to send business letter");
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateBusinessDraft = async () => {
    setGenerating(true);
    setError("");
    try {
      const draft = await generateBusinessLetterDraft({
        recipientType: businessRecipientType,
        recipientName: businessRecipientName,
        language: businessLang,
        topic: businessTopic,
        service: businessService,
        notes: businessNotes,
        contactName: businessContactName,
      });
      setBusinessCopy({
        ...draft,
        signature: businessContactName.trim() || draft.signature,
      });
      setBusinessEmailSubject(businessTopic || draft.headline);
    } catch (err: any) {
      setError(err.message || "Failed to generate business letter draft");
    } finally {
      setGenerating(false);
    }
  };

  const updateBusinessCopy = (field: keyof BusinessLetterCopy, value: string) => {
    setBusinessCopy((current) => {
      const base: BusinessLetterCopy = current || {
        headline: "",
        subheadline: "",
        greeting: "",
        opening: "",
        valueProposition: "",
        benefits: ["", "", "", ""],
        partnerAngle: "",
        callToAction: "",
        signature: "",
      };
      return { ...base, [field]: value };
    });
  };

  const updateBusinessBenefit = (index: number, value: string) => {
    setBusinessCopy((current) => {
      const base: BusinessLetterCopy = current || {
        headline: "",
        subheadline: "",
        greeting: "",
        opening: "",
        valueProposition: "",
        benefits: ["", "", "", ""],
        partnerAngle: "",
        callToAction: "",
        signature: "",
      };
      const benefits = [...base.benefits];
      benefits[index] = value;
      return { ...base, benefits };
    });
  };

  return (
    <div>
      {/* Generator mode */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          {[
            { key: "single" as GeneratorMode, label: "Single Vehicle" },
            { key: "fleet" as GeneratorMode, label: "Fleet Offer" },
            { key: "business" as GeneratorMode, label: "AI Business Letter" },
          ].map((m) => (
            <button
              key={m.key}
              onClick={() => setGeneratorMode(m.key)}
              className={`min-h-[44px] px-5 rounded-md text-[11px] uppercase tracking-wide border transition-colors ${
                generatorMode === m.key
                  ? "bg-[hsl(43,67%,55%)]/15 border-gold/40 text-gold"
                  : "border-white/10 text-white/50 hover:text-white/70"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {generatorMode === "fleet" ? (
        <FleetOfferSection />
      ) : generatorMode === "business" ? (
        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          <div className="space-y-6">
            <div className="border border-white/[0.08] rounded-lg p-5 bg-white/[0.02]">
              <p className="text-[10px] uppercase tracking-wide text-gold/70 mb-4">
                AI one-page presentation letter
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <label className="text-[10px] uppercase tracking-wide text-white/40">
                  Recipient type
                  <select
                    value={businessRecipientType}
                    onChange={(e) => setBusinessRecipientType(e.target.value)}
                    className="mt-1 w-full bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white min-h-[44px]"
                  >
                    <option>Concierge service</option>
                    <option>Luxury hotel</option>
                    <option>Villa manager</option>
                    <option>Yacht broker</option>
                    <option>Event agency</option>
                    <option>Private aviation partner</option>
                  </select>
                </label>
                <label className="text-[10px] uppercase tracking-wide text-white/40">
                  Addressed to
                  <textarea
                    value={businessRecipientName}
                    onChange={(e) => setBusinessRecipientName(e.target.value)}
                    rows={3}
                    placeholder={"General Manager\nHotel de Paris\nMonaco"}
                    className="mt-1 w-full bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white placeholder:text-white/25"
                  />
                </label>
                <label className="text-[10px] uppercase tracking-wide text-white/40">
                  Language
                  <select
                    value={businessLang}
                    onChange={(e) => setBusinessLang(e.target.value as BusinessLang)}
                    className="mt-1 w-full bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white min-h-[44px]"
                  >
                    <option value="en">English</option>
                    <option value="fr">French</option>
                    <option value="ru">Russian</option>
                    <option value="ro">Romanian</option>
                    <option value="ar">Arabic</option>
                  </select>
                </label>
                <label className="text-[10px] uppercase tracking-wide text-white/40 md:col-span-2">
                  Topic
                  <input
                    value={businessTopic}
                    onChange={(e) => setBusinessTopic(e.target.value)}
                    placeholder="Luxury car rental partnership for Monaco hotels"
                    className="mt-1 w-full bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white min-h-[44px] placeholder:text-white/25"
                  />
                </label>
                <label className="text-[10px] uppercase tracking-wide text-white/40">
                  Service
                  <input
                    value={businessService}
                    onChange={(e) => setBusinessService(e.target.value)}
                    placeholder="Luxury car rental and VIP transfers"
                    className="mt-1 w-full bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white min-h-[44px] placeholder:text-white/25"
                  />
                </label>
                <label className="text-[10px] uppercase tracking-wide text-white/40">
                  Signature line
                  <input
                    value={businessContactName}
                    onChange={(e) => {
                      setBusinessContactName(e.target.value);
                      setBusinessCopy((current) => current ? { ...current, signature: e.target.value } : current);
                    }}
                    placeholder="Andrey"
                    className="mt-1 w-full bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white min-h-[44px] placeholder:text-white/25"
                  />
                </label>
                <label className="text-[10px] uppercase tracking-wide text-white/40">
                  Signer role
                  <input
                    value={businessSignerRole}
                    onChange={(e) => setBusinessSignerRole(e.target.value)}
                    placeholder="General Manager"
                    className="mt-1 w-full bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white min-h-[44px] placeholder:text-white/25"
                  />
                </label>
                <label className="text-[10px] uppercase tracking-wide text-white/40 md:col-span-2">
                  Notes for AI
                  <textarea
                    value={businessNotes}
                    onChange={(e) => setBusinessNotes(e.target.value)}
                    rows={5}
                    placeholder="Mention Courchevel transfers, French Riviera coverage, Monaco, Cannes, Nice, Saint-Tropez, premium fleet, fast concierge response..."
                    className="mt-1 w-full bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white placeholder:text-white/25"
                  />
                </label>
                <div className="md:col-span-2">
                  <p className="text-[10px] uppercase tracking-wide text-white/40 mb-2">
                    One presentation photo
                  </p>
                  <label className="inline-flex cursor-pointer items-center gap-2 min-h-[44px] px-4 rounded-md border border-white/[0.1] text-sm text-white/60 hover:text-gold transition-colors">
                    {uploadingBusinessImage ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <FileDown size={15} />
                    )}
                    {uploadingBusinessImage ? "Uploading..." : "Upload photo"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => handleBusinessImage(e.target.files?.[0])}
                      className="hidden"
                    />
                  </label>
                  {businessImageUrl && (
                    <img src={businessImageUrl} alt="" className="mt-3 h-40 rounded-md object-cover" />
                  )}
                </div>
              </div>
            </div>
            <div className="border border-white/[0.08] rounded-lg p-5 bg-white/[0.02]">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-gold/70">
                    Editable AI draft
                  </p>
                  <p className="mt-1 text-xs text-white/35">
                    Generate the text first, edit it here, then create the PDF.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateBusinessDraft}
                  disabled={!businessTopic.trim() || generating}
                  className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-md border border-gold/30 text-xs uppercase tracking-[0.16em] text-gold hover:bg-gold/10 disabled:opacity-40"
                >
                  {generating ? <Loader2 size={15} className="animate-spin" /> : null}
                  Write with AI
                </button>
              </div>
              {businessCopy ? (
                <div className="grid md:grid-cols-2 gap-4">
                  <label className="text-[10px] uppercase tracking-wide text-white/40 md:col-span-2">
                    Headline
                    <input value={businessCopy.headline} onChange={(e) => updateBusinessCopy("headline", e.target.value)} className="mt-1 w-full bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white min-h-[44px]" />
                  </label>
                  <label className="text-[10px] uppercase tracking-wide text-white/40 md:col-span-2">
                    Subheadline
                    <textarea value={businessCopy.subheadline} onChange={(e) => updateBusinessCopy("subheadline", e.target.value)} rows={2} className="mt-1 w-full bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white" />
                  </label>
                  <label className="text-[10px] uppercase tracking-wide text-white/40">
                    Greeting
                    <input value={businessCopy.greeting} onChange={(e) => updateBusinessCopy("greeting", e.target.value)} className="mt-1 w-full bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white min-h-[44px]" />
                  </label>
                  <label className="text-[10px] uppercase tracking-wide text-white/40">
                    Signature
                    <input value={businessCopy.signature} onChange={(e) => updateBusinessCopy("signature", e.target.value)} className="mt-1 w-full bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white min-h-[44px]" />
                  </label>
                  <label className="text-[10px] uppercase tracking-wide text-white/40 md:col-span-2">
                    Opening
                    <textarea value={businessCopy.opening} onChange={(e) => updateBusinessCopy("opening", e.target.value)} rows={3} className="mt-1 w-full bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white" />
                  </label>
                  <label className="text-[10px] uppercase tracking-wide text-white/40 md:col-span-2">
                    Value proposition
                    <textarea value={businessCopy.valueProposition} onChange={(e) => updateBusinessCopy("valueProposition", e.target.value)} rows={3} className="mt-1 w-full bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white" />
                  </label>
                  <div className="md:col-span-2">
                    <p className="text-[10px] uppercase tracking-wide text-white/40 mb-2">
                      Benefits
                    </p>
                    <div className="grid md:grid-cols-2 gap-3">
                      {businessCopy.benefits.map((benefit, index) => (
                        <input
                          key={index}
                          value={benefit}
                          onChange={(e) => updateBusinessBenefit(index, e.target.value)}
                          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white min-h-[44px]"
                        />
                      ))}
                    </div>
                  </div>
                  <label className="text-[10px] uppercase tracking-wide text-white/40 md:col-span-2">
                    Partner angle
                    <textarea value={businessCopy.partnerAngle} onChange={(e) => updateBusinessCopy("partnerAngle", e.target.value)} rows={3} className="mt-1 w-full bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white" />
                  </label>
                  <label className="text-[10px] uppercase tracking-wide text-white/40 md:col-span-2">
                    Call to action
                    <textarea value={businessCopy.callToAction} onChange={(e) => updateBusinessCopy("callToAction", e.target.value)} rows={2} className="mt-1 w-full bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white" />
                  </label>
                </div>
              ) : (
                <p className="text-sm text-white/35">
                  No draft yet. Fill the topic and click “Write with AI”.
                </p>
              )}
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            {businessNotice && <p className="text-gold text-sm">{businessNotice}</p>}
          </div>

          <div className="border border-white/[0.08] rounded-lg p-5 bg-white/[0.02] h-fit lg:sticky lg:top-6">
            <p className="text-[10px] uppercase tracking-wide text-white/40 mb-3">
              Output
            </p>
            <p className="text-sm text-white/55 leading-6 mb-5">
              Generates a luxury one-page PDF letter with your photo, AI-written
              editable copy, benefits, call to action, logo and Trans Yacht
              Group contacts.
            </p>
            <button
              type="button"
              onClick={handleGenerateBusinessLetter}
              disabled={!businessTopic.trim() || !businessCopy || generating || uploadingBusinessImage}
              className="w-full flex items-center justify-center gap-2 min-h-[44px] bg-[hsl(43,67%,55%)] text-black rounded-md text-xs uppercase tracking-[0.2em] font-medium hover:bg-[hsl(43,67%,60%)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {generating ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Generating…
                </>
              ) : (
                <>
                  <FileDown size={16} /> Generate PDF
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleSaveBusinessLetter}
              disabled={!businessTopic.trim() || !businessCopy || generating}
              className="mt-3 w-full flex items-center justify-center gap-2 min-h-[44px] border border-white/[0.1] text-white/70 rounded-md text-xs uppercase tracking-[0.18em] hover:text-gold hover:border-gold/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Save letter
            </button>
            <label className="block mt-5 text-[10px] uppercase tracking-wide text-white/40">
              Send to email addresses
              <textarea
                value={businessRecipients}
                onChange={(e) => setBusinessRecipients(e.target.value)}
                rows={4}
                placeholder={"client@hotel.com\npartner@concierge.com"}
                className="mt-1 w-full bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white placeholder:text-white/25"
              />
            </label>
            <label className="block mt-3 text-[10px] uppercase tracking-wide text-white/40">
              Email subject
              <input
                value={businessEmailSubject}
                onChange={(e) => setBusinessEmailSubject(e.target.value)}
                placeholder="Luxury partnership proposal"
                className="mt-1 w-full bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white min-h-[44px] placeholder:text-white/25"
              />
            </label>
            <label className="block mt-3 text-[10px] uppercase tracking-wide text-white/40">
              Sending mode
              <select
                value={businessSendMode}
                onChange={(e) => setBusinessSendMode(e.target.value as "body_only" | "cover_with_pdf")}
                className="mt-1 w-full bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white min-h-[44px]"
              >
                <option value="cover_with_pdf">Cover message + PDF attachment</option>
                <option value="body_only">Letter text in email body</option>
              </select>
            </label>
            {businessSendMode === "cover_with_pdf" && (
              <label className="block mt-3 text-[10px] uppercase tracking-wide text-white/40">
                Cover message
                <textarea
                  value={businessCoverMessage}
                  onChange={(e) => setBusinessCoverMessage(e.target.value)}
                  rows={5}
                  placeholder={"Dear Partner,\nPlease find attached our presentation proposal.\nWarm regards,"}
                  className="mt-1 w-full bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white placeholder:text-white/25"
                />
              </label>
            )}
            <button
              type="button"
              onClick={handleSendBusinessLetter}
              disabled={!businessRecipients.trim() || !businessCopy || generating}
              className="mt-3 w-full flex items-center justify-center gap-2 min-h-[44px] border border-gold/30 text-gold rounded-md text-xs uppercase tracking-[0.18em] hover:bg-gold/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Send letter
            </button>
            <div className="mt-6 pt-5 border-t border-white/[0.08]">
              <p className="text-[10px] uppercase tracking-wide text-white/40 mb-3">
                Saved letters
              </p>
              {businessLetters.length ? (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {businessLetters.map((letter) => (
                    <div
                      key={letter.id}
                      className={`rounded-md border p-3 ${
                        businessLetterId === letter.id
                          ? "border-gold/40 bg-gold/10"
                          : "border-white/[0.08] bg-white/[0.03]"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleLoadBusinessLetter(letter)}
                        className="block w-full text-left text-sm text-white hover:text-gold"
                      >
                        {letter.title}
                      </button>
                      <p className="mt-1 text-[11px] text-white/35">
                        {letter.language.toUpperCase()} · {letter.recipientType}
                      </p>
                      {letter.lastSentAt && (
                        <p className="mt-1 text-[11px] text-gold/70">
                          Sent: {new Date(letter.lastSentAt).toLocaleDateString()}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteBusinessLetter(letter.id)}
                        disabled={generating}
                        className="mt-2 text-[10px] uppercase tracking-wide text-red-300/70 hover:text-red-300 disabled:opacity-40"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-white/35">No saved letters yet.</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          <div className="space-y-6">
            {/* Vehicle picker */}
            <div>
              <label className="block text-[10px] uppercase tracking-wide text-white/40 mb-1">
                Vehicle
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setPickerOpen((o) => !o)}
                  disabled={loadingVehicles}
                  className="w-full sm:min-w-[280px] bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white min-h-[44px] flex items-center gap-2 disabled:opacity-50"
                >
                  {selectedVehicle ? (
                    <>
                      <VehicleThumb image={selectedVehicle.image} size={24} />
                      <span className="flex-1 text-left truncate">
                        {selectedVehicle.name}
                      </span>
                    </>
                  ) : (
                    <span className="flex-1 text-left text-white/40">
                      {loadingVehicles
                        ? "Loading vehicles…"
                        : "Select a vehicle…"}
                    </span>
                  )}
                  <ChevronDown size={16} className="text-white/40 shrink-0" />
                </button>
                {pickerOpen && (
                  <div className="absolute z-10 mt-1 w-full sm:min-w-[280px] max-h-72 overflow-y-auto bg-[#0f0f0f] border border-white/[0.08] rounded-md shadow-lg">
                    {carVehicles.length > 0 && (
                      <>
                        <div className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-white/30 bg-white/[0.02]">
                          — Cars —
                        </div>
                        {carVehicles.map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => handleSelectVehicle(v.id)}
                            className="w-full flex items-center gap-2 px-3 py-2 min-h-[44px] hover:bg-white/[0.06] transition-colors text-left"
                          >
                            <VehicleThumb image={v.image} size={24} />
                            <span className="text-sm text-white truncate">
                              {v.name}
                            </span>
                          </button>
                        ))}
                      </>
                    )}
                    {yachtVehicles.length > 0 && (
                      <>
                        <div className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-white/30 bg-white/[0.02]">
                          — Yachts —
                        </div>
                        {yachtVehicles.map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => handleSelectVehicle(v.id)}
                            className="w-full flex items-center gap-2 px-3 py-2 min-h-[44px] hover:bg-white/[0.06] transition-colors text-left"
                          >
                            <VehicleThumb image={v.image} size={24} />
                            <span className="text-sm text-white truncate">
                              {v.name}
                            </span>
                          </button>
                        ))}
                      </>
                    )}
                    {!loadingVehicles && vehicles.length === 0 && (
                      <div className="px-3 py-3 text-sm text-white/40">
                        No vehicles found.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Language + branding */}
            <div className="flex flex-wrap gap-6">
              <div>
                <label className="block text-[10px] uppercase tracking-wide text-white/40 mb-1">
                  Language
                </label>
                <div className="flex gap-1">
                  {(["en", "ru"] as const).map((l) => (
                    <button
                      key={l}
                      onClick={() => setLang(l)}
                      className={`min-h-[44px] px-4 rounded-md text-[11px] uppercase tracking-wide border transition-colors ${
                        lang === l
                          ? "bg-[hsl(43,67%,55%)]/15 border-gold/40 text-gold"
                          : "border-white/10 text-white/50 hover:text-white/70"
                      }`}
                    >
                      {l === "en" ? "English" : "Русский"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wide text-white/40 mb-1">
                  Branding
                </label>
                <div className="flex gap-1">
                  {[
                    { key: "branded" as Branding, label: "Branded" },
                    { key: "whiteLabel" as Branding, label: "White Label" },
                  ].map((b) => (
                    <button
                      key={b.key}
                      onClick={() => setBranding(b.key)}
                      className={`min-h-[44px] px-4 rounded-md text-[11px] uppercase tracking-wide border transition-colors ${
                        branding === b.key
                          ? "bg-[hsl(43,67%,55%)]/15 border-gold/40 text-gold"
                          : "border-white/10 text-white/50 hover:text-white/70"
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Rental quote / transfer */}
            <div>
              <label className="block text-[10px] uppercase tracking-wide text-white/40 mb-1">
                {pricingMode === "transfer"
                  ? "Transfer details (all fields are required)"
                  : "Rental quote (optional — shown on the cover once dates and a rate are set)"}
              </label>

              <div className="mb-3">
                <div className="flex gap-1">
                  {[
                    { key: "daily" as PricingMode, label: "Daily" },
                    { key: "monthly" as PricingMode, label: "Monthly" },
                    { key: "transfer" as PricingMode, label: "Transfer" },
                  ].map((m) => (
                    <button
                      key={m.key}
                      onClick={() => setPricingMode(m.key)}
                      className={`min-h-[44px] px-4 rounded-md text-[11px] uppercase tracking-wide border transition-colors ${
                        pricingMode === m.key
                          ? "bg-[hsl(43,67%,55%)]/15 border-gold/40 text-gold"
                          : "border-white/10 text-white/50 hover:text-white/70"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {pricingMode === "transfer" ? (
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <span className="block text-[10px] text-white/30 mb-1">
                      From
                    </span>
                    <input
                      type="text"
                      value={transferFrom}
                      onChange={(e) => setTransferFrom(e.target.value)}
                      placeholder="Nice Airport"
                      className="w-40 bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white min-h-[44px] placeholder:text-white/25"
                    />
                  </div>
                  <div>
                    <span className="block text-[10px] text-white/30 mb-1">
                      To
                    </span>
                    <input
                      type="text"
                      value={transferTo}
                      onChange={(e) => setTransferTo(e.target.value)}
                      placeholder="Cannes"
                      className="w-40 bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white min-h-[44px] placeholder:text-white/25"
                    />
                  </div>
                  <div>
                    <span className="block text-[10px] text-white/30 mb-1">
                      Date
                    </span>
                    <input
                      type="date"
                      value={transferDate}
                      onChange={(e) => setTransferDate(e.target.value)}
                      className="bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white min-h-[44px]"
                    />
                  </div>
                  <div>
                    <span className="block text-[10px] text-white/30 mb-1">
                      Time
                    </span>
                    <input
                      type="time"
                      value={transferTime}
                      onChange={(e) => setTransferTime(e.target.value)}
                      className="bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white min-h-[44px]"
                    />
                  </div>
                  <div>
                    <span className="block text-[10px] text-white/30 mb-1">
                      Passengers
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={transferPassengers}
                      onChange={(e) => setTransferPassengers(e.target.value)}
                      placeholder="0"
                      className="w-20 bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white min-h-[44px]"
                    />
                  </div>
                  <div>
                    <span className="block text-[10px] text-white/30 mb-1">
                      Price €
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={transferPrice}
                      onChange={(e) => setTransferPrice(e.target.value)}
                      placeholder="0"
                      className="w-28 bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white min-h-[44px]"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-end gap-3">
                    <div>
                      <span className="block text-[10px] text-white/30 mb-1">
                        From
                      </span>
                      <input
                        type="date"
                        value={dateStart}
                        onChange={(e) => setDateStart(e.target.value)}
                        className="bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white min-h-[44px]"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-white/30 mb-1">
                        To
                      </span>
                      <input
                        type="date"
                        value={dateEnd}
                        onChange={(e) => setDateEnd(e.target.value)}
                        className="bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white min-h-[44px]"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-white/30 mb-1">
                        Pickup time
                      </span>
                      <input
                        type="time"
                        value={pickupTime}
                        onChange={(e) => setPickupTime(e.target.value)}
                        className="bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white min-h-[44px]"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-white/30 mb-1">
                        Return time
                      </span>
                      <input
                        type="time"
                        value={returnTime}
                        onChange={(e) => setReturnTime(e.target.value)}
                        className="bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white min-h-[44px]"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-white/30 mb-1">
                        Pickup location
                      </span>
                      <input
                        type="text"
                        value={pickupLocation}
                        onChange={(e) => setPickupLocation(e.target.value)}
                        placeholder="Cannes, France"
                        className="w-40 bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white min-h-[44px] placeholder:text-white/25"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-white/30 mb-1">
                        Return location
                      </span>
                      <input
                        type="text"
                        value={returnLocation}
                        onChange={(e) => setReturnLocation(e.target.value)}
                        placeholder="Cannes, France"
                        className="w-40 bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white min-h-[44px] placeholder:text-white/25"
                      />
                    </div>

                    {pricingMode === "daily" ? (
                      <>
                        <div>
                          <span className="block text-[10px] text-white/30 mb-1">
                            Price / day
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={pricePerDay}
                            onChange={(e) => setPricePerDay(e.target.value)}
                            placeholder="0"
                            className="w-28 bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white min-h-[44px]"
                          />
                        </div>
                        <div>
                          <span className="block text-[10px] text-white/30 mb-1">
                            Days
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={days}
                            onChange={(e) => setDays(e.target.value)}
                            placeholder="0"
                            className="w-20 bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white min-h-[44px]"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <span className="block text-[10px] text-white/30 mb-1">
                            Price / month
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={pricePerMonth}
                            onChange={(e) => setPricePerMonth(e.target.value)}
                            placeholder="0"
                            className="w-28 bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white min-h-[44px]"
                          />
                        </div>
                        <div>
                          <span className="block text-[10px] text-white/30 mb-1">
                            Months
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={months}
                            onChange={(e) => setMonths(e.target.value)}
                            placeholder="0"
                            className="w-20 bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white min-h-[44px]"
                          />
                        </div>
                      </>
                    )}

                    <div>
                      <span className="block text-[10px] text-white/30 mb-1">
                        Total
                      </span>
                      <input
                        type="text"
                        readOnly
                        value={total > 0 ? fmtEur(total) : "—"}
                        className="w-28 bg-white/[0.02] border border-white/[0.06] rounded-md px-3 py-2 text-sm text-gold min-h-[44px] cursor-default"
                      />
                    </div>
                    {(dateStart || dateEnd) && (
                      <button
                        onClick={() => {
                          setDateStart("");
                          setDateEnd("");
                        }}
                        className="min-h-[44px] px-3 text-[11px] uppercase tracking-wide text-white/40 hover:text-gold transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {refPricePerThreeDays != null && (
                    <p className="text-[11px] text-white/30 mt-2">
                      Reference — 3-day: {fmtEur(refPricePerThreeDays)}
                    </p>
                  )}

                  {!vehicleId && (dateStart || dateEnd) && (
                    <p className="text-[11px] text-white/30 mt-2">
                      Select a vehicle to check availability.
                    </p>
                  )}

                  {checkingAvailability && (
                    <p className="flex items-center gap-2 text-[11px] text-white/40 mt-2">
                      <Loader2 size={13} className="animate-spin" /> Checking
                      availability…
                    </p>
                  )}

                  {availabilityError && (
                    <p className="text-[11px] text-red-400 mt-2">
                      {availabilityError}
                    </p>
                  )}

                  {!checkingAvailability && availability && (
                    <div className="mt-2">
                      {availability.available ? (
                        <p className="flex items-center gap-2 text-[12px] text-green-400">
                          <CheckCircle2 size={14} /> Available for these dates
                        </p>
                      ) : (
                        <div className="text-[12px] text-amber-400">
                          <p className="flex items-center gap-2 mb-1">
                            <AlertTriangle size={14} /> Already booked for these
                            dates:
                          </p>
                          <ul className="space-y-0.5 pl-6 list-disc text-white/60">
                            {availability.conflicts.map((c) => (
                              <li key={c.id}>
                                {stripTags(c.clientName) || "Unnamed client"} —{" "}
                                {c.startDate} → {c.endDate} ({c.status})
                              </li>
                            ))}
                          </ul>
                          <p className="text-white/30 mt-1">
                            This is informational only — you can still generate
                            the proposal.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}
          </div>

          {/* Preview / action panel */}
          <div className="border border-white/[0.08] rounded-lg p-5 bg-white/[0.02] h-fit lg:sticky lg:top-6">
            <p className="text-[10px] uppercase tracking-wide text-white/40 mb-3">
              Preview
            </p>
            {selectedVehicle ? (
              <div className="flex items-center gap-3 mb-5">
                <VehicleThumb image={selectedVehicle.image} size={56} />
                <div className="min-w-0">
                  <p className="font-porter text-white text-sm truncate">
                    {selectedVehicle.name}
                  </p>
                  <p className="text-[11px] uppercase tracking-wide text-white/40">
                    {selectedVehicle.category}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-white/30 text-sm mb-5">No vehicle selected.</p>
            )}

            {selectedVehicle &&
              pricingMode !== "transfer" &&
              dateStart &&
              dateEnd &&
              total > 0 && (
                <div className="mb-5 text-[12px] text-white/60 border-t border-white/[0.06] pt-3">
                  {pickupLocation.trim() && returnLocation.trim() ? (
                    <>
                      <p>
                        Pickup: {pickupLocation}, {dateStart}, {pickupTime}
                      </p>
                      <p>
                        Return: {returnLocation}, {dateEnd}, {returnTime}
                      </p>
                    </>
                  ) : (
                    <p>
                      {dateStart}, {pickupTime} → {dateEnd}, {returnTime}
                    </p>
                  )}
                  <p>
                    {pricingMode === "monthly"
                      ? `${months} months × ${fmtEur(parseFloat(pricePerMonth) || 0)}/month`
                      : `${days} days × ${fmtEur(parseFloat(pricePerDay) || 0)}/day`}
                  </p>
                  <p className="text-gold">= {fmtEur(total)}</p>
                </div>
              )}

            {selectedVehicle &&
              pricingMode === "transfer" &&
              transferFrom &&
              transferTo &&
              Number(transferPrice) > 0 && (
                <div className="mb-5 text-[12px] text-white/60 border-t border-white/[0.06] pt-3">
                  <p>
                    {transferFrom} → {transferTo}
                  </p>
                  {(transferDate || transferTime) && (
                    <p>
                      {transferDate} {transferTime && `· ${transferTime}`}
                    </p>
                  )}
                  {Number(transferPassengers) > 0 && (
                    <p>{transferPassengers} passengers</p>
                  )}
                  <p className="text-gold">{fmtEur(Number(transferPrice))}</p>
                </div>
              )}

            {selectedVehicle && branding === "whiteLabel" && (
              <p className="mb-5 text-[11px] text-amber-400/80">
                White Label — no logo or contact details.
              </p>
            )}

            <button
              type="button"
              onClick={handleGenerate}
              disabled={!selectedVehicle || generating}
              className="w-full flex items-center justify-center gap-2 min-h-[44px] bg-[hsl(43,67%,55%)] text-black rounded-md text-xs uppercase tracking-[0.2em] font-medium hover:bg-[hsl(43,67%,60%)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {generating ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Generating…
                </>
              ) : (
                <>
                  <FileDown size={16} /> Generate & Download
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
