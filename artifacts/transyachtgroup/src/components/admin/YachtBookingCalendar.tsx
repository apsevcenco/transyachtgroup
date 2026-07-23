import { useState, useEffect, useMemo, useCallback } from "react";
import { X, Trash2, ChevronDown } from "lucide-react";
import {
  fetchVehicles,
  fetchBookings,
  createBooking,
  updateBooking,
  deleteBooking,
  checkAvailability,
  type Booking,
  type BookingInput,
} from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { GanttGrid } from "./GanttGrid";
import { VehicleThumb } from "./VehicleThumb";
import { VehiclePhotoModal } from "./VehiclePhotoModal";
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
const CONTRACT_LABELS: Record<string, string> = { not_signed: "Not Signed", sent: "Sent", signed: "Signed" };
const RATE_PERIODS = ["fixed", "per_day", "per_week"] as const;
const RATE_PERIOD_LABELS: Record<string, string> = { fixed: "Fixed total", per_day: "Per day", per_week: "Per week" };

export function YachtBookingCalendar() {
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

  const days = useMemo(() => {
    const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => new Date(monthStart.getFullYear(), monthStart.getMonth(), i + 1));
  }, [monthStart]);

  const rangeStart = toISODate(days[0]);
  const rangeEnd = toISODate(days[days.length - 1]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [v, b] = await Promise.all([
        fetchVehicles(undefined, true, "yacht"),
        fetchBookings({ start: rangeStart, end: rangeEnd }),
      ]);
      setVehicles(
        v.map((x: any) => ({
          id: x.id,
          name: stripTags(x.name),
          category: x.category,
          image: x.image || null,
          images: vehiclePhotos(x),
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

  return (
    <div>
      <GanttGrid
        vehicles={vehicles}
        bookings={bookings}
        days={days}
        monthLabel={monthStart.toLocaleString("en-US", { month: "long", year: "numeric" })}
        loading={loading}
        error={error}
        emptyLabel="No yachts found."
        onPrevMonth={() => setMonthStart((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
        onNextMonth={() => setMonthStart((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
        onToday={() => {
          const d = new Date();
          d.setDate(1);
          setMonthStart(d);
        }}
        onDayClick={(vehicleId, date) => setEditing({ vehicleId, date })}
        onBarClick={(booking) => setEditing({ booking, vehicleId: booking.vehicleId })}
      />

      {vehicles.length > 0 && (
        <button
          onClick={() => setEditing({ vehicleId: vehicles[0].id, date: toISODate(new Date()) })}
          className="lg:hidden fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-[hsl(43,67%,55%)] text-black shadow-lg shadow-black/40 flex items-center justify-center text-2xl font-light hover:bg-[hsl(43,67%,65%)] transition-colors"
          aria-label="New yacht charter"
        >
          +
        </button>
      )}

      {editing && (
        <YachtBookingFormModal
          vehicles={vehicles}
          target={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function YachtBookingFormModal({
  vehicles,
  target,
  onClose,
  onSaved,
}: {
  vehicles: VehicleLite[];
  target: EditTarget;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useLanguage();
  const editingBooking = target.booking;
  const [vehicleId, setVehicleId] = useState(target.vehicleId);
  const [vehiclePickerOpen, setVehiclePickerOpen] = useState(false);
  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);
  const [startDate, setStartDate] = useState(editingBooking?.startDate || target.date || "");
  const [endDate, setEndDate] = useState(editingBooking?.endDate || target.date || "");
  const [status, setStatus] = useState<Booking["status"]>(editingBooking?.status || "confirmed");
  const [clientName, setClientName] = useState(stripTags(editingBooking?.clientName) || "");
  const [clientPhone, setClientPhone] = useState(editingBooking?.clientPhone || "");
  const [notes, setNotes] = useState(editingBooking?.notes || "");
  const [totalAmount, setTotalAmount] = useState(numToStr(editingBooking?.totalAmount));
  const [depositAmount, setDepositAmount] = useState(numToStr(editingBooking?.depositAmount));
  const [vatPercent, setVatPercent] = useState(numToStr(editingBooking?.vatPercent));
  const [agentCommissionPercent, setAgentCommissionPercent] = useState(numToStr(editingBooking?.agentCommissionPercent));
  const [contractStatus, setContractStatus] = useState(editingBooking?.contractStatus || "not_signed");
  const [kmIncluded, setKmIncluded] = useState(numToStr(editingBooking?.kmIncluded));
  const [pricePerExtraKm, setPricePerExtraKm] = useState(numToStr(editingBooking?.pricePerExtraKm));
  // Yacht-specific
  const [departurePort, setDeparturePort] = useState(editingBooking?.departurePort || "");
  const [returnPort, setReturnPort] = useState(editingBooking?.returnPort || "");
  const [charterRate, setCharterRate] = useState(numToStr(editingBooking?.charterRate));
  const [charterRatePeriod, setCharterRatePeriod] = useState(editingBooking?.charterRatePeriod || "fixed");
  const [captainName, setCaptainName] = useState(editingBooking?.captainName || "");
  const [captainDayRate, setCaptainDayRate] = useState(numToStr(editingBooking?.captainDayRate));
  const [stewardessCount, setStewardessCount] = useState(numToStr(editingBooking?.stewardessCount));
  const [stewardessDayRate, setStewardessDayRate] = useState(numToStr(editingBooking?.stewardessDayRate));
  const [deckhandCount, setDeckhandCount] = useState(numToStr(editingBooking?.deckhandCount));
  const [deckhandDayRate, setDeckhandDayRate] = useState(numToStr(editingBooking?.deckhandDayRate));
  const [apaAmount, setApaAmount] = useState(numToStr(editingBooking?.apaAmount));
  const [depositPaid, setDepositPaid] = useState(editingBooking?.depositPaid ?? false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [conflicts, setConflicts] = useState<Booking[]>([]);
  const [previewVehicle, setPreviewVehicle] = useState<VehicleLite | null>(null);
  const isReadOnly = editingBooking?.status === "completed";

  useEffect(() => {
    if (isReadOnly || !vehicleId || !startDate || !endDate || endDate < startDate) {
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

  const blockingConflicts = conflicts.filter((c) => BLOCKING_STATUSES.includes(c.status));

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
        totalAmount: strToNum(totalAmount),
        depositAmount: strToNum(depositAmount),
        vatPercent: strToNum(vatPercent),
        agentCommissionPercent: strToNum(agentCommissionPercent),
        contractStatus,
        kmIncluded: strToNum(kmIncluded),
        pricePerExtraKm: strToNum(pricePerExtraKm),
        departurePort: departurePort.trim() || null,
        returnPort: returnPort.trim() || null,
        charterRate: strToNum(charterRate),
        charterRatePeriod,
        captainName: captainName.trim() || null,
        captainDayRate: strToNum(captainDayRate),
        stewardessCount: strToNum(stewardessCount),
        stewardessDayRate: strToNum(stewardessDayRate),
        deckhandCount: strToNum(deckhandCount),
        deckhandDayRate: strToNum(deckhandDayRate),
        apaAmount: strToNum(apaAmount),
        depositPaid,
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
  const labelClass = "block text-[10px] uppercase tracking-wide text-white/40 mb-1";
  const sectionLabelClass = "text-[10px] uppercase tracking-[0.2em] text-gold/60 font-medium mb-2";

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#0f0f0f] border border-white/[0.08] rounded-xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors">
          <X size={18} />
        </button>

        <h3 className="font-porter text-white text-lg mb-5">{editingBooking ? "Edit Yacht Charter" : "New Yacht Charter"}</h3>

        <div className="space-y-3.5">
          <div>
            <label className={labelClass}>Yacht</label>

            {/* Desktop: native select + tappable thumbnail for photo preview */}
            <div className="hidden lg:flex items-center gap-2">
              <button
                type="button"
                onClick={() => selectedVehicle && setPreviewVehicle(selectedVehicle)}
                aria-label="Preview vehicle photos"
                title="View photos"
                className="shrink-0"
              >
                <VehicleThumb image={selectedVehicle?.image ?? null} size={40} />
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
                  <VehicleThumb image={selectedVehicle?.image ?? null} size={32} />
                </span>
                <span className="flex-1 text-left truncate">{selectedVehicle?.name || "Select yacht"}</span>
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
                      <span className="text-sm text-white truncate">{v.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {isReadOnly && (
            <div className="bg-green-600/10 border border-green-600/30 rounded-md p-3">
              <p className="text-green-400 text-xs font-medium">This rental is completed and read-only.</p>
            </div>
          )}

          {blockingConflicts.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-md p-3 space-y-1.5">
              <p className="text-red-400 text-xs font-medium">⚠ Booking conflict — this vehicle is already booked:</p>
              {blockingConflicts.map((c) => (
                <p key={c.id} className="text-red-300/80 text-[11px]">
                  {stripTags(c.clientName) || "Unnamed client"} — {STATUS_LABELS[c.status]} ({c.startDate} → {c.endDate})
                </p>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Start date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={isReadOnly} className={`${inputClass} disabled:opacity-50`} />
            </div>
            <div>
              <label className={labelClass}>End date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={isReadOnly} className={`${inputClass} disabled:opacity-50`} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as Booking["status"])} disabled={isReadOnly} className={`${inputClass} disabled:opacity-50`}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Client name</label>
            <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} disabled={isReadOnly} className={`${inputClass} disabled:opacity-50`} />
          </div>

          <div>
            <label className={labelClass}>Client phone</label>
            <input type="text" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} disabled={isReadOnly} className={`${inputClass} disabled:opacity-50`} />
          </div>

          {/* Logistics */}
          <div className="border-t border-white/[0.06] pt-3.5">
            <p className={sectionLabelClass}>Logistics</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Departure port</label>
                <input type="text" value={departurePort} onChange={(e) => setDeparturePort(e.target.value)} disabled={isReadOnly} className={`${inputClass} disabled:opacity-50`} />
              </div>
              <div>
                <label className={labelClass}>Return port</label>
                <input type="text" value={returnPort} onChange={(e) => setReturnPort(e.target.value)} disabled={isReadOnly} className={`${inputClass} disabled:opacity-50`} />
              </div>
            </div>
          </div>

          {/* Crew */}
          <div className="border-t border-white/[0.06] pt-3.5">
            <p className={sectionLabelClass}>Crew</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className={labelClass}>Captain name</label>
                <input type="text" value={captainName} onChange={(e) => setCaptainName(e.target.value)} disabled={isReadOnly} className={`${inputClass} disabled:opacity-50`} />
              </div>
              <div>
                <label className={labelClass}>Captain day rate (€)</label>
                <input type="number" value={captainDayRate} onChange={(e) => setCaptainDayRate(e.target.value)} disabled={isReadOnly} className={`${inputClass} disabled:opacity-50`} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className={labelClass}>Stewardess count</label>
                <input type="number" value={stewardessCount} onChange={(e) => setStewardessCount(e.target.value)} disabled={isReadOnly} className={`${inputClass} disabled:opacity-50`} />
              </div>
              <div>
                <label className={labelClass}>Stewardess day rate (€)</label>
                <input
                  type="number"
                  value={stewardessDayRate}
                  onChange={(e) => setStewardessDayRate(e.target.value)}
                  disabled={isReadOnly}
                  className={`${inputClass} disabled:opacity-50`}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Deckhand count</label>
                <input type="number" value={deckhandCount} onChange={(e) => setDeckhandCount(e.target.value)} disabled={isReadOnly} className={`${inputClass} disabled:opacity-50`} />
              </div>
              <div>
                <label className={labelClass}>Deckhand day rate (€)</label>
                <input type="number" value={deckhandDayRate} onChange={(e) => setDeckhandDayRate(e.target.value)} disabled={isReadOnly} className={`${inputClass} disabled:opacity-50`} />
              </div>
            </div>
          </div>

          {/* Revenue */}
          <div className="border-t border-white/[0.06] pt-3.5">
            <p className={sectionLabelClass}>Revenue</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className={labelClass}>Charter rate (€)</label>
                <input type="number" value={charterRate} onChange={(e) => setCharterRate(e.target.value)} disabled={isReadOnly} className={`${inputClass} disabled:opacity-50`} />
              </div>
              <div>
                <label className={labelClass}>Rate period</label>
                <select value={charterRatePeriod} onChange={(e) => setCharterRatePeriod(e.target.value as typeof charterRatePeriod)} disabled={isReadOnly} className={`${inputClass} disabled:opacity-50`}>
                  {RATE_PERIODS.map((p) => (
                    <option key={p} value={p}>
                      {RATE_PERIOD_LABELS[p]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className={labelClass}>{t("booking_total_amount")} (€)</label>
                <input type="number" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} disabled={isReadOnly} className={`${inputClass} disabled:opacity-50`} />
              </div>
              <div>
                <label className={labelClass}>APA amount (€)</label>
                <input type="number" value={apaAmount} onChange={(e) => setApaAmount(e.target.value)} disabled={isReadOnly} className={`${inputClass} disabled:opacity-50`} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className={labelClass}>{t("spec_deposit")} (€)</label>
                <input type="number" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} disabled={isReadOnly} className={`${inputClass} disabled:opacity-50`} />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={depositPaid}
                    onChange={(e) => setDepositPaid(e.target.checked)}
                    disabled={isReadOnly}
                    className="w-4 h-4 rounded border-white/20 bg-white/[0.04] accent-[hsl(43,67%,55%)] disabled:opacity-50"
                  />
                  Deposit paid
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>{t("booking_vat_percent")}</label>
                <input type="number" value={vatPercent} onChange={(e) => setVatPercent(e.target.value)} disabled={isReadOnly} className={`${inputClass} disabled:opacity-50`} />
              </div>
              <div>
                <label className={labelClass}>{t("booking_agent_commission")}</label>
                <input
                  type="number"
                  value={agentCommissionPercent}
                  onChange={(e) => setAgentCommissionPercent(e.target.value)}
                  disabled={isReadOnly}
                  className={`${inputClass} disabled:opacity-50`}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>{t("spec_km_included")}</label>
              <input type="number" value={kmIncluded} onChange={(e) => setKmIncluded(e.target.value)} disabled={isReadOnly} className={`${inputClass} disabled:opacity-50`} />
            </div>
            <div>
              <label className={labelClass}>{t("spec_extra_price_km")} (€)</label>
              <input type="number" value={pricePerExtraKm} onChange={(e) => setPricePerExtraKm(e.target.value)} disabled={isReadOnly} className={`${inputClass} disabled:opacity-50`} />
            </div>
          </div>

          <div>
            <label className={labelClass}>{t("booking_contract_signed")}</label>
            <select value={contractStatus} onChange={(e) => setContractStatus(e.target.value as typeof contractStatus)} disabled={isReadOnly} className={`${inputClass} disabled:opacity-50`}>
              {CONTRACT_STATUSES.map((c) => (
                <option key={c} value={c}>
                  {CONTRACT_LABELS[c]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} disabled={isReadOnly} className={`${inputClass} resize-none disabled:opacity-50`} />
          </div>

          {editingBooking?.source === "ical" && (
            <p className="text-[10px] text-white/30">Imported from iCal feed — editing will detach it from future syncs.</p>
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
            {!isReadOnly && (
              <button
                onClick={handleSave}
                disabled={saving || deleting || blockingConflicts.length > 0}
                className="bg-[hsl(43,67%,55%)] text-black text-xs uppercase tracking-wide px-5 py-2.5 rounded-md hover:bg-[hsl(43,67%,65%)] disabled:opacity-50 transition-colors"
              >
                {saving ? "Saving…" : editingBooking ? "Save Changes" : "Create Charter"}
              </button>
            )}
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
    </div>
  );
}
