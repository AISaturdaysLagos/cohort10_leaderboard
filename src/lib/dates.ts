import type { ActivityRow } from "../types";
import type { WeekBounds } from "../types";
import { parseIsoDate, toIsoDate } from "./format";

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

/** ISO date (YYYY-MM-DD) of the Monday starting the UTC week that contains `d`. */
export function utcMondayIsoFromDate(d: Date): string {
  return toIsoDate(defaultUtcWeekContaining(d).start);
}

/** Snap any calendar day to the Monday of its UTC Mon–Sun week. */
export function snapIsoToUtcMonday(iso: string): string {
  return utcMondayIsoFromDate(parseIsoDate(iso));
}

/** Week bounds from a Monday ISO date (00:00 UTC Mon → 23:59:59.999 UTC Sun). */
export function weekBoundsFromMondayIso(isoMonday: string): WeekBounds {
  const start = parseIsoDate(isoMonday);
  const end = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + 6, 23, 59, 59, 999),
  );
  return { start, end };
}

export function utcSundayIsoFromMondayIso(isoMonday: string): string {
  return toIsoDate(weekBoundsFromMondayIso(isoMonday).end);
}

export function activityDateExtent(rows: ActivityRow[]): { min: Date; max: Date } | null {
  let minT = Infinity;
  let maxT = -Infinity;
  for (const r of rows) {
    for (const d of [r.dateStarted, r.dateCompleted]) {
      if (!d) continue;
      const t = d.getTime();
      if (t < minT) minT = t;
      if (t > maxT) maxT = t;
    }
  }
  if (!Number.isFinite(minT) || !Number.isFinite(maxT)) return null;
  return { min: new Date(minT), max: new Date(maxT) };
}

/** Monday ISO dates for each UTC week from `min` through `max` (inclusive). Capped to avoid UI freezes. */
const MAX_WEEK_OPTIONS = 104;

export function listUtcWeekMondaysBetween(min: Date, max: Date): string[] {
  const first = defaultUtcWeekContaining(min).start;
  const last = defaultUtcWeekContaining(max).start;
  const out: string[] = [];
  for (let t = first.getTime(); t <= last.getTime() && out.length < MAX_WEEK_OPTIONS; t += 7 * 24 * 60 * 60 * 1000) {
    out.push(toIsoDate(new Date(t)));
  }
  return out;
}
