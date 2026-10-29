import type { Db } from "@/lib/desk";

export type PtStatus =
  | "awaiting_payment" | "payment_claimed" | "confirmed" | "completed" | "no_show" | "rejected" | "cancelled" | "expired";

/** What a client sees about their own booking (comes from my_pt_bookings). */
export type MyPt = {
  id: string; booking_no: number; trainer_id: string; coach_name: string; session_date: string; starts_at: string;
  ends_at: string; amount_kes: number; status: PtStatus; reject_reason: string | null; created_at: string; refund_due: boolean;
};

/** A booking row as the admin reads it from the table. */
export type PtBooking = {
  id: string; booking_no: number; trainer_id: string; member_id: string; session_date: string; starts_at: string; ends_at: string;
  amount_kes: number; status: PtStatus; mpesa_name: string | null; claimed_at: string | null; reject_reason: string | null;
  refund_due: boolean; refunded_at: string | null; created_at: string;
};
export const PT_COLUMNS =
  "id, booking_no, trainer_id, member_id, session_date, starts_at, ends_at, amount_kes, status, mpesa_name, claimed_at, reject_reason, refund_due, refunded_at, created_at";

export type PtPerson = { id: string; full_name: string; email: string | null; phone: string | null; member_no: number };
export type PtRow = PtBooking & { coach: string; person: PtPerson | null };

export const ptNo = (n: number) => `PT-${String(n).padStart(4, "0")}`;

export const PT_LABEL: Record<PtStatus, string> = {
  awaiting_payment: "Not paid yet",
  payment_claimed: "Payment being checked",
  confirmed: "Confirmed",
  completed: "Completed",
  no_show: "No show",
  rejected: "Not confirmed",
  cancelled: "Cancelled",
  expired: "Expired",
};

/** Adds the coach name and the client to each booking with plain, separate queries (no embedded relations). */
export async function hydratePt(supabase: Db, rows: PtBooking[]): Promise<PtRow[]> {
  if (rows.length === 0) return [];
  const tIds = [...new Set(rows.map((r) => r.trainer_id))];
  const pIds = [...new Set(rows.map((r) => r.member_id))];
  const [tRes, pRes] = await Promise.all([
    supabase.from("trainers").select("id, full_name").in("id", tIds),
    supabase.from("profiles").select("id, full_name, email, phone, member_no").in("id", pIds),
  ]);
  const coaches = new Map(((tRes.data ?? []) as unknown as { id: string; full_name: string }[]).map((t) => [t.id, t.full_name]));
  const people = new Map(((pRes.data ?? []) as unknown as PtPerson[]).map((p) => [p.id, p]));
  return rows.map((r) => ({ ...r, coach: coaches.get(r.trainer_id) ?? "Coach", person: people.get(r.member_id) ?? null }));
}

/** Nairobi "now" as a sortable string like "2026-10-29T14:05:00". */
export function nairobiNowStamp(): string {
  return new Date().toLocaleString("sv-SE", { timeZone: "Africa/Nairobi" }).replace(" ", "T");
}
