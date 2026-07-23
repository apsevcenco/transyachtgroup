import { useState, useEffect, useCallback, useMemo } from "react";
import { Loader2, X, Trash2, ChevronDown } from "lucide-react";
import { fetchVehicles, fetchRentalHistory, deleteRentalHistory, type RentalHistoryRecord } from "@/lib/api";
import { VehicleThumb } from "./VehicleThumb";
import { VehiclePhotoModal } from "./VehiclePhotoModal";
import { stripTags, vehiclePhotos, type VehicleLite } from "./bookingShared";

type CategoryFilter = "all" | "car" | "yacht";

function formatMoney(n: number | null): string {
  return n == null ? "—" : `€${n.toLocaleString()}`;
}

function commissionAmount(r: RentalHistoryRecord): number {
  if (!r.totalAmount || !r.agentCommissionPercent) return 0;
  return (r.totalAmount * r.agentCommissionPercent) / 100;
}

export function CrmDashboard() {
  const [vehicles, setVehicles] = useState<VehicleLite[]>([]);
  const [rentals, setRentals] = useState<RentalHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRental, setSelectedRental] = useState<RentalHistoryRecord | null>(null);
  const [vehiclePickerOpen, setVehiclePickerOpen] = useState(false);

  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");

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
          })),
        ),
      )
      .catch(() => setVehicles([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchRentalHistory({
        vehicleId: vehicleId ?? undefined,
        category: category === "all" ? undefined : category,
        start: dateStart || undefined,
        end: dateEnd || undefined,
      });
      setRentals(data);
    } catch (err: any) {
      setError(err.message || "Failed to load rental history");
    } finally {
      setLoading(false);
    }
  }, [vehicleId, category, dateStart, dateEnd]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const totalRevenue = rentals.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
    const totalDaysRented = rentals.reduce((sum, r) => sum + r.totalDays, 0);
    const totalCommissionPaid = rentals.reduce((sum, r) => sum + commissionAmount(r), 0);
    const counts = new Map<string, number>();
    for (const r of rentals) counts.set(r.vehicleName, (counts.get(r.vehicleName) || 0) + 1);
    let mostRented: { name: string; count: number } | null = null;
    for (const [name, count] of counts) {
      if (!mostRented || count > mostRented.count) mostRented = { name, count };
    }
    return { totalRevenue, totalRentals: rentals.length, totalDaysRented, totalCommissionPaid, mostRented };
  }, [rentals]);

  const carVehicles = useMemo(() => vehicles.filter((v) => v.category === "car"), [vehicles]);
  const yachtVehicles = useMemo(() => vehicles.filter((v) => v.category === "yacht"), [vehicles]);
  const selectedFilterVehicle = vehicles.find((v) => v.id === vehicleId) ?? null;

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this rental history record? This cannot be undone.")) return;
    try {
      await deleteRentalHistory(id);
      setSelectedRental(null);
      await load();
    } catch (err: any) {
      setError(err.message || "Failed to delete record");
    }
  };

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="border border-white/[0.08] rounded-lg p-4 bg-white/[0.02]">
          <p className="text-[10px] uppercase tracking-wide text-white/40 mb-1">Total Revenue</p>
          <p className="font-porter text-white text-xl">{formatMoney(stats.totalRevenue)}</p>
        </div>
        <div className="border border-white/[0.08] rounded-lg p-4 bg-white/[0.02]">
          <p className="text-[10px] uppercase tracking-wide text-white/40 mb-1">Total Rentals</p>
          <p className="font-porter text-white text-xl">{stats.totalRentals}</p>
        </div>
        <div className="border border-white/[0.08] rounded-lg p-4 bg-white/[0.02]">
          <p className="text-[10px] uppercase tracking-wide text-white/40 mb-1">Total Days Rented</p>
          <p className="font-porter text-white text-xl">{stats.totalDaysRented}</p>
        </div>
        <div className="border border-white/[0.08] rounded-lg p-4 bg-white/[0.02]">
          <p className="text-[10px] uppercase tracking-wide text-white/40 mb-1">Total Commission Paid</p>
          <p className="font-porter text-white text-xl">{formatMoney(Math.round(stats.totalCommissionPaid))}</p>
        </div>
        {vehicleId == null && (
          <div className="border border-white/[0.08] rounded-lg p-4 bg-white/[0.02] col-span-2 sm:col-span-4">
            <p className="text-[10px] uppercase tracking-wide text-white/40 mb-1">Most Rented Vehicle</p>
            <p className="font-porter text-white text-xl truncate">
              {stats.mostRented ? `${stats.mostRented.name} (${stats.mostRented.count})` : "—"}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3 mb-5">
        <div className="relative">
          <label className="block text-[10px] uppercase tracking-wide text-white/40 mb-1">Vehicle</label>
          <button
            type="button"
            onClick={() => setVehiclePickerOpen((o) => !o)}
            className="min-w-[220px] bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white min-h-[44px] flex items-center gap-2"
          >
            {selectedFilterVehicle ? (
              <>
                <VehicleThumb image={selectedFilterVehicle.image} size={24} />
                <span className="flex-1 text-left truncate">{selectedFilterVehicle.name}</span>
              </>
            ) : (
              <span className="flex-1 text-left">All vehicles</span>
            )}
            <ChevronDown size={16} className="text-white/40 shrink-0" />
          </button>
          {vehiclePickerOpen && (
            <div className="absolute z-10 mt-1 w-full min-w-[220px] max-h-72 overflow-y-auto bg-[#0f0f0f] border border-white/[0.08] rounded-md shadow-lg">
              <button
                type="button"
                onClick={() => {
                  setVehicleId(null);
                  setVehiclePickerOpen(false);
                }}
                className="w-full px-3 py-2 min-h-[44px] text-sm text-white text-left hover:bg-white/[0.06] transition-colors"
              >
                All vehicles
              </button>

              {carVehicles.length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-white/30 bg-white/[0.02]">— Cars —</div>
                  {carVehicles.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        setVehicleId(v.id);
                        setVehiclePickerOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 min-h-[44px] hover:bg-white/[0.06] transition-colors text-left"
                    >
                      <VehicleThumb image={v.image} size={24} />
                      <span className="text-sm text-white truncate">{v.name}</span>
                    </button>
                  ))}
                </>
              )}

              {yachtVehicles.length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-white/30 bg-white/[0.02]">— Yachts —</div>
                  {yachtVehicles.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        setVehicleId(v.id);
                        setVehiclePickerOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 min-h-[44px] hover:bg-white/[0.06] transition-colors text-left"
                    >
                      <VehicleThumb image={v.image} size={24} />
                      <span className="text-sm text-white truncate">{v.name}</span>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-1">
          {(["all", "car", "yacht"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`min-h-[44px] px-4 rounded-md text-[11px] uppercase tracking-wide border transition-colors ${
                category === c
                  ? "bg-[hsl(43,67%,55%)]/15 border-gold/40 text-gold"
                  : "border-white/10 text-white/50 hover:text-white/70"
              }`}
            >
              {c === "all" ? "All" : c === "car" ? "Cars" : "Yachts"}
            </button>
          ))}
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-wide text-white/40 mb-1">From</label>
          <input
            type="date"
            value={dateStart}
            onChange={(e) => setDateStart(e.target.value)}
            className="bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white min-h-[44px]"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wide text-white/40 mb-1">To</label>
          <input
            type="date"
            value={dateEnd}
            onChange={(e) => setDateEnd(e.target.value)}
            className="bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white min-h-[44px]"
          />
        </div>

        {(vehicleId != null || category !== "all" || dateStart || dateEnd) && (
          <button
            onClick={() => {
              setVehicleId(null);
              setCategory("all");
              setDateStart("");
              setDateEnd("");
            }}
            className="min-h-[44px] px-3 text-[11px] uppercase tracking-wide text-white/40 hover:text-gold transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-white/40">
          <Loader2 size={20} className="animate-spin mr-2" /> Loading rentals…
        </div>
      ) : rentals.length === 0 ? (
        <p className="text-white/40 text-sm py-10 text-center">No completed rentals found.</p>
      ) : (
        <>
          {/* Mobile: card list */}
          <div className="lg:hidden space-y-2">
            {rentals.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedRental(r)}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] text-left transition-colors"
              >
                <VehicleThumb image={r.vehicleImage} size={40} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{r.vehicleName}</p>
                  <p className="text-[11px] text-white/40 truncate">{stripTags(r.clientName) || "Unnamed client"}</p>
                  <p className="text-[11px] text-white/40">
                    {r.startDate} → {r.endDate} · {r.totalDays}d
                  </p>
                </div>
                <p className="text-sm text-gold shrink-0">{formatMoney(r.totalAmount)}</p>
                <span
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(r.id);
                  }}
                  className="shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center text-red-400/60 hover:text-red-400 transition-colors"
                  aria-label="Delete rental record"
                >
                  <Trash2 size={16} />
                </span>
              </button>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden lg:block overflow-x-auto border border-white/[0.08] rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-left">
                  <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-white/40 font-normal">Vehicle</th>
                  <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-white/40 font-normal">Client</th>
                  <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-white/40 font-normal">Dates</th>
                  <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-white/40 font-normal">Days</th>
                  <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-white/40 font-normal">Total</th>
                  <th className="px-3 py-2 text-[10px] uppercase tracking-wide text-white/40 font-normal"></th>
                </tr>
              </thead>
              <tbody>
                {rentals.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setSelectedRental(r)}
                    className="border-b border-white/10 last:border-b-0 hover:bg-white/[0.03] cursor-pointer transition-colors"
                  >
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <VehicleThumb image={r.vehicleImage} size={32} />
                        <span className="text-white">{r.vehicleName}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-white/70">{stripTags(r.clientName) || "Unnamed client"}</td>
                    <td className="px-3 py-2 text-white/50 text-xs">
                      {r.startDate} → {r.endDate}
                    </td>
                    <td className="px-3 py-2 text-white/70">{r.totalDays}</td>
                    <td className="px-3 py-2 text-gold">{formatMoney(r.totalAmount)}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(r.id);
                        }}
                        className="text-red-400/60 hover:text-red-400 transition-colors"
                        aria-label="Delete rental record"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {selectedRental && (
        <RentalDetailModal
          rental={selectedRental}
          vehicles={vehicles}
          onClose={() => setSelectedRental(null)}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex justify-between gap-3 py-1.5 border-b border-white/[0.05] last:border-b-0">
      <span className="text-[11px] uppercase tracking-wide text-white/40">{label}</span>
      <span className="text-sm text-white text-right">{value}</span>
    </div>
  );
}

