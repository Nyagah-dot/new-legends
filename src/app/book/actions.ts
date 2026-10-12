"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { hasEmailEnv, sendEmail } from "@/lib/email/send";
import { paymentClaimedAlertEmail } from "@/lib/email/templates";
import { isUuid, fmtDate, fmtTime } from "@/lib/timetable";
import { bookingNo } from "@/lib/visitors";

export type VisitorClaimState = { error?: string } | undefined;

const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const friendly = (e: { code?: string; message: string }, fallback: string) => (e.code === "P0001" ? e.message : fallback);

/** "Book this class": needs an account. Creates the booking (or reopens the one already open) and goes to its payment page. */
export async function startVisitorBooking(formData: FormData) {
  const sessionId = text(formData, "session_id");
  if (!isUuid(sessionId)) redirect("/book");

  const profile = await getCurrentProfile();
  if (!profile) redirect(`/login?next=${encodeURIComponent("/book")}`);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("book_visitor_session", { p_session_id: sessionId });
  if (error || !data) {
    redirect(`/book?error=${encodeURIComponent(error ? friendly(error, "We couldn't book that. Please try again.") : "We couldn't book that.")}`);
  }
  redirect(`/book/${data}`);
}

/** "I've paid": records the M-Pesa name and tells the gym a payment is waiting. */
export async function claimVisitorPayment(_prev: VisitorClaimState, formData: FormData): Promise<VisitorClaimState> {
  const id = text(formData, "booking_id");
  const mpesaName = text(formData, "mpesa_name");
  if (!isUuid(id)) return { error: "Booking not found." };
  if (mpesaName.length < 2) return { error: "Please enter the name that will show on the M-Pesa message." };

  const profile = await getCurrentProfile();
  if (!profile) redirect(`/login?next=${encodeURIComponent(`/book/${id}`)}`);

  const supabase = await createClient();
  const { error } = await supabase.rpc("claim_visitor_payment", { p_booking_id: id, p_mpesa_name: mpesaName });
  if (error) return { error: friendly(error, "We couldn't save that. Please try again.") };

  // Best-effort heads-up to the gym. Never blocks the visitor.
  const notifyTo = process.env.NOTIFICATIONS_RECIPIENT ?? process.env.ADMIN_NOTIFY_EMAIL;
  if (notifyTo && hasEmailEnv) {
    try {
      const { data: b } = await supabase.from("visitor_bookings").select("booking_no, amount_kes, session_id").eq("id", id).maybeSingle();
      const bk = b as unknown as { booking_no: number; amount_kes: number; session_id: string } | null;
      if (bk) {
        const { data: s } = await supabase.from("class_sessions").select("name, session_date, starts_at").eq("id", bk.session_id).maybeSingle();
        const ses = s as unknown as { name: string; session_date: string; starts_at: string } | null;
        const h = await headers();
        const origin = h.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
        const mail = paymentClaimedAlertEmail({
          memberName: profile.fullName || profile.email || "A visitor",
          planName: ses ? `Single class: ${ses.name}, ${fmtDate(ses.session_date)} ${fmtTime(ses.starts_at)}` : "Single class",
          amount: bk.amount_kes,
          mpesaName,
          orderNo: bookingNo(bk.booking_no),
          link: `${origin}/admin/visitors`,
        });
        const sent = await sendEmail({ to: notifyTo, ...mail });
        if (!sent.ok) console.error("[visitor claim alert]", sent.error);
      }
    } catch (e) {
      console.error("[visitor claim alert]", e);
    }
  }

  revalidatePath(`/book/${id}`);
  redirect(`/book/${id}`);
}

export async function cancelVisitorBooking(formData: FormData) {
  const id = text(formData, "booking_id");
  if (!isUuid(id)) redirect("/book");
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  const supabase = await createClient();
  await supabase.rpc("cancel_visitor_booking", { p_booking_id: id, p_reason: null });
  revalidatePath("/book");
  redirect("/book");
}
