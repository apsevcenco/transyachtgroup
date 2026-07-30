import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  X,
  Trash2,
  ChevronDown,
  Camera,
  ImagePlus,
  FileText,
  FileDown,
  Pencil,
} from "lucide-react";
import {
  fetchVehicles,
  fetchBookings,
  createBooking,
  updateBooking,
  deleteBooking,
  checkAvailability,
  fetchAgent,
  fetchBookingContracts,
  downloadStoredContract,
  type Booking,
  type BookingInput,
  type StoredContract,
} from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { GanttGrid } from "./GanttGrid";
import { VehicleThumb } from "./VehicleThumb";
import { VehiclePhotoModal } from "./VehiclePhotoModal";
import { supabase } from "@/lib/supabaseClient";
import { compressImage } from "@/lib/imageCompress";
import {
  STATUSES,
  STATUS_LABELS,
  stripTags,
  toISODate,
  numToStr,
  strToNum,
  vehiclePhotos,
  type VehicleLite,
  type EditTarget,
} from "./bookingShared";

const BLOCKING_STATUSES: Booking["status"][] = ["confirmed", "tentative"];

const CONTRACT_STATUSES = ["not_signed", "sent", "signed"] as const;
const CONTRACT_LABELS: Record<string, string> = {
  not_signed: "Not Signed",
  sent: "Sent",
  signed: "Signed",
};

const DEPOSIT_STATUSES = ["received", "returned", "partial"] as const;
const DEPOSIT_STATUS_LABELS: Record<string, string> = {
  received: "Received",
  returned: "Returned",
  partial: "Partial",
};

const MAX_BOOKING_PHOTOS = 15;

