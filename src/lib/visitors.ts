import type { Db } from "@/lib/desk";

/** How far ahead a visitor can book (the database enforces the same 14 days). */
export const VISITOR_HORIZON_DAYS = 14;

export type VisitorStatus =
  | "awaiting_payment" | "payment_claimed" | "confirmed" | "attended" | "rejected" | "cancelled" | "expired";

export type VisitorBooking = {
  id: string; booking_no: number; session_id: string; member_id: string; amount_kes: number; status: VisitorStatus;
  mpesa_name: string | null; claimed_at: string | null; decided_at: string | null; reject_reason: string | null;
  attended_at: string | null; created_at: string;
};
export type VisitorSession = {
  id: string; session_date: string; name: string; coach_name: string | null; starts_at: string; ends_at: string;
  ladies_only: boolean; status: string;
};
export type VisitorPerson = { id: string; full_name: string; email: string | null; phone: string | null; member_no: number };
export type VisitorRow = VisitorBooking & { session: VisitorSession | null; person: VisitorPerson | null };

export const BOOKING_COLUMNS =
  "id, booking_no, session_id, member_id, amount_kes, status, mpesa_name, claimed_at, decided_at, reject_reason, attended_at, created_at";

export const bookingNo = (n: number) => `SC-${String(n).padStart(4, "0")}`;

/** Current Nairobi clock time as "HH:MM:SS", comparable with a session's starts_at. */
export function nairobiNowTime(): string {
  return new Date().toLocaleTimeString("en-GB", { timeZone: "Africa/Nairobi", hour12: false });
}

/**
 * Adds the class and the person to each booking using plain, separate queries
 * (no embedded relations, so there are no foreign-key hints to get wrong).
 */
export async function hydrate(supabase: Db, bookings: VisitorBooking[]): Promise<VisitorRow[]> {
  if (bookings.length === 0) return [];
  const sessionIds = [...new Set(bookings.map((b) => b.session_id))];
  const personIds = [...new Set(bookings.map((b) => b.member_id))];
  const [sRes, pRes] = await Promise.all([
    supabase.from("class_sessions").select("id, session_date, name, coach_name, starts_at, ends_at, ladies_only, status").in("id", sessionIds),
    supabase.from("profiles").select("id, full_name, email, phone, member_no").in("id", personIds),
  ]);
  const sessions = new Map(((sRes.data ?? []) as unknown as VisitorSession[]).map((s) => [s.id, s]));
  const people = new Map(((pRes.data ?? []) as unknown as VisitorPerson[]).map((p) => [p.id, p]));
  return bookings.map((b) => ({ ...b, session: sessions.get(b.session_id) ?? null, person: people.get(b.member_id) ?? null }));
}

export const STATUS_LABEL: Record<VisitorStatus, string> = {
  awaiting_payment: "Not paid yet",
  payment_claimed: "Needs review",
  confirmed: "Confirmed",
  attended: "Checked in",
  rejected: "Rejected",
  cancelled: "Cancelled",
  expired: "Expired",
};
