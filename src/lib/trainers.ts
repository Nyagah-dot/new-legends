import { daysLabel, fmtTime } from "@/lib/timetable";

export type TrainerRow = {
  id: string;
  profile_id: string | null; // reserved for the trainer portal (a trainer's own login)
  full_name: string;
  title: string | null;
  bio: string | null;
  photo: string | null; // a file name inside public/images/coaches, e.g. "male3.webp"
  expertise: string[];
  session_price_kes: number;
  slot_minutes: number;
  is_active: boolean;
  sort_order: number;
};

/** The few fields the class form needs for its trainer dropdown. */
export type TrainerOption = { id: string; full_name: string; is_active: boolean };

export type HoursRow = { id: string; trainer_id: string; weekday: number; starts_at: string; ends_at: string };

export type TimeOffRow = {
  id: string; trainer_id: string; off_date: string; starts_at: string | null; ends_at: string | null; reason: string | null;
};

export const TRAINER_COLUMNS =
  "id, profile_id, full_name, title, bio, photo, expertise, session_price_kes, slot_minutes, is_active, sort_order";

/** Allowed 1-to-1 session lengths, in minutes (the database allows the same four). */
export const SLOT_CHOICES = [30, 45, 60, 90] as const;

/** A file name like "male3.webp": letters, numbers, dot, dash, underscore. */
export const PHOTO_RE = /^[a-z0-9._-]+\.(webp|jpg|jpeg|png)$/i;

/** Where trainer photos live in the project. */
export const COACH_IMG_DIR = "/images/coaches/";

/** "06:00:00" or "06:00" -> 360 */
export const minutesOf = (t: string): number => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/** "06:00:00" -> "06:00" */
export const hhmm = (t: string): string => t.slice(0, 5);

/** Groups identical windows: Mon-Fri 6:00-10:00, Sat 8:00-12:00. */
export function hoursSummary(rows: HoursRow[]): { days: string; time: string }[] {
  const byWindow = new Map<string, number[]>();
  for (const r of rows) {
    const key = `${hhmm(r.starts_at)}|${hhmm(r.ends_at)}`;
    byWindow.set(key, [...(byWindow.get(key) ?? []), r.weekday]);
  }
  return [...byWindow.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, days]) => {
      const [s, e] = key.split("|");
      return { days: daysLabel(days), time: `${fmtTime(s)}–${fmtTime(e)}` };
    });
}