function RentalDetailModal({
  rental,
  vehicles,
  onClose,
  onDelete,
}: {
  rental: RentalHistoryRecord;
  vehicles: VehicleLite[];
  onClose: () => void;
  onDelete: (id: number) => void;
}) {
  const isYacht = rental.vehicleCategory === "yacht";
  const commission = commissionAmount(rental);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [bookingPhotoIndex, setBookingPhotoIndex] = useState<number | null>(null);
  const bookingPhotos = rental.bookingPhotos || [];

  // Prefer the live vehicle's full gallery (if it still exists); fall back to
  // just the single photo snapshotted at completion time otherwise.
  const liveVehicle = rental.vehicleId != null ? vehicles.find((v) => v.id === rental.vehicleId) : undefined;
  const photos = liveVehicle?.images?.length ? liveVehicle.images : rental.vehicleImage ? [rental.vehicleImage] : [];

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#0f0f0f] border border-white/[0.08] rounded-xl w-full max-w-md p-6 relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors">
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <VehicleThumb image={rental.vehicleImage} size={56} />
          <div className="min-w-0">
            <h3 className="font-porter text-white text-lg truncate">{rental.vehicleName}</h3>
            <p className="text-[11px] uppercase tracking-wide text-white/40">{rental.vehicleCategory}</p>
          </div>
        </div>

        {photos.length > 0 && (
          <div className="flex gap-2 overflow-x-auto mb-5 pb-1">
            {photos.map((photo, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPreviewIndex(i)}
                className="shrink-0"
                aria-label={`View photo ${i + 1}`}
              >
                <VehicleThumb image={photo} size={48} />
              </button>
            ))}
          </div>
        )}

        <div className="space-y-4 text-sm">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-gold/60 font-medium mb-1">Client</p>
            <DetailRow label="Name" value={stripTags(rental.clientName) || "Unnamed client"} />
            <DetailRow label="Phone" value={rental.clientPhone} />
            <DetailRow label="Notes" value={stripTags(rental.clientNotes)} />
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-gold/60 font-medium mb-1">Dates</p>
            <DetailRow label="Start" value={rental.startDate} />
            <DetailRow label="End" value={rental.endDate} />
            <DetailRow label="Total days" value={rental.totalDays} />
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-gold/60 font-medium mb-1">Financials</p>
            <DetailRow label="Total amount" value={formatMoney(rental.totalAmount)} />
            <DetailRow label="Deposit" value={formatMoney(rental.depositAmount)} />
            <DetailRow label="VAT" value={rental.vatPercent != null ? `${rental.vatPercent}%` : null} />
            <DetailRow
              label="Agent commission"
              value={rental.agentCommissionPercent != null ? `${rental.agentCommissionPercent}% (${formatMoney(Math.round(commission))})` : null}
            />
            <DetailRow label="Contract status" value={rental.contractStatus} />
          </div>

          {!isYacht && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-gold/60 font-medium mb-1">Car</p>
              <DetailRow label="Km included" value={rental.kmIncluded} />
              <DetailRow label="Extra km price" value={formatMoney(rental.pricePerExtraKm)} />
            </div>
          )}

          {isYacht && (
            <>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-gold/60 font-medium mb-1">Logistics</p>
                <DetailRow label="Departure port" value={rental.departurePort} />
                <DetailRow label="Return port" value={rental.returnPort} />
                <DetailRow
                  label="Charter rate"
                  value={rental.charterRate != null ? `${formatMoney(rental.charterRate)}${rental.charterRatePeriod ? ` (${rental.charterRatePeriod})` : ""}` : null}
                />
                <DetailRow label="APA amount" value={formatMoney(rental.apaAmount)} />
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-gold/60 font-medium mb-1">Crew</p>
                <DetailRow label="Captain" value={rental.captainName} />
                <DetailRow label="Captain day rate" value={formatMoney(rental.captainDayRate)} />
                <DetailRow label="Stewardess count" value={rental.stewardessCount} />
                <DetailRow label="Stewardess day rate" value={formatMoney(rental.stewardessDayRate)} />
                <DetailRow label="Deckhand count" value={rental.deckhandCount} />
                <DetailRow label="Deckhand day rate" value={formatMoney(rental.deckhandDayRate)} />
              </div>
            </>
          )}

          {bookingPhotos.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-gold/60 font-medium mb-1">Booking Photos</p>
              <div className="grid grid-cols-4 gap-2">
                {bookingPhotos.map((photo, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setBookingPhotoIndex(i)}
                    className="block w-full aspect-square rounded-md overflow-hidden bg-white/[0.04]"
                    aria-label={`View booking photo ${i + 1}`}
                  >
                    <img src={photo} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 flex justify-between items-center">
            <button
              onClick={() => onDelete(rental.id)}
              className="flex items-center gap-1.5 text-red-400/80 hover:text-red-400 text-xs transition-colors"
            >
              <Trash2 size={14} /> Delete
            </button>
            <span className="text-[10px] text-white/30">Completed {new Date(rental.completedAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {previewIndex != null && (
        <VehiclePhotoModal
          images={photos}
          name={rental.vehicleName}
          initialIndex={previewIndex}
          onClose={() => setPreviewIndex(null)}
        />
      )}

      {bookingPhotoIndex != null && (
        <VehiclePhotoModal
          images={bookingPhotos}
          name="Booking photo"
          initialIndex={bookingPhotoIndex}
          onClose={() => setBookingPhotoIndex(null)}
        />
      )}
    </div>
  );
}
