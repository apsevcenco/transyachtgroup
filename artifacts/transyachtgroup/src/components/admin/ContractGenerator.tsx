import { useState, useEffect, useMemo, useRef } from "react";
import { ChevronDown, FileDown, Loader2 } from "lucide-react";
import {
  fetchVehicles,
  fetchBooking,
  generateContract,
  type Booking,
  type ContractGenerateRequest,
} from "@/lib/api";
import { stripTags, vehiclePhotos, type VehicleLite } from "./bookingShared";
import { VehicleThumb } from "./VehicleThumb";

export interface ContractPrefill {
  editContractNumber?: string;
  bookingId?: number;
  vehicleId?: number;
  renterName?: string;
  renterDob?: string;
  renterPob?: string;
  renterNationality?: string;
  renterPassport?: string;
  renterPassportExpiry?: string;
  renterLicence?: string;
  renterLicenceExpiry?: string;
  renterLicenceIssuedBy?: string;
  renterPhone?: string;
  renterEmail?: string;
  pickupDate?: string;
  returnDate?: string;
  pickupLocation?: string;
  returnLocation?: string;
  totalAmount?: number | null;
  depositAmount?: number | null;
  kmPerDay?: number | null;
  extraKmPrice?: number | null;
  representativeName?: string;
}

/** Shared with CarBookingCalendar's "Generate Contract" button so both entry points fill the form identically. */
export function buildContractPrefillFromBooking(
  booking: Booking,
): ContractPrefill {
  return {
    bookingId: booking.id,
    vehicleId: booking.vehicleId,
    renterName: stripTags(booking.clientName) || "",
    renterPhone: booking.clientPhone || "",
    renterEmail: booking.clientEmail || "",
    pickupDate: booking.startDate,
    returnDate: booking.endDate,
    totalAmount: booking.totalAmount ?? null,
    depositAmount: booking.depositAmount ?? null,
    kmPerDay: booking.kmIncluded ?? null,
    extraKmPrice: booking.pricePerExtraKm ?? null,
  };
}

function numToStr(n: number | null | undefined): string {
  return n == null ? "" : String(n);
}

function strToNum(s: string): number {
  const n = Number(s.trim());
  return Number.isFinite(n) ? n : 0;
}

const inputClass =
  "w-full bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-gold/40";
const labelClass =
  "block text-[10px] uppercase tracking-wide text-white/40 mb-1";
const sectionLabelClass =
  "text-[10px] uppercase tracking-[0.2em] text-gold/60 font-medium mb-3";

