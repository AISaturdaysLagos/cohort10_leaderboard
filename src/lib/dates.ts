import type { WeekBounds } from "../types";

export function parseUtcDate(value: string | undefined | null): Date | null {
  if (value == null || String(value).trim() === "") return null;
  const s = String(value).trim();
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function isInRange(d: Date, bounds: WeekBounds): boolean {
  return d.getTime() >= bounds.start.getTime() && d.getTime() <= bounds.end.getTime();
}

export function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

export function endOfUtcDay(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999),
  );
}

export function formatWeekLabel(bounds: WeekBounds): string {
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  };
  return `${bounds.start.toLocaleDateString("en-GB", opts)} – ${bounds.end.toLocaleDateString("en-GB", opts)}`;
}

export function defaultUtcWeekContaining(d: Date): WeekBounds {
  const day = d.getUTCDay();
  const mondayOffset = (day + 6) % 7;
  const start = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - mondayOffset, 0, 0, 0, 0),
  );
  const end = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + 6, 23, 59, 59, 999),
  );
  return { start, end };
}
