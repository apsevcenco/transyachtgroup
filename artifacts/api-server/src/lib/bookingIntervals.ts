const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isValidTime(value: unknown): value is string {
  return typeof value === "string" && TIME_PATTERN.test(value);
}

export function bookingDateTime(date: string, time: string): string {
  if (!DATE_PATTERN.test(date) || !isValidTime(time)) {
    throw new Error("Invalid booking date or time");
  }
  return `${date} ${time}`;
}

/** Half-open intervals: an end at 15:00 may be followed by a start at 15:00. */
export function bookingIntervalsOverlap(
  firstStart: string,
  firstEnd: string,
  secondStart: string,
  secondEnd: string,
): boolean {
  return firstStart < secondEnd && firstEnd > secondStart;
}

/** Rental convention: a same-day rental is one day, not zero. */
export function rentalDayCount(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    end < start
  )
    return 0;
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000));
}
