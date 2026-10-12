import { addDays } from "@/lib/timetable";

export type OverviewRow = {
  membership_id: string; plan_code: string; plan_name: string;
  starts_on: string; base_ends_on: string; ends_on: string;
  frozen_days: number; state: string; days_left: number;
};

export type CalDay = { day: string; is_past: boolean; is_today: boolean; is_frozen: boolean; attended: boolean };

/** The membership to show: running or frozen first, then upcoming, then the most recently expired. */
export function pickCurrent(rows: OverviewRow[]): OverviewRow | null {
  const rank = (s: string) => (s === "active" || s === "frozen" ? 0 : s === "upcoming" ? 1 : s === "expired" ? 2 : 3);
  return [...rows].sort((a, b) => rank(a.state) - rank(b.state) || b.ends_on.localeCompare(a.ends_on))[0] ?? null;
}

export function paidUntil(rows: OverviewRow[]): string | null {
  const ends = rows.filter((r) => r.state !== "cancelled").map((r) => r.ends_on).sort();
  return ends.length ? ends[ends.length - 1] : null;
}

/** Whole days from a to b (YYYY-MM-DD). */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10)) - Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10))) / 86400000);
}

export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? "";

export { addDays };
