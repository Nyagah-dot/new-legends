"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { hasEmailEnv, sendEmail } from "@/lib/email/send";
import { paymentClaimedAlertEmail } from "@/lib/email/templates";
import { isUuid, fmtDate, fmtTime } from "@/lib/timetable";
import { ptNo } from "@/lib/pt";

export type PtClaimState = { error?: string } | undefined;

const HOME = "/account/trainers";
const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const friendly = (e: { code?: string; message: string }, fallback: string) => (e.code === "P0001" ? e.message : fallback);

/** A client taps a free time. Creates the booking (or reopens the one they already hold) and goes to payment. */
export async function startPtBooking(formData: FormData) {
  const coach = text(formData, "coach");
  const date = text(formData, "date");
  const start = text(formData, "start");
  const back = isUuid(coach) ? `${HOME}?coach=${coach}` : HOME;
  if (!isUuid(coach) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}(:\d{2})?$/.test(start)) redirect(HOME);

  const profile = await getCurrentProfile();
  if (!profile) redirect(`/login?next=${encodeURIComponent(HOME)}`);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("book_pt_session", { p_trainer_id: coach, p_date: date, p_start: start });
  if (error || !data) {
    const msg = error ? friendly(error, "We couldn't book that. Please try again.") : "We couldn't book that.";
    redirect(`${back}${back.includes("?") ? "&" : "?"}error=${encodeURIComponent(msg)}`);
  }
  revalidatePath(HOME);
  redirect(`${HOME}/${data}`);
}

/** "I've paid": records the M-Pesa name and tells the gym a payment is waiting. */
export async function claimPtPayment(_prev: PtClaimState, formData: FormData): Promise<PtClaimState> {
  const id = text(formData, "booking_id");
  const mpesaName = text(formData, "mpesa_name");
  if (!isUuid(id)) return { error: "Booking not found." };
  if (mpesaName.length < 2) return { error: "Please enter the name that will show on the M-Pesa message." };

  const profile = await getCurrentProfile();
  if (!profile) redirect(`/login?next=${encodeURIComponent(`${HOME}/${id}`)}`);

  const supabase = await createClient();
  const { error } = await supabase.rpc("claim_pt_payment", { p_booking_id: id, p_mpesa_name: mpesaName });
  if (error) return { error: friendly(error, "We couldn't save that. Please try again.") };

  // Best-effort heads-up to the gym. Never blocks the client.
  const notifyTo = process.env.NOTIFICATIONS_RECIPIENT ?? process.env.ADMIN_NOTIFY_EMAIL;
  if (notifyTo && hasEmailEnv) {
    try {
      const { data } = await supabase.rpc("my_pt_bookings");
      const b = ((data ?? []) as unknown as { id: string; booking_no: number; coach_name: string; session_date: string; starts_at: string; amount_kes: number }[]).find((x) => x.id === id);
      if (b) {
        const h = await headers();
        const origin = h.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
        const mail = paymentClaimedAlertEmail({
          memberName: profile.fullName || profile.email || "A client",
          planName: `1-to-1 with ${b.coach_name}, ${fmtDate(b.session_date)} ${fmtTime(b.starts_at)}`,
          amount: b.amount_kes,
          mpesaName,
          orderNo: ptNo(b.booking_no),
          link: `${origin}/admin/one-to-one`,
        });
        const sent = await sendEmail({ to: notifyTo, ...mail });
        if (!sent.ok) console.error("[pt claim alert]", sent.error);
      }
    } catch (e) {
      console.error("[pt claim alert]", e);
    }
  }

  revalidatePath(`${HOME}/${id}`);
  redirect(`${HOME}/${id}`);
}

/** Client cancels. Unpaid is free; paid needs the notice window set in the database (24 hours by default). */
export async function cancelPtBooking(formData: FormData) {
  const id = text(formData, "booking_id");
  if (!isUuid(id)) redirect(HOME);
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_pt_booking", { p_booking_id: id, p_reason: null });
  revalidatePath(HOME);
  if (error) redirect(`${HOME}?error=${encodeURIComponent(friendly(error, "We couldn't cancel that. Please speak to the front desk."))}`);
  redirect(`${HOME}?done=cancelled`);
}