export function ContractGenerator({
  prefill,
}: {
  prefill?: ContractPrefill | null;
}) {
  const [vehicles, setVehicles] = useState<VehicleLite[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);

  const [bookingIdInput, setBookingIdInput] = useState(
    prefill?.bookingId ? String(prefill.bookingId) : "",
  );
  const [bookingLookupError, setBookingLookupError] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);

  const [vehicleId, setVehicleId] = useState<number | null>(
    prefill?.vehicleId ?? null,
  );
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [vehiclePickerOpen, setVehiclePickerOpen] = useState(false);
  const vehiclePickerRef = useRef<HTMLDivElement>(null);

  const [renterName, setRenterName] = useState(prefill?.renterName || "");
  const [renterDob, setRenterDob] = useState("");
  const [renterPob, setRenterPob] = useState("");
  const [renterNationality, setRenterNationality] = useState("");
  const [renterPassport, setRenterPassport] = useState("");
  const [renterPassportExpiry, setRenterPassportExpiry] = useState("");
  const [renterLicence, setRenterLicence] = useState("");
  const [renterLicenceExpiry, setRenterLicenceExpiry] = useState("");
  const [renterLicenceIssuedBy, setRenterLicenceIssuedBy] = useState("");
  const [renterPhone, setRenterPhone] = useState(prefill?.renterPhone || "");
  const [renterEmail, setRenterEmail] = useState("");

  const [pickupDate, setPickupDate] = useState(prefill?.pickupDate || "");
  const [returnDate, setReturnDate] = useState(prefill?.returnDate || "");
  const [pickupLocation, setPickupLocation] = useState(
    prefill?.pickupLocation || "",
  );
  const [returnLocation, setReturnLocation] = useState(
    prefill?.returnLocation || "",
  );

  const [totalAmount, setTotalAmount] = useState(
    numToStr(prefill?.totalAmount),
  );
  const [depositAmount, setDepositAmount] = useState(
    numToStr(prefill?.depositAmount),
  );
  const [kmPerDay, setKmPerDay] = useState(numToStr(prefill?.kmPerDay));
  const [extraKmPrice, setExtraKmPrice] = useState(
    numToStr(prefill?.extraKmPrice),
  );

  const [representativeName, setRepresentativeName] = useState("");
  const [editContractNumber, setEditContractNumber] = useState(
    prefill?.editContractNumber || "",
  );

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const requestRef = useRef<{ fingerprint: string; requestId: string } | null>(
    null,
  );

  useEffect(() => {
    fetchVehicles(undefined, true, "car")
      .then((v: any[]) =>
        setVehicles(
          v.map((x) => ({
            id: x.id,
            name: stripTags(x.name),
            category: x.category,
            image: x.image || null,
            images: vehiclePhotos(x),
          })),
        ),
      )
      .catch(() => setVehicles([]))
      .finally(() => setLoadingVehicles(false));
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (
        vehiclePickerRef.current &&
        !vehiclePickerRef.current.contains(e.target as Node)
      ) {
        setVehiclePickerOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const selectedVehicle = vehicles.find((v) => v.id === vehicleId) || null;

  const filteredVehicles = useMemo(() => {
    const q = vehicleSearch.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter((v) => v.name.toLowerCase().includes(q));
  }, [vehicles, vehicleSearch]);

  const applyPrefill = (p: ContractPrefill) => {
    setEditContractNumber(p.editContractNumber || "");
    if (p.bookingId != null) setBookingIdInput(String(p.bookingId));
    if (p.vehicleId != null) setVehicleId(p.vehicleId);
    if (p.renterName) setRenterName(p.renterName);
    if (p.renterDob) setRenterDob(p.renterDob);
    if (p.renterPob) setRenterPob(p.renterPob);
    if (p.renterNationality) setRenterNationality(p.renterNationality);
    if (p.renterPassport) setRenterPassport(p.renterPassport);
    if (p.renterPassportExpiry) setRenterPassportExpiry(p.renterPassportExpiry);
    if (p.renterLicence) setRenterLicence(p.renterLicence);
    if (p.renterLicenceExpiry) setRenterLicenceExpiry(p.renterLicenceExpiry);
    if (p.renterLicenceIssuedBy)
      setRenterLicenceIssuedBy(p.renterLicenceIssuedBy);
    if (p.renterPhone) setRenterPhone(p.renterPhone);
    if (p.renterEmail) setRenterEmail(p.renterEmail);
    if (p.pickupDate) setPickupDate(p.pickupDate);
    if (p.returnDate) setReturnDate(p.returnDate);
    if (p.pickupLocation) setPickupLocation(p.pickupLocation);
    if (p.returnLocation) setReturnLocation(p.returnLocation);
    if (p.totalAmount != null) setTotalAmount(numToStr(p.totalAmount));
    if (p.depositAmount != null) setDepositAmount(numToStr(p.depositAmount));
    if (p.kmPerDay != null) setKmPerDay(numToStr(p.kmPerDay));
    if (p.extraKmPrice != null) setExtraKmPrice(numToStr(p.extraKmPrice));
    if (p.representativeName) setRepresentativeName(p.representativeName);
  };

  // Re-apply prefill whenever a fresh one arrives from the parent (e.g. the
  // admin clicks "Generate Contract" on a different booking while this tab
  // is already open).
  useEffect(() => {
    if (prefill) applyPrefill(prefill);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill]);

  const handleLoadBooking = async () => {
    const id = parseInt(bookingIdInput.trim(), 10);
    if (isNaN(id)) {
      setBookingLookupError("Enter a valid booking ID");
      return;
    }
    setBookingLoading(true);
    setBookingLookupError("");
    try {
      const booking = await fetchBooking(id);
      applyPrefill(buildContractPrefillFromBooking(booking));
    } catch (err: any) {
      setBookingLookupError(err.message || "Booking not found");
    } finally {
      setBookingLoading(false);
    }
  };

  const canSubmit =
    !!vehicleId &&
    !!renterName.trim() &&
    !!renterDob &&
    !!renterPob.trim() &&
    !!renterNationality.trim() &&
    !!renterPassport.trim() &&
    !!renterPassportExpiry &&
    !!renterLicence.trim() &&
    !!renterLicenceExpiry &&
    !!renterLicenceIssuedBy.trim() &&
    !!renterPhone.trim() &&
    !!renterEmail.trim() &&
    !!pickupDate &&
    !!returnDate &&
    !!pickupLocation.trim() &&
    !!returnLocation.trim() &&
    totalAmount.trim() !== "" &&
    depositAmount.trim() !== "" &&
    kmPerDay.trim() !== "" &&
    extraKmPrice.trim() !== "" &&
    !!representativeName.trim() &&
    returnDate >= pickupDate;

  const handleGenerate = async () => {
    if (!canSubmit || !vehicleId) return;
    setGenerating(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        bookingId: bookingIdInput.trim()
          ? parseInt(bookingIdInput.trim(), 10)
          : undefined,
        vehicleId,
        renterName: renterName.trim(),
        renterDob,
        renterPob: renterPob.trim(),
        renterNationality: renterNationality.trim(),
        renterPassport: renterPassport.trim(),
        renterPassportExpiry,
        renterLicence: renterLicence.trim(),
        renterLicenceExpiry,
        renterLicenceIssuedBy: renterLicenceIssuedBy.trim(),
        renterPhone: renterPhone.trim(),
        renterEmail: renterEmail.trim(),
        pickupDate,
        returnDate,
        pickupLocation: pickupLocation.trim(),
        returnLocation: returnLocation.trim(),
        totalAmount: strToNum(totalAmount),
        depositAmount: strToNum(depositAmount),
        kmPerDay: strToNum(kmPerDay),
        extraKmPrice: strToNum(extraKmPrice),
        editContractNumber: editContractNumber || undefined,
        representativeName: representativeName.trim(),
      };
      const fingerprint = JSON.stringify(payload);
      if (
        !requestRef.current ||
        requestRef.current.fingerprint !== fingerprint
      ) {
        requestRef.current = {
          fingerprint,
          requestId: crypto.randomUUID(),
        };
      }
      const req: ContractGenerateRequest = {
        ...payload,
        requestId: requestRef.current.requestId,
      };
      const blob = await generateContract(req);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName =
        renterName
          .trim()
          .replace(/\s+/g, "-")
          .replace(/[^\w-]/g, "") || "renter";
      a.download = `contract-${safeName}-${pickupDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      requestRef.current = null;
      setSuccess(
        editContractNumber
          ? `Contract ${editContractNumber} updated and downloaded.`
          : "Contract generated and downloaded.",
      );
    } catch (err: any) {
      setError(err.message || "Failed to generate contract");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-serif text-xl text-white">
          Rental Agreement Generator
        </h2>
      </div>

      {/* Pre-fill from booking */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4 mb-6">
        <p className={sectionLabelClass}>Pre-fill from Booking (optional)</p>
        <div className="flex gap-2">
          <input
            type="number"
            value={bookingIdInput}
            onChange={(e) => setBookingIdInput(e.target.value)}
            placeholder="Booking ID"
            className={inputClass}
          />
          <button
            onClick={handleLoadBooking}
            disabled={bookingLoading}
            className="shrink-0 px-4 py-2 rounded-md text-[11px] uppercase tracking-wide border border-white/10 text-white/60 hover:text-white/80 hover:border-white/20 transition-colors disabled:opacity-50"
          >
            {bookingLoading ? "Loading…" : "Load"}
          </button>
        </div>
        {bookingLookupError && (
          <p className="text-red-400 text-xs mt-2">{bookingLookupError}</p>
        )}
      </div>

      <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-6 space-y-5">
        {/* Vehicle selector */}
        <div>
          <label className={labelClass}>Vehicle</label>
          <div className="relative" ref={vehiclePickerRef}>
            <button
              type="button"
              onClick={() => setVehiclePickerOpen((o) => !o)}
              className={`${inputClass} flex items-center gap-2 min-h-[44px] text-left`}
            >
              <VehicleThumb image={selectedVehicle?.image ?? null} size={28} />
              <span className="flex-1 truncate">
                {selectedVehicle?.name ||
                  (loadingVehicles ? "Loading vehicles…" : "Select vehicle")}
              </span>
              <ChevronDown size={16} className="text-white/40 shrink-0" />
            </button>
            {vehiclePickerOpen && (
              <div className="absolute z-10 mt-1 w-full bg-[#0f0f0f] border border-white/[0.08] rounded-md shadow-lg overflow-hidden">
                <input
                  autoFocus
                  type="text"
                  value={vehicleSearch}
                  onChange={(e) => setVehicleSearch(e.target.value)}
                  placeholder="Search vehicles…"
                  className="w-full bg-white/[0.04] border-b border-white/[0.08] px-3 py-2 text-sm text-white focus:outline-none"
                />
                <div className="max-h-64 overflow-y-auto">
                  {filteredVehicles.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        setVehicleId(v.id);
                        setVehiclePickerOpen(false);
                        setVehicleSearch("");
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 min-h-[44px] hover:bg-white/[0.06] transition-colors text-left"
                    >
                      <VehicleThumb image={v.image} size={28} />
                      <span className="text-sm text-white truncate">
                        {v.name}
                      </span>
                    </button>
                  ))}
                  {filteredVehicles.length === 0 && (
                    <div className="px-3 py-3 text-white/30 text-xs">
                      No vehicles match.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Renter Details */}
        <div className="border-t border-white/[0.06] pt-4">
          <p className={sectionLabelClass}>Renter Details</p>
          <div className="space-y-3">
            <div>
              <label className={labelClass}>Full Name</label>
              <input
                type="text"
                value={renterName}
                onChange={(e) => setRenterName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Date of Birth</label>
                <input
                  type="date"
                  value={renterDob}
                  onChange={(e) => setRenterDob(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Place of Birth</label>
                <input
                  type="text"
                  value={renterPob}
                  onChange={(e) => setRenterPob(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Nationality</label>
                <input
                  type="text"
                  value={renterNationality}
                  onChange={(e) => setRenterNationality(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <input
                  type="text"
                  value={renterPhone}
                  onChange={(e) => setRenterPhone(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                value={renterEmail}
                onChange={(e) => setRenterEmail(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Passport No.</label>
                <input
                  type="text"
                  value={renterPassport}
                  onChange={(e) => setRenterPassport(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Passport Expiry</label>
                <input
                  type="date"
                  value={renterPassportExpiry}
                  onChange={(e) => setRenterPassportExpiry(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Driving Licence No.</label>
                <input
                  type="text"
                  value={renterLicence}
                  onChange={(e) => setRenterLicence(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Licence Expiry</label>
                <input
                  type="date"
                  value={renterLicenceExpiry}
                  onChange={(e) => setRenterLicenceExpiry(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Licence Issued By</label>
              <input
                type="text"
                value={renterLicenceIssuedBy}
                onChange={(e) => setRenterLicenceIssuedBy(e.target.value)}
                className={inputClass}
                placeholder="e.g. Préfecture des Alpes-Maritimes"
              />
            </div>
          </div>
        </div>

        {/* Rental Period */}
        <div className="border-t border-white/[0.06] pt-4">
          <p className={sectionLabelClass}>Rental Period</p>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Pick-up Date</label>
                <input
                  type="date"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Return Date</label>
                <input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Pick-up Location</label>
                <input
                  type="text"
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                  className={inputClass}
                  placeholder="e.g. Nice Côte d'Azur Airport"
                />
              </div>
              <div>
                <label className={labelClass}>Return Location</label>
                <input
                  type="text"
                  value={returnLocation}
                  onChange={(e) => setReturnLocation(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Financials */}
        <div className="border-t border-white/[0.06] pt-4">
          <p className={sectionLabelClass}>Financials</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Total Amount (€)</label>
              <input
                type="number"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Security Deposit (€)</label>
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Km / Day Included</label>
              <input
                type="number"
                value={kmPerDay}
                onChange={(e) => setKmPerDay(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Extra Km Price (€)</label>
              <input
                type="number"
                value={extraKmPrice}
                onChange={(e) => setExtraKmPrice(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Contract number is generated server-side; only the signer is entered here. */}
        <div className="border-t border-white/[0.06] pt-4">
          <div>
            <label className={labelClass}>
              Representative (signs for the company)
            </label>
            <input
              type="text"
              value={representativeName}
              onChange={(e) => setRepresentativeName(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        {error && <p className="text-red-400 text-xs">{error}</p>}
        {success && <p className="text-emerald-400 text-xs">{success}</p>}

        <div className="flex justify-end pt-2">
          <button
            onClick={handleGenerate}
            disabled={!canSubmit || generating}
            className="flex items-center gap-2 bg-[hsl(43,67%,55%)] text-black text-xs uppercase tracking-wide px-5 py-2.5 rounded-md hover:bg-[hsl(43,67%,65%)] disabled:opacity-50 transition-colors"
          >
            {generating ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <FileDown size={14} />
            )}
            {generating
              ? editContractNumber
                ? "Updating…"
                : "Generating…"
              : editContractNumber
                ? `Update ${editContractNumber}`
                : "Generate Contract"}
          </button>
        </div>
      </div>
    </div>
  );
}
