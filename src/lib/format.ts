export function fmt1(n: number): string {
  return n.toLocaleString("en-GB", { maximumFractionDigits: 1, minimumFractionDigits: 0 });
}

export function pct(n: number): string {
  return `${fmt1(n * 100)}%`;
}

export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function parseIsoDate(s: string): Date {
  const [y, m, day] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day, 0, 0, 0, 0));
}

/** Format one or more award-winning team names for display. */
export function formatAwardTeams(teams: string[]): string {
  if (!teams.length) return "—";
  return teams.join(", ");
}

export function formatSavedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

/** Roster last-active style: `2026-06-02 08:56:42 UTC` */
export function formatUtcDateTime(d: Date | null): string {
  if (!d) return "—";
  return `${d.toISOString().slice(0, 19).replace("T", " ")} UTC`;
}
