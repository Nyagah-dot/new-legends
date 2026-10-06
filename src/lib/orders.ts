export const orderNo = (n: number) => `ORD-${String(n).padStart(4, "0")}`;

export const kes = (n: number) => `KES ${n.toLocaleString("en-KE")}`;

export function perLabel(days: number): string {
  if (days === 1) return "KES / day";
  if (days === 30) return "KES / month";
  if (days === 90) return "KES / 3 months";
  if (days === 180) return "KES / 6 months";
  if (days === 365) return "KES / year";
  return `KES / ${days} days`;
}

/** Do two names share at least one word? Used only to flag a payment for a closer look. */
export function namesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const tokens = (s: string) =>
    s.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter((t) => t.length >= 3);
  const A = tokens(a ?? "");
  const B = tokens(b ?? "");
  return A.some((t) => B.includes(t));
}

/** "2026-10-05" -> "Mon 5 Oct 2026" */
export function fmtLong(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** A timestamp as Nairobi time, e.g. "5 Oct, 14:32". */
export function fmtStamp(ts: string | null): string {
  if (!ts) return "";
  return new Date(ts).toLocaleString("en-GB", {
    timeZone: "Africa/Nairobi",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
