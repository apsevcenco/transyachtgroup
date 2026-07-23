import { useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import type { Booking } from "@/lib/api";
import {
  STATUSES,
  STATUS_LABELS,
  STATUS_COLORS,
  DAY_W,
  VEHICLE_COL_W,
  ROW_H,
  stripTags,
  isSameDay,
  type VehicleLite,
} from "./bookingShared";
import { VehicleThumb } from "./VehicleThumb";

interface GanttGridProps {
  vehicles: VehicleLite[];
  bookings: Booking[];
  days: Date[];
  monthLabel: string;
  loading: boolean;
  error: string;
  emptyLabel: string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onDayClick: (vehicleId: number, date: string) => void;
  onBarClick: (booking: Booking) => void;
}

export function GanttGrid({
  vehicles,
  bookings,
  days,
  monthLabel,
  loading,
  error,
  emptyLabel,
  onPrevMonth,
  onNextMonth,
  onToday,
  onDayClick,
  onBarClick,
}: GanttGridProps) {
  const [viewMode, setViewMode] = useState<"all" | "select">("all");
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);

  const bookingsByVehicle = new Map<number, Booking[]>();
  for (const b of bookings) {
    if (!bookingsByVehicle.has(b.vehicleId)) bookingsByVehicle.set(b.vehicleId, []);
    bookingsByVehicle.get(b.vehicleId)!.push(b);
  }

  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const isPastDay = (d: Date) => d < todayMidnight;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onPrevMonth}
            aria-label="Previous month"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md border border-white/15 bg-white/[0.03] text-white/80 hover:text-gold hover:border-gold/40 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="font-porter text-white text-sm uppercase tracking-[0.15em] min-w-[160px] text-center">{monthLabel}</span>
          <button
            onClick={onNextMonth}
            aria-label="Next month"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md border border-white/15 bg-white/[0.03] text-white/80 hover:text-gold hover:border-gold/40 transition-colors"
          >
            <ChevronRight size={20} />
          </button>
          <button onClick={onToday} className="text-[11px] uppercase tracking-wide text-white/40 hover:text-gold transition-colors ml-2 min-h-[44px] px-2">
            Today
          </button>
        </div>

        <div className="flex items-center gap-4 text-[11px] text-white/50">
          {STATUSES.map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[s]}`} />
              {STATUS_LABELS[s]}
            </span>
          ))}
        </div>
      </div>

      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-white/40">
          <Loader2 size={20} className="animate-spin mr-2" /> Loading calendar…
        </div>
      ) : vehicles.length === 0 ? (
        <p className="text-white/40 text-sm py-10 text-center">{emptyLabel}</p>
      ) : (
        <>
          {/* Mobile: list view */}
          <div className="lg:hidden">
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => {
                  setViewMode("all");
                  setSelectedVehicleId(null);
                }}
                className={`flex-1 min-h-[44px] rounded-md text-[11px] uppercase tracking-wide border transition-colors ${
                  viewMode === "all"
                    ? "bg-[hsl(43,67%,55%)]/15 border-gold/40 text-gold"
                    : "border-white/10 text-white/50 hover:text-white/70"
                }`}
              >
                All vehicles
              </button>
              <button
                onClick={() => setViewMode("select")}
                className={`flex-1 min-h-[44px] rounded-md text-[11px] uppercase tracking-wide border transition-colors ${
                  viewMode === "select"
                    ? "bg-[hsl(43,67%,55%)]/15 border-gold/40 text-gold"
                    : "border-white/10 text-white/50 hover:text-white/70"
                }`}
              >
                Select vehicle
              </button>
            </div>

            {viewMode === "select" && selectedVehicleId == null ? (
              <div className="space-y-1.5">
                {vehicles.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVehicleId(v.id)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] text-left transition-colors min-h-[44px]"
                  >
                    <VehicleThumb image={v.image} size={40} />
                    <span className="text-sm text-white">{v.name}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {viewMode === "select" && selectedVehicleId != null && (
                  <button
                    onClick={() => setSelectedVehicleId(null)}
                    className="text-[11px] uppercase tracking-wide text-white/40 hover:text-gold transition-colors min-h-[44px] flex items-center"
                  >
                    ← Change vehicle
                  </button>
                )}

                {(viewMode === "select" && selectedVehicleId != null
                  ? vehicles.filter((v) => v.id === selectedVehicleId)
                  : vehicles
                ).map((v) => {
                  const vBookings = (bookingsByVehicle.get(v.id) || []).slice().sort((a, b) => a.startDate.localeCompare(b.startDate));
                  if (vBookings.length === 0) {
                    if (viewMode === "select") {
                      return (
                        <p key={v.id} className="text-white/40 text-sm py-6 text-center">
                          No bookings this month for {v.name}.
                        </p>
                      );
                    }
                    return null;
                  }
                  return (
                    <div key={v.id}>
                      <div className="flex items-center gap-2 mb-2">
                        <VehicleThumb image={v.image} size={40} />
                        <h4 className="font-porter text-white/70 text-sm uppercase tracking-[0.1em]">{v.name}</h4>
                      </div>
                      <div className="space-y-2">
                        {vBookings.map((b) => {
                          const label = stripTags(b.clientName) || STATUS_LABELS[b.status];
                          return (
                            <button
                              key={b.id}
                              onClick={() => onBarClick(b)}
                              className="w-full flex items-center gap-3 p-3 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] text-left transition-colors min-h-[44px]"
                            >
                              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_COLORS[b.status]}`} />
                              <span className="flex-1 min-w-0">
                                <span className="block text-sm text-white truncate">{label}</span>
                                <span className="block text-[11px] text-white/40">
                                  {b.startDate} → {b.endDate}
                                </span>
                              </span>
                              <span className="text-[10px] uppercase tracking-wide text-white/30 shrink-0">{STATUS_LABELS[b.status]}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {viewMode === "all" && bookings.length === 0 && (
                  <p className="text-white/40 text-sm py-10 text-center">No bookings this month.</p>
                )}
              </div>
            )}
          </div>

          {/* Desktop: Gantt grid */}
          {/* overflow-x-auto forces the browser to also compute overflow-y as
              auto (per the CSS overflow spec), which makes this div itself the
              sticky positioning context for the header row below — so it needs
              its own bounded height + overflow-y-auto, otherwise the header's
              sticky-top never has anything to stick within and just scrolls
              away with the page. */}
          <div className="hidden lg:block overflow-x-auto overflow-y-auto max-h-[70vh] border border-white/[0.08] rounded-lg">
          <div style={{ minWidth: VEHICLE_COL_W + days.length * DAY_W }}>
            <div className="flex border-b border-white/10 bg-[#0a0a0a] sticky top-0 z-30">
              <div
                className="shrink-0 px-3 py-2 text-[10px] uppercase tracking-wide text-white/40 sticky left-0 bg-[#0a0a0a] z-20 border-r border-white/10"
                style={{ width: VEHICLE_COL_W }}
              >
                Vehicle
              </div>
              {days.map((d) => (
                <div
                  key={d.toISOString()}
                  style={{ width: DAY_W }}
                  className={`shrink-0 text-center py-2 text-[10px] border-r border-white/10 ${
                    isSameDay(d, today)
                      ? "text-gold font-semibold"
                      : isPastDay(d)
                        ? "text-white/60"
                        : "text-white/40"
                  }`}
                >
                  {d.getDate()}
                </div>
              ))}
            </div>

            {vehicles.map((v) => (
              <div key={v.id} className="flex border-b border-white/10 relative" style={{ minHeight: ROW_H }}>
                <div
                  className="shrink-0 flex items-center gap-2 px-3 py-2 sticky left-0 bg-[#0a0a0a] z-10 border-r border-white/10"
                  style={{ width: VEHICLE_COL_W, minHeight: ROW_H }}
                  title={v.name}
                >
                  {v.image ? (
                    <img src={v.image} alt="" className="w-8 h-8 rounded object-cover shrink-0" style={{ height: 32 }} />
                  ) : (
                    <div className="w-8 h-8 rounded bg-white/[0.06] shrink-0" style={{ height: 32 }} />
                  )}
                  <span className="text-xs text-white/80 leading-snug break-words">{v.name}</span>
                </div>
                <div className="relative" style={{ width: days.length * DAY_W, minHeight: ROW_H }}>
                  {days.map((d, i) => {
                    const past = isPastDay(d);
                    return (
                      <div
                        key={i}
                        onClick={() => {
                          if (past) return;
                          onDayClick(v.id, `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
                        }}
                        className={`absolute inset-y-0 border-r border-white/10 transition-colors ${
                          past ? "bg-white/5 opacity-40 cursor-default" : "hover:bg-white/[0.04] cursor-pointer"
                        }`}
                        style={{ left: i * DAY_W, width: DAY_W }}
                      />
                    );
                  })}

                  {(bookingsByVehicle.get(v.id) || []).map((b) => {
                    const bStart = new Date(b.startDate + "T00:00:00");
                    const bEnd = new Date(b.endDate + "T00:00:00");
                    const startIdx = Math.floor((bStart.getTime() - days[0].getTime()) / 86400000);
                    const endIdx = Math.floor((bEnd.getTime() - days[0].getTime()) / 86400000);
                    const clampedStart = Math.max(0, startIdx);
                    const clampedEnd = Math.min(days.length - 1, endIdx);
                    if (clampedEnd < 0 || clampedStart > days.length - 1) return null;

                    const left = clampedStart * DAY_W;
                    const width = (clampedEnd - clampedStart + 1) * DAY_W;
                    const label = stripTags(b.clientName) || STATUS_LABELS[b.status];

                    return (
                      <div
                        key={b.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onBarClick(b);
                        }}
                        className={`absolute top-1/2 -translate-y-1/2 h-8 rounded ${STATUS_COLORS[b.status]} cursor-pointer flex items-center px-1.5 text-[10px] text-black font-medium truncate z-[1] hover:brightness-110 transition-[filter]`}
                        style={{ left, width }}
                        title={`${label} (${b.startDate} → ${b.endDate})`}
                      >
                        {label}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          </div>
        </>
      )}
    </div>
  );
}
