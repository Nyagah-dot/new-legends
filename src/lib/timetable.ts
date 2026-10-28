export const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const; // ISO 1..7 -> index 0..6
export const DAY_LONG = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

export type ClassRow = {
  id: string;
  name: string;
  description: string | null;
  coach_name: string | null;
  weekdays: number[];
  starts_at: string; // "06:00:00"
  ends_at: string;
  capacity: number | null;
  bookable: boolean;
  ladies_only: boolean;
  is_active: boolean;
  trainer_id?: string | null;
};

export type SessionRow = {
  id: string;
  session_date: string; // "2026-10-05"
  name: string;
  coach_name: string | null;
  starts_at: string;
  ends_at: string;
  capacity: number | null;
  status: "scheduled" | "cancelled";
  cancel_reason: string | null;
};

/** "06:00:00" -> "6:00" (24-hour, no leading zero). */
export function fmtTime(t: string): string {
  const [h, m] = t.split(":");
  return `${Number(h)}:${m}`;
}

/** "06:00:00" -> "06:00", the format <input type="time"> wants. */
export const inputTime = (t: string) => t.slice(0, 5);

export function daysLabel(days: number[]): string {
  const d = [...days].sort((a, b) => a - b);
  if (d.length === 7) return "Every day";
  if (d.join() === "1,2,3,4,5") return "Mon–Fri";
  return d.map((n) => DAY_SHORT[n - 1]).join(", ");
}

/** Today's date in Nairobi as YYYY-MM-DD, whatever timezone the server runs in. */
export function nairobiToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" });
}

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** "2026-10-05" -> "Mon 5 Oct" */
export function fmtDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
