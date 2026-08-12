import assert from "node:assert/strict";
import test from "node:test";
import {
  bookingDateTime,
  bookingIntervalsOverlap,
  isValidTime,
  rentalDayCount,
  rentalMileageSummary,
} from "./bookingIntervals.ts";

test("same-day morning-to-evening rental counts as one day", () => {
  assert.equal(rentalDayCount("2026-07-30", "2026-07-30"), 1);
});

test("multi-day rental follows rental-industry day count", () => {
  assert.equal(rentalDayCount("2026-07-30", "2026-08-03"), 4);
});

test("31 July 17:00 to 7 August 17:00 counts as seven rental days", () => {
  assert.equal(rentalDayCount("2026-07-31", "2026-08-07"), 7);
});

test("included and excess mileage follow the current rental duration", () => {
  assert.deepEqual(
    rentalMileageSummary("2026-08-10", "2026-08-12", 150, 10_000, 10_327),
    { days: 2, includedKm: 300, actualKm: 327, extraKm: 27 },
  );
  assert.deepEqual(
    rentalMileageSummary("2026-08-10", "2026-08-13", 150, 10_000, 10_327),
    { days: 3, includedKm: 450, actualKm: 327, extraKm: 0 },
  );
});

test("adjacent rentals do not overlap", () => {
  assert.equal(
    bookingIntervalsOverlap(
      "2026-07-30 10:00",
      "2026-07-30 15:00",
      "2026-07-30 15:00",
      "2026-07-30 20:00",
    ),
    false,
  );
});

test("one-minute overlap is detected", () => {
  assert.equal(
    bookingIntervalsOverlap(
      "2026-07-30 10:00",
      "2026-07-30 15:01",
      "2026-07-30 15:00",
      "2026-07-30 20:00",
    ),
    true,
  );
});

test("time and date-time validation reject malformed values", () => {
  assert.equal(isValidTime("23:59"), true);
  assert.equal(isValidTime("24:00"), false);
  assert.throws(() => bookingDateTime("30-07-2026", "10:00"));
});
