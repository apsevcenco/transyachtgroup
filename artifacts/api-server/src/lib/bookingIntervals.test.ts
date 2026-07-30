import assert from "node:assert/strict";
import test from "node:test";
import {
  bookingDateTime,
  bookingIntervalsOverlap,
  isValidTime,
  rentalDayCount,
} from "./bookingIntervals.ts";

test("same-day morning-to-evening rental counts as one day", () => {
  assert.equal(rentalDayCount("2026-07-30", "2026-07-30"), 1);
});

test("multi-day rental follows rental-industry day count", () => {
  assert.equal(rentalDayCount("2026-07-30", "2026-08-03"), 4);
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
