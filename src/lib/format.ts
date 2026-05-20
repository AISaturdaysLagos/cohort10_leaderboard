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