function fmtMoney(n: number): string {
  return `€${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

type SortOrder = "az" | "za";
type OwnershipFilter = "all" | "own" | "agent";

export function CarBookingCalendar({
  onGenerateContract,
}: {
  /** Wired up by the admin dashboard — switches to the Contracts tab pre-filled with this booking. */
  onGenerateContract?: (booking: Booking, contract?: StoredContract) => void;
} = {}) {
  const [vehicles, setVehicles] = useState<VehicleLite[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [monthStart, setMonthStart] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<EditTarget | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("az");
  const [ownershipFilter, setOwnershipFilter] =
    useState<OwnershipFilter>("all");

  const days = useMemo(() => {
    const daysInMonth = new Date(
      monthStart.getFullYear(),
      monthStart.getMonth() + 1,
      0,
    ).getDate();
    return Array.from(
      { length: daysInMonth },
      (_, i) =>
        new Date(monthStart.getFullYear(), monthStart.getMonth(), i + 1),
    );
  }, [monthStart]);

  const rangeStart = toISODate(days[0]);
  const rangeEnd = toISODate(days[days.length - 1]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [v, b] = await Promise.all([
        fetchVehicles(undefined, true, "car"),
        fetchBookings({ start: rangeStart, end: rangeEnd }),
      ]);
      setVehicles(
        v.map((x: any) => ({
          id: x.id,
          name: stripTags(x.name),
          category: x.category,
          image: x.image || null,
          images: vehiclePhotos(x),
          ownership: x.ownership || "own",
          agentId: x.agentId ?? null,
          pricePerDay: strToNum(String(x.specs?.pricePerDay ?? "")),
          pricePerMonth: strToNum(String(x.specs?.pricePerMonth ?? "")),
        })),
      );
      setBookings(b);
    } catch (err: any) {
      setError(err.message || "Failed to load calendar");
    } finally {
      setLoading(false);
    }
  }, [rangeStart, rangeEnd]);

  useEffect(() => {
    load();
  }, [load]);

  const visibleVehicles = useMemo(() => {
    const filtered =
      ownershipFilter === "all"
        ? vehicles
        : vehicles.filter((v) => (v.ownership || "own") === ownershipFilter);
    return filtered
      .slice()
      .sort((a, b) =>
        sortOrder === "az"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name),
      );
  }, [vehicles, ownershipFilter, sortOrder]);

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <label className="block text-[10px] uppercase tracking-wide text-white/40 mb-1">
            Sort
          </label>
          <button
            onClick={() => setSortOrder((s) => (s === "az" ? "za" : "az"))}
            className="min-h-[44px] px-4 rounded-md text-[11px] uppercase tracking-wide border border-white/10 text-white/60 hover:text-white/80 hover:border-white/20 transition-colors"
          >
            Name {sortOrder === "az" ? "A → Z" : "Z → A"}
          </button>
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-wide text-white/40 mb-1">
            Ownership
          </label>
          <div className="flex gap-1">
            {(["all", "own", "agent"] as const).map((o) => (
              <button
                key={o}
                onClick={() => setOwnershipFilter(o)}
                className={`min-h-[44px] px-4 rounded-md text-[11px] uppercase tracking-wide border transition-colors ${
                  ownershipFilter === o
                    ? "bg-[hsl(43,67%,55%)]/15 border-gold/40 text-gold"
                    : "border-white/10 text-white/50 hover:text-white/70"
                }`}
              >
                {o === "all"
                  ? "All"
                  : o === "own"
                    ? "Our vehicles"
                    : "Agent vehicles"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <GanttGrid
        vehicles={visibleVehicles}
        bookings={bookings}
        days={days}
        monthLabel={monthStart.toLocaleString("en-US", {
          month: "long",
          year: "numeric",
        })}
        loading={loading}
        error={error}
        emptyLabel="No cars found."
        onPrevMonth={() =>
          setMonthStart((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
        }
        onNextMonth={() =>
          setMonthStart((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
        }
        onToday={() => {
          const d = new Date();
          d.setDate(1);
          setMonthStart(d);
        }}
        onDayClick={(vehicleId, date) => setEditing({ vehicleId, date })}
        onBarClick={(booking) =>
          setEditing({ booking, vehicleId: booking.vehicleId })
        }
      />

      {vehicles.length > 0 && (
        <button
          onClick={() =>
            setEditing({
              vehicleId: vehicles[0].id,
              date: toISODate(new Date()),
            })
          }
          className="lg:hidden fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-[hsl(43,67%,55%)] text-black shadow-lg shadow-black/40 flex items-center justify-center text-2xl font-light hover:bg-[hsl(43,67%,65%)] transition-colors"
          aria-label="New car booking"
        >
          +
        </button>
      )}

      {editing && (
        <CarBookingFormModal
          vehicles={vehicles}
          target={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
          onGenerateContract={onGenerateContract}
        />
      )}
    </div>
  );
}

function CarBookingFormModal({
  vehicles,
  target,
  onClose,
  onSaved,
  onGenerateContract,
}: {
  vehicles: VehicleLite[];
  target: EditTarget;
  onClose: () => void;
  onSaved: () => void;
  onGenerateContract?: (booking: Booking, contract?: StoredContract) => void;
}) {
  const { t } = useLanguage();
  const editingBooking = target.booking;
  const [vehicleId, setVehicleId] = useState(target.vehicleId);
  const [vehiclePickerOpen, setVehiclePickerOpen] = useState(false);
  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);
  const [startDate, setStartDate] = useState(
    editingBooking?.startDate || target.date || "",
  );
  const [endDate, setEndDate] = useState(
    editingBooking?.endDate || target.date || "",
  );
  const [status, setStatus] = useState<Booking["status"]>(
    editingBooking?.status || "confirmed",
  );
  const [clientName, setClientName] = useState(
    stripTags(editingBooking?.clientName) || "",
  );
  const [clientPhone, setClientPhone] = useState(
    editingBooking?.clientPhone || "",
  );
  const [notes, setNotes] = useState(editingBooking?.notes || "");
  const [totalAmount, setTotalAmount] = useState(
    numToStr(editingBooking?.totalAmount),
  );
  const [rentalPeriodType, setRentalPeriodType] = useState<"daily" | "monthly">(
    editingBooking?.rentalPeriodType || "daily",
  );
  const [pricePerDayInput, setPricePerDayInput] = useState(() =>
    numToStr(selectedVehicle?.pricePerDay),
  );
  const [pricePerMonthInput, setPricePerMonthInput] = useState(() =>
    numToStr(selectedVehicle?.pricePerMonth),
  );
  const [depositAmount, setDepositAmount] = useState(
    numToStr(editingBooking?.depositAmount),
  );
  const [vatPercent, setVatPercent] = useState(
    numToStr(editingBooking?.vatPercent),
  );
  const [agentCommissionPercent, setAgentCommissionPercent] = useState(
    numToStr(editingBooking?.agentCommissionPercent),
  );
  const [contractStatus, setContractStatus] = useState(
    editingBooking?.contractStatus || "not_signed",
  );
  const [kmIncluded, setKmIncluded] = useState(
    numToStr(editingBooking?.kmIncluded),
  );
  const [pricePerExtraKm, setPricePerExtraKm] = useState(
    numToStr(editingBooking?.pricePerExtraKm),
  );
  const [agentName, setAgentName] = useState(editingBooking?.agentName || "");
  const [agentPhone, setAgentPhone] = useState(
    editingBooking?.agentPhone || "",
  );
  const [agentEmail, setAgentEmail] = useState(
    editingBooking?.agentEmail || "",
  );
  const [odometerOut, setOdometerOut] = useState(
    numToStr(editingBooking?.odometerOut),
  );
  const [odometerIn, setOdometerIn] = useState(
    numToStr(editingBooking?.odometerIn),
  );
  const [depositStatus, setDepositStatus] = useState<
    "" | "received" | "returned" | "partial"
  >(editingBooking?.depositStatus || "");
  const [driverCost, setDriverCost] = useState(
    numToStr(editingBooking?.driverCost),
  );
  const [fuelCost, setFuelCost] = useState(numToStr(editingBooking?.fuelCost));
  const [tollCost, setTollCost] = useState(numToStr(editingBooking?.tollCost));
  const [deliveryCost, setDeliveryCost] = useState(
    numToStr(editingBooking?.deliveryCost),
  );
  const [bookingPhotos, setBookingPhotos] = useState<string[]>(
    editingBooking?.bookingPhotos || [],
  );
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [photoPreviewIndex, setPhotoPreviewIndex] = useState<number | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [conflicts, setConflicts] = useState<Booking[]>([]);
  const [previewVehicle, setPreviewVehicle] = useState<VehicleLite | null>(
    null,
  );
  const [savedContracts, setSavedContracts] = useState<StoredContract[]>([]);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [contractDownloading, setContractDownloading] = useState<string | null>(
    null,
  );

  // A new booking has no id yet — use a stable per-session placeholder as the
  // storage folder name so uploads have somewhere to go before the first save.
  const photoFolderId = useRef(
    editingBooking?.id ??
      `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  ).current;
  const photoFileInputRef = useRef<HTMLInputElement>(null);
  const photoCameraInputRef = useRef<HTMLInputElement>(null);
  const isReadOnly = editingBooking?.status === "completed";

  useEffect(() => {
    if (!editingBooking?.id) {
      setSavedContracts([]);
      return;
    }
    let cancelled = false;
    setContractsLoading(true);
    fetchBookingContracts(editingBooking.id)
      .then((contracts) => {
        if (!cancelled) setSavedContracts(contracts);
      })
      .catch(() => {
        if (!cancelled) setSavedContracts([]);
      })
      .finally(() => {
        if (!cancelled) setContractsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [editingBooking?.id]);

  const handleDownloadContract = async (contractNumber: string) => {
    setContractDownloading(contractNumber);
    setError("");
    try {
      const blob = await downloadStoredContract(contractNumber);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `contract-${contractNumber}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to download contract",
      );
    } finally {
      setContractDownloading(null);
    }
  };

  useEffect(() => {
    if (
      isReadOnly ||
      !vehicleId ||
      !startDate ||
      !endDate ||
      endDate < startDate
    ) {
      setConflicts([]);
      return;
    }
    let cancelled = false;
    checkAvailability(vehicleId, startDate, endDate)
      .then((res) => {
        if (cancelled) return;
        setConflicts(res.conflicts.filter((c) => c.id !== editingBooking?.id));
      })
      .catch(() => {
        if (!cancelled) setConflicts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [vehicleId, startDate, endDate, editingBooking?.id, isReadOnly]);

  const blockingConflicts = conflicts.filter((c) =>
    BLOCKING_STATUSES.includes(c.status),
  );
  const isOwnVehicle = (selectedVehicle?.ownership || "own") === "own";

  const calc = useMemo(() => {
    const total = strToNum(totalAmount) ?? 0;
    const deposit = strToNum(depositAmount) ?? 0;
    const vat = strToNum(vatPercent) ?? 0;
    const commission = strToNum(agentCommissionPercent) ?? 0;
    const included = strToNum(kmIncluded) ?? 0;
    const extraPrice = strToNum(pricePerExtraKm) ?? 0;
    const out = strToNum(odometerOut);
    const in_ = strToNum(odometerIn);
    const driver = strToNum(driverCost) ?? 0;
    const fuel = strToNum(fuelCost) ?? 0;
    const toll = strToNum(tollCost) ?? 0;
    const delivery = strToNum(deliveryCost) ?? 0;

    const actualKm = out != null && in_ != null ? in_ - out : null;
    const extraKm = actualKm != null ? Math.max(0, actualKm - included) : null;
    const extraKmCharge = extraKm != null ? extraKm * extraPrice : 0;
    const vatAmount = total * (vat / 100);
    const totalWithVat = total + vatAmount;
    const agentCommissionAmount = total * (commission / 100);
    const totalExpenses = driver + fuel + toll + delivery;
    const netProfit =
      total - agentCommissionAmount + extraKmCharge - totalExpenses;
    const depositToReturn = Math.max(0, deposit - extraKmCharge);

    return {
      total,
      vat,
      actualKm,
      extraKm,
      extraKmCharge,
      vatAmount,
      totalWithVat,
      agentCommissionAmount,
      totalExpenses,
      netProfit,
      depositToReturn,
    };
  }, [
    totalAmount,
    depositAmount,
    vatPercent,
    agentCommissionPercent,
    kmIncluded,
    pricePerExtraKm,
    odometerOut,
    odometerIn,
    driverCost,
    fuelCost,
    tollCost,
    deliveryCost,
  ]);

  const agentCalc = useMemo(() => {
    const total = strToNum(totalAmount) ?? 0;
    const commission = strToNum(agentCommissionPercent) ?? 0;
    const commissionAmount = total * (commission / 100);
    return { commissionAmount, profit: commissionAmount };
  }, [totalAmount, agentCommissionPercent]);

  // Pre-fill agent contact from the vehicle's linked agent record — only for
  // brand-new bookings, so opening an existing booking never silently
  // overwrites agent info that was already saved (possibly hand-edited).
  useEffect(() => {
    if (isOwnVehicle || editingBooking || !selectedVehicle?.agentId) return;
    let cancelled = false;
    fetchAgent(selectedVehicle.agentId)
      .then((agent) => {
        if (cancelled) return;
        setAgentName(agent.name || "");
        setAgentPhone(agent.phone || "");
        setAgentEmail(agent.email || "");
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selectedVehicle?.agentId, isOwnVehicle, editingBooking]);

  // Pre-fill the per-day/per-month rate from the vehicle's specs — only for
  // brand-new bookings (or when the vehicle selection changes on one), so
  // opening an existing booking never overwrites a hand-edited rate.
  useEffect(() => {
    if (editingBooking) return;
    setPricePerDayInput(numToStr(selectedVehicle?.pricePerDay));
    setPricePerMonthInput(numToStr(selectedVehicle?.pricePerMonth));
  }, [selectedVehicle?.id, editingBooking]);

  const rentalCalc = useMemo(() => {
    const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
    const end = endDate ? new Date(`${endDate}T00:00:00`) : null;
    // Full 24-hour periods only — e.g. June 8 to June 12 is 4 days, not 5.
    const days =
      start && end && end >= start
        ? Math.floor((end.getTime() - start.getTime()) / 86400000)
        : 0;
    // 30-day months, rounded up — matches how monthly car rental rates are
    // quoted in practice (no calendar-month edge cases to reason about).
    const months = days > 0 ? Math.max(1, Math.ceil(days / 30)) : 0;
    const dayRate = strToNum(pricePerDayInput) ?? 0;
    const monthRate = strToNum(pricePerMonthInput) ?? 0;
    const autoTotal =
      rentalPeriodType === "daily" ? days * dayRate : months * monthRate;
    return { days, months, dayRate, monthRate, autoTotal };
  }, [
    startDate,
    endDate,
    rentalPeriodType,
    pricePerDayInput,
    pricePerMonthInput,
  ]);

  // Keep totalAmount in sync with the rental-period auto-calc, but never on
  // the very first render of an existing booking — that would silently
  // overwrite a saved total with one derived from the vehicle's current
  // pricing the moment the admin opens it. A brand-new booking has no saved
  // total to protect, so it computes immediately.
  const skipInitialRentalCalc = useRef(!!editingBooking);
  useEffect(() => {
    if (skipInitialRentalCalc.current) {
      skipInitialRentalCalc.current = false;
      return;
    }
    setTotalAmount(String(Math.round(rentalCalc.autoTotal)));
  }, [rentalCalc.autoTotal]);

  const uploadBookingPhoto = async (file: File): Promise<string | null> => {
    try {
      const compressed = await compressImage(file, 800, 0.85);
      const safeName = compressed.name
        .replace(/\s+/g, "-")
        .replace(/[^\w.-]/g, "");
      const path = `booking-photos/${photoFolderId}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("vehicle_images")
        .upload(path, compressed, { upsert: false });
      if (uploadError) {
        console.error("Booking photo upload error:", uploadError);
        return null;
      }

      const { data } = supabase.storage
        .from("vehicle_images")
        .getPublicUrl(path);
      return data.publicUrl;
    } catch (err) {
      console.error("Booking photo upload crashed:", err);
      return null;
    }
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remaining = MAX_BOOKING_PHOTOS - bookingPhotos.length;
    if (remaining <= 0) {
      e.target.value = "";
      return;
    }

    const toUpload = Array.from(files).slice(0, remaining);
    setUploadingPhotos(true);

    const newUrls: string[] = [];
    for (const file of toUpload) {
      const url = await uploadBookingPhoto(file);
      if (url) newUrls.push(url);
    }

    if (newUrls.length > 0) {
      setBookingPhotos((prev) => [...prev, ...newUrls]);
    }
    setUploadingPhotos(false);
    e.target.value = "";
  };

  const removeBookingPhoto = (index: number) => {
    setBookingPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!startDate || !endDate) {
      setError("Start and end dates are required");
      return;
    }
    if (endDate < startDate) {
      setError("End date must not be before start date");
      return;
    }
    if (blockingConflicts.length > 0) {
      setError("Resolve the booking conflict before saving.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload: BookingInput = {
        vehicleId,
        startDate,
        endDate,
        status,
        clientName: clientName.trim() || null,
        clientPhone: clientPhone.trim() || null,
        notes: notes.trim() || null,
        source: editingBooking?.source || "manual",
        icalUrl: editingBooking?.icalUrl || null,
        rentalPeriodType,
        totalAmount: strToNum(totalAmount),
        agentCommissionPercent: strToNum(agentCommissionPercent),
        agentName: agentName.trim() || null,
        agentPhone: agentPhone.trim() || null,
        agentEmail: agentEmail.trim() || null,
        // Deposit/VAT/km/contract/odometer only apply to "own" vehicles —
        // explicitly null them for agent vehicles so switching a booking's
        // vehicle between own/agent never leaves stale values behind.
        depositAmount: isOwnVehicle ? strToNum(depositAmount) : null,
        vatPercent: isOwnVehicle ? strToNum(vatPercent) : null,
        contractStatus: isOwnVehicle ? contractStatus : null,
        kmIncluded: isOwnVehicle ? strToNum(kmIncluded) : null,
        pricePerExtraKm: isOwnVehicle ? strToNum(pricePerExtraKm) : null,
        odometerOut: isOwnVehicle ? strToNum(odometerOut) : null,
        odometerIn: isOwnVehicle ? strToNum(odometerIn) : null,
        depositStatus: isOwnVehicle ? depositStatus || null : null,
        driverCost: isOwnVehicle ? strToNum(driverCost) : null,
        fuelCost: isOwnVehicle ? strToNum(fuelCost) : null,
        tollCost: isOwnVehicle ? strToNum(tollCost) : null,
        deliveryCost: isOwnVehicle ? strToNum(deliveryCost) : null,
        bookingPhotos,
      };
      if (editingBooking) {
        await updateBooking(editingBooking.id, payload);
      } else {
        await createBooking(payload);
      }
      onSaved();
    } catch (err: any) {
      setError(err.message || "Failed to save booking");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingBooking) return;
    if (!confirm("Delete this booking?")) return;
    setDeleting(true);
    setError("");
    try {
      await deleteBooking(editingBooking.id);
      onSaved();
    } catch (err: any) {
      setError(err.message || "Failed to delete booking");
      setDeleting(false);
    }
  };

  const inputClass =
    "w-full bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-gold/40";
  const labelClass =
    "block text-[10px] uppercase tracking-wide text-white/40 mb-1";

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#0f0f0f] border border-white/[0.08] rounded-xl w-full max-w-md p-6 relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>

        <h3 className="font-porter text-white text-lg mb-5">
          {editingBooking ? "Edit Car Booking" : "New Car Booking"}
        </h3>

        <div className="space-y-3.5">
          <div>
            <label className={labelClass}>Vehicle</label>

            {/* Desktop: native select + tappable thumbnail for photo preview */}
            <div className="hidden lg:flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  selectedVehicle && setPreviewVehicle(selectedVehicle)
                }
                aria-label="Preview vehicle photos"
                title="View photos"
                className="shrink-0"
              >
                <VehicleThumb
                  image={selectedVehicle?.image ?? null}
                  size={40}
                />
              </button>
              <select
                value={vehicleId}
                onChange={(e) => setVehicleId(parseInt(e.target.value, 10))}
                disabled={isReadOnly}
                className={`${inputClass} disabled:opacity-50`}
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Mobile: thumbnail picker */}
            <div className="lg:hidden relative">
              <button
                type="button"
                onClick={() => !isReadOnly && setVehiclePickerOpen((o) => !o)}
                disabled={isReadOnly}
                className={`${inputClass} flex items-center gap-2 min-h-[44px] disabled:opacity-50`}
              >
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    if (selectedVehicle) setPreviewVehicle(selectedVehicle);
                  }}
                  aria-label="Preview vehicle photos"
                >
                  <VehicleThumb
                    image={selectedVehicle?.image ?? null}
                    size={32}
                  />
                </span>
                <span className="flex-1 text-left truncate">
                  {selectedVehicle?.name || "Select vehicle"}
                </span>
                <ChevronDown size={16} className="text-white/40 shrink-0" />
              </button>
              {vehiclePickerOpen && (
                <div className="absolute z-10 mt-1 w-full max-h-64 overflow-y-auto bg-[#0f0f0f] border border-white/[0.08] rounded-md shadow-lg">
                  {vehicles.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        setVehicleId(v.id);
                        setVehiclePickerOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 min-h-[44px] hover:bg-white/[0.06] transition-colors text-left"
                    >
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewVehicle(v);
                        }}
                        aria-label="Preview vehicle photos"
                      >
                        <VehicleThumb image={v.image} size={32} />
                      </span>
                      <span className="text-sm text-white truncate">
                        {v.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {isReadOnly && (
            <div className="bg-green-600/10 border border-green-600/30 rounded-md p-3">
              <p className="text-green-400 text-xs font-medium">
                This rental is completed and read-only.
              </p>
            </div>
          )}

          {blockingConflicts.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-md p-3 space-y-1.5">
              <p className="text-red-400 text-xs font-medium">
                ⚠ Booking conflict — this vehicle is already booked:
              </p>
              {blockingConflicts.map((c) => (
                <p key={c.id} className="text-red-300/80 text-[11px]">
                  {stripTags(c.clientName) || "Unnamed client"} —{" "}
                  {STATUS_LABELS[c.status]} ({c.startDate} → {c.endDate})
                </p>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Start date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={isReadOnly}
                className={`${inputClass} disabled:opacity-50`}
              />
            </div>
            <div>
              <label className={labelClass}>End date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={isReadOnly}
                className={`${inputClass} disabled:opacity-50`}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Booking["status"])}
              disabled={isReadOnly}
              className={`${inputClass} disabled:opacity-50`}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Client name</label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              disabled={isReadOnly}
              className={`${inputClass} disabled:opacity-50`}
            />
          </div>

          <div>
            <label className={labelClass}>Client phone</label>
            <input
              type="text"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              disabled={isReadOnly}
              className={`${inputClass} disabled:opacity-50`}
            />
          </div>

          <div>
            <label className={labelClass}>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              disabled={isReadOnly}
              className={`${inputClass} resize-none disabled:opacity-50`}
            />
          </div>

          <div className="border-t border-white/[0.06] pt-3.5 space-y-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-gold/60 font-medium">
              Rental Period
            </p>

            <div className="flex gap-1">
              {(["daily", "monthly"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setRentalPeriodType(p)}
                  disabled={isReadOnly}
                  className={`min-h-[36px] px-4 rounded-md text-[11px] uppercase tracking-wide border transition-colors disabled:opacity-50 ${
                    rentalPeriodType === p
                      ? "bg-[hsl(43,67%,55%)]/15 border-gold/40 text-gold"
                      : "border-white/10 text-white/50 hover:text-white/70"
                  }`}
                >
                  {p === "daily" ? "Daily" : "Monthly"}
                </button>
              ))}
            </div>

            {rentalPeriodType === "daily" ? (
              <div>
                <label className={labelClass}>Price per day (€)</label>
                <input
                  type="number"
                  value={pricePerDayInput}
                  onChange={(e) => setPricePerDayInput(e.target.value)}
                  disabled={isReadOnly}
                  className={`${inputClass} disabled:opacity-50`}
                />
              </div>
            ) : (
              <div>
                <label className={labelClass}>Price per month (€)</label>
                <input
                  type="number"
                  value={pricePerMonthInput}
                  onChange={(e) => setPricePerMonthInput(e.target.value)}
                  disabled={isReadOnly}
                  className={`${inputClass} disabled:opacity-50`}
                />
              </div>
            )}

            <p className="text-xs text-white/50">
              {rentalPeriodType === "daily"
                ? `${rentalCalc.days} day${rentalCalc.days === 1 ? "" : "s"} × ${fmtMoney(rentalCalc.dayRate)}/day = ${fmtMoney(rentalCalc.autoTotal)} total`
                : `${rentalCalc.months} month${rentalCalc.months === 1 ? "" : "s"} × ${fmtMoney(rentalCalc.monthRate)}/month = ${fmtMoney(rentalCalc.autoTotal)} total`}
            </p>
          </div>

          {isOwnVehicle && (
            <div className="border-t border-white/[0.06] pt-3.5 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>
                    {t("booking_total_amount")} (€)
                  </label>
                  <input
                    type="number"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    disabled={isReadOnly}
                    className={`${inputClass} disabled:opacity-50`}
                  />
                </div>
                <div>
                  <label className={labelClass}>{t("spec_deposit")} (€)</label>
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    disabled={isReadOnly}
                    className={`${inputClass} disabled:opacity-50`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>
                    {t("booking_vat_percent")}
                  </label>
                  <input
                    type="number"
                    value={vatPercent}
                    onChange={(e) => setVatPercent(e.target.value)}
                    disabled={isReadOnly}
                    className={`${inputClass} disabled:opacity-50`}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    {t("booking_agent_commission")}
                  </label>
                  <input
                    type="number"
                    value={agentCommissionPercent}
                    onChange={(e) => setAgentCommissionPercent(e.target.value)}
                    disabled={isReadOnly}
                    className={`${inputClass} disabled:opacity-50`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>{t("spec_km_included")}</label>
                  <input
                    type="number"
                    value={kmIncluded}
                    onChange={(e) => setKmIncluded(e.target.value)}
                    disabled={isReadOnly}
                    className={`${inputClass} disabled:opacity-50`}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    {t("spec_extra_price_km")} (€)
                  </label>
                  <input
                    type="number"
                    value={pricePerExtraKm}
                    onChange={(e) => setPricePerExtraKm(e.target.value)}
                    disabled={isReadOnly}
                    className={`${inputClass} disabled:opacity-50`}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>
                  {t("booking_contract_signed")}
                </label>
                <select
                  value={contractStatus}
                  onChange={(e) =>
                    setContractStatus(e.target.value as typeof contractStatus)
                  }
                  disabled={isReadOnly}
                  className={`${inputClass} disabled:opacity-50`}
                >
                  {CONTRACT_STATUSES.map((c) => (
                    <option key={c} value={c}>
                      {CONTRACT_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {!isOwnVehicle && (
            <div className="border-t border-white/[0.06] pt-3.5 space-y-3.5">
              <p className="text-[10px] uppercase tracking-[0.2em] text-gold/60 font-medium">
                Agent
              </p>

              <div>
                <label className={labelClass}>Agent name</label>
                <input
                  type="text"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  disabled={isReadOnly}
                  className={`${inputClass} disabled:opacity-50`}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Agent phone</label>
                  <input
                    type="text"
                    value={agentPhone}
                    onChange={(e) => setAgentPhone(e.target.value)}
                    disabled={isReadOnly}
                    className={`${inputClass} disabled:opacity-50`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Agent email</label>
                  <input
                    type="email"
                    value={agentEmail}
                    onChange={(e) => setAgentEmail(e.target.value)}
                    disabled={isReadOnly}
                    className={`${inputClass} disabled:opacity-50`}
                  />
                </div>
              </div>

              <p className="text-[10px] uppercase tracking-[0.2em] text-gold/60 font-medium pt-1">
                Financials
              </p>

              <div>
                <label className={labelClass}>Total rental amount (€)</label>
                <input
                  type="number"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  disabled={isReadOnly}
                  className={`${inputClass} disabled:opacity-50`}
                />
              </div>
              <div>
                <label className={labelClass}>Our commission (%)</label>
                <input
                  type="number"
                  value={agentCommissionPercent}
                  onChange={(e) => setAgentCommissionPercent(e.target.value)}
                  disabled={isReadOnly}
                  className={`${inputClass} disabled:opacity-50`}
                />
              </div>

              <div className="border-t border-white/[0.06] pt-3.5 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Our commission amount</span>
                  <span className="text-white">
                    {fmtMoney(agentCalc.commissionAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Our profit</span>
                  <span className="text-gold font-medium">
                    {fmtMoney(agentCalc.profit)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {isOwnVehicle && (
            <div className="border-t border-white/[0.06] pt-3.5 space-y-3.5">
              <p className="text-[10px] uppercase tracking-[0.2em] text-gold/60 font-medium">
                Agent Contact
              </p>

              <div>
                <label className={labelClass}>Agent name</label>
                <input
                  type="text"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  disabled={isReadOnly}
                  className={`${inputClass} disabled:opacity-50`}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Agent phone</label>
                  <input
                    type="text"
                    value={agentPhone}
                    onChange={(e) => setAgentPhone(e.target.value)}
                    disabled={isReadOnly}
                    className={`${inputClass} disabled:opacity-50`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Agent email</label>
                  <input
                    type="email"
                    value={agentEmail}
                    onChange={(e) => setAgentEmail(e.target.value)}
                    disabled={isReadOnly}
                    className={`${inputClass} disabled:opacity-50`}
                  />
                </div>
              </div>

              <p className="text-[10px] uppercase tracking-[0.2em] text-gold/60 font-medium pt-1">
                Odometer &amp; Deposit
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Odometer out (km)</label>
                  <input
                    type="number"
                    value={odometerOut}
                    onChange={(e) => setOdometerOut(e.target.value)}
                    disabled={isReadOnly}
                    className={`${inputClass} disabled:opacity-50`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Odometer in (km)</label>
                  <input
                    type="number"
                    value={odometerIn}
                    onChange={(e) => setOdometerIn(e.target.value)}
                    disabled={isReadOnly}
                    className={`${inputClass} disabled:opacity-50`}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Deposit status</label>
                <select
                  value={depositStatus}
                  onChange={(e) =>
                    setDepositStatus(e.target.value as typeof depositStatus)
                  }
                  disabled={isReadOnly}
                  className={`${inputClass} disabled:opacity-50`}
                >
                  <option value="">—</option>
                  {DEPOSIT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {DEPOSIT_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>

              <p className="text-[10px] uppercase tracking-[0.2em] text-gold/60 font-medium pt-1">
                Additional Expenses
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Driver cost €</label>
                  <input
                    type="number"
                    value={driverCost}
                    onChange={(e) => setDriverCost(e.target.value)}
                    disabled={isReadOnly}
                    className={`${inputClass} disabled:opacity-50`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Fuel €</label>
                  <input
                    type="number"
                    value={fuelCost}
                    onChange={(e) => setFuelCost(e.target.value)}
                    disabled={isReadOnly}
                    className={`${inputClass} disabled:opacity-50`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Toll roads €</label>
                  <input
                    type="number"
                    value={tollCost}
                    onChange={(e) => setTollCost(e.target.value)}
                    disabled={isReadOnly}
                    className={`${inputClass} disabled:opacity-50`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Delivery €</label>
                  <input
                    type="number"
                    value={deliveryCost}
                    onChange={(e) => setDeliveryCost(e.target.value)}
                    disabled={isReadOnly}
                    className={`${inputClass} disabled:opacity-50`}
                  />
                </div>
              </div>

              <div className="border-t border-white/[0.06] pt-3.5 space-y-1.5">
                <p className="text-[10px] uppercase tracking-[0.2em] text-gold/60 font-medium mb-1.5">
                  Calculations
                </p>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Actual km</span>
                  <span className="text-white">
                    {calc.actualKm != null
                      ? `${calc.actualKm.toLocaleString()} km`
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Extra km</span>
                  <span className="text-white">
                    {calc.extraKm != null
                      ? `${calc.extraKm.toLocaleString()} km`
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Extra km charge</span>
                  <span className="text-white">
                    {fmtMoney(calc.extraKmCharge)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">VAT</span>
                  <span className="text-white">
                    Total: {fmtMoney(calc.total)} + VAT ({calc.vat}%) ={" "}
                    {fmtMoney(calc.totalWithVat)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Agent commission amount</span>
                  <span className="text-white">
                    {fmtMoney(calc.agentCommissionAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">
                    Total expenses (driver + fuel + toll + delivery)
                  </span>
                  <span className="text-white">
                    {fmtMoney(calc.totalExpenses)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Net profit</span>
                  <span className="text-gold font-medium">
                    {fmtMoney(calc.netProfit)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Deposit to return</span>
                  <span className="text-white">
                    {fmtMoney(calc.depositToReturn)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="border-t border-white/[0.06] pt-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.2em] text-gold/60 font-medium">
                Photos ({bookingPhotos.length}/{MAX_BOOKING_PHOTOS})
              </p>
              {!isReadOnly && bookingPhotos.length < MAX_BOOKING_PHOTOS && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => photoFileInputRef.current?.click()}
                    disabled={uploadingPhotos}
                    className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-white/50 hover:text-white transition-colors disabled:opacity-50 min-h-[32px]"
                  >
                    <ImagePlus size={14} /> Add
                  </button>
                  <button
                    type="button"
                    onClick={() => photoCameraInputRef.current?.click()}
                    disabled={uploadingPhotos}
                    className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-white/50 hover:text-white transition-colors disabled:opacity-50 min-h-[32px]"
                  >
                    <Camera size={14} /> Camera
                  </button>
                </div>
              )}
            </div>

            <input
              ref={photoFileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handlePhotoSelect}
            />
            <input
              ref={photoCameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhotoSelect}
            />

            {uploadingPhotos && (
              <p className="text-[11px] text-white/40">Uploading…</p>
            )}

            {bookingPhotos.length > 0 ? (
              <div className="grid grid-cols-4 gap-2">
                {bookingPhotos.map((url, i) => (
                  <div key={i} className="relative">
                    <button
                      type="button"
                      onClick={() => setPhotoPreviewIndex(i)}
                      className="block w-full aspect-square rounded-md overflow-hidden bg-white/[0.04]"
                    >
                      <img
                        src={url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </button>
                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeBookingPhoto(i);
                        }}
                        aria-label="Remove photo"
                        className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-red-500/80 hover:bg-red-500 rounded-full text-white text-xs flex items-center justify-center transition-colors"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-white/30">No photos yet.</p>
            )}
          </div>

          {editingBooking?.source === "ical" && (
            <p className="text-[10px] text-white/30">
              Imported from iCal feed — editing will detach it from future
              syncs.
            </p>
          )}

          {editingBooking && (
            <div className="border border-white/[0.06] rounded-lg p-4 space-y-2">
              <p className="text-[10px] uppercase tracking-[0.2em] text-gold/60 font-medium">
                Saved Contract PDF
              </p>
              {contractsLoading ? (
                <p className="text-[11px] text-white/30">Loading…</p>
              ) : savedContracts.length ? (
                savedContracts.map((contract) => (
                  <div
                    key={contract.contractNumber}
                    className="flex items-center gap-2 rounded-md border border-white/[0.08] px-3 py-2"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-white">
                        {contract.contractNumber}
                      </span>
                      <span className="text-[10px] text-white/35">
                        {contract.issuedAt
                          ? new Date(contract.issuedAt).toLocaleDateString(
                              "en-GB",
                            )
                          : "Issued contract"}
                      </span>
                    </span>
                    {onGenerateContract && contract.snapshot && (
                      <button
                        type="button"
                        onClick={() => {
                          onGenerateContract(editingBooking, contract);
                          onClose();
                        }}
                        aria-label={`Edit ${contract.contractNumber}`}
                        className="p-2 text-white/50 hover:text-gold transition-colors"
                      >
                        <Pencil size={15} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        handleDownloadContract(contract.contractNumber)
                      }
                      disabled={contractDownloading === contract.contractNumber}
                      aria-label={`Download ${contract.contractNumber}`}
                      className="p-2 text-white/50 hover:text-white disabled:opacity-50 transition-colors"
                    >
                      <FileDown size={15} />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-[11px] text-white/30">
                  No saved contract yet.
                </p>
              )}
            </div>
          )}

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <div className="flex items-center justify-between pt-2">
            {editingBooking ? (
              <button
                onClick={handleDelete}
                disabled={deleting || saving}
                className="flex items-center gap-1.5 text-red-400/80 hover:text-red-400 text-xs disabled:opacity-50 transition-colors"
              >
                <Trash2 size={14} /> {deleting ? "Deleting…" : "Delete"}
              </button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              {editingBooking && onGenerateContract && (
                <button
                  type="button"
                  onClick={() => {
                    onGenerateContract(editingBooking);
                    onClose();
                  }}
                  className="flex items-center gap-1.5 text-xs uppercase tracking-wide px-4 py-2.5 rounded-md border border-white/10 text-white/60 hover:text-white/80 hover:border-white/20 transition-colors"
                >
                  <FileText size={14} /> Generate Contract
                </button>
              )}
              {!isReadOnly && (
                <button
                  onClick={handleSave}
                  disabled={saving || deleting || blockingConflicts.length > 0}
                  className="bg-[hsl(43,67%,55%)] text-black text-xs uppercase tracking-wide px-5 py-2.5 rounded-md hover:bg-[hsl(43,67%,65%)] disabled:opacity-50 transition-colors"
                >
                  {saving
                    ? "Saving…"
                    : editingBooking
                      ? "Save Changes"
                      : "Create Booking"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {previewVehicle && (
        <VehiclePhotoModal
          images={previewVehicle.images}
          name={previewVehicle.name}
          onClose={() => setPreviewVehicle(null)}
        />
      )}

      {photoPreviewIndex != null && (
        <VehiclePhotoModal
          images={bookingPhotos}
          name="Booking photo"
          initialIndex={photoPreviewIndex}
          onClose={() => setPhotoPreviewIndex(null)}
        />
      )}
    </div>
  );
}
