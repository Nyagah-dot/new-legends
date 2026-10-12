"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { sendEmail } from "@/lib/email/send";
import { paymentNotConfirmedEmail, visitorBookingConfirmedEmail } from "@/lib/email/templates";
import { fmtDate, fmtTime, isUuid } from "@/lib/timetable";
import { BOOKING_COLUMNS, bookingNo, hydrate, type VisitorBooking } from "@/lib/visitors";

const LOGIN = "/desk/login?as=admin";
const BACK = "/admin/visitors";
const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

function refresh() {
  revalidatePath("/admin", "layout"); // refreshes the pending badge
  revalidatePath("/desk", "layout");
  revalidatePath("/book", "layout");
}

async function loadOne(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("visitor_bookings").select(BOOKING_COLUMNS).eq("id", id).maybeSingle();
  const b = data as unknown as VisitorBooking | null;
  if (!b) return null;
  const [row] = await hydrate(supabase, [b]);
  return row ?? null;
}

type MailCode = "ok" | "fail" | "skip" | "credits";

/** Accept a payment: confirms the booking, then emails the visitor (the email never blocks the acceptance). */
export async function acceptVisitor(formData: FormData) {
  await requireRole(["admin"], LOGIN);
  const id = text(formData, "id");
  if (!isUuid(id)) redirect(`${BACK}?done=error`);
  if (formData.get("confirm") !== "on") redirect(`${BACK}?done=need_confirm`);

  const supabase = await createClient();
  const { error } = await supabase.rpc("approve_visitor_booking", { p_booking_id: id });
  if (error) {
    const msg = error.code === "P0001" ? error.message : "Database error.";
    redirect(`${BACK}?done=error&msg=${encodeURIComponent(msg)}`);
  }

  let mail: MailCode = "skip";
  try {
    const row = await loadOne(id);
    const email = row?.person?.email ?? undefined;
    if (row && row.session && email) {
      const h = await headers();
      const origin = h.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
      const sent = await sendEmail({
        to: email,
        ...visitorBookingConfirmedEmail({
          name: row.person?.full_name,
          className: row.session.name,
          date: row.session.session_date,
          startsAt: fmtTime(row.session.starts_at),
          endsAt: fmtTime(row.session.ends_at),
          coach: row.session.coach_name,
          ladiesOnly: row.session.ladies_only,
          bookingNo: bookingNo(row.booking_no),
          amount: row.amount_kes,
          siteUrl: `${origin}/book/${row.id}`,
        }),
      });
      mail = sent.ok ? "ok" : sent.code === "insufficient_credits" ? "credits" : "fail";
      if (!sent.ok) console.error("[visitor approve email]", sent.error);
    }
  } catch (e) {
    mail = "fail";
    console.error("[visitor approve email]", e);
  }

  refresh();
  redirect(`${BACK}?done=approved&mail=${mail}`);
}

export async function rejectVisitor(formData: FormData) {
  await requireRole(["admin"], LOGIN);
  const id = text(formData, "id");
  const reason = text(formData, "reason");
  if (!isUuid(id)) redirect(`${BACK}?done=error`);
  if (reason.length < 3) redirect(`${BACK}?done=need_reason`);

  const supabase = await createClient();
  const { error } = await supabase.rpc("reject_visitor_booking", { p_booking_id: id, p_reason: reason });
  if (error) {
    const msg = error.code === "P0001" ? error.message : "Database error.";
    redirect(`${BACK}?done=error&msg=${encodeURIComponent(msg)}`);
  }

  let mail: MailCode = "skip";
  try {
    const row = await loadOne(id);
    const email = row?.person?.email ?? undefined;
    if (row && email) {
      const what = row.session
        ? `single class booking (${row.session.name}, ${fmtDate(row.session.session_date)} ${fmtTime(row.session.starts_at)})`
        : "single class booking";
      const sent = await sendEmail({ to: email, ...paymentNotConfirmedEmail({ name: row.person?.full_name, planName: what, reason }) });
      mail = sent.ok ? "ok" : sent.code === "insufficient_credits" ? "credits" : "fail";
      if (!sent.ok) console.error("[visitor reject email]", sent.error);
    }
  } catch (e) {
    mail = "fail";
    console.error("[visitor reject email]", e);
  }

  refresh();
  redirect(`${BACK}?done=rejected&mail=${mail}`);
}

/** Cancel a confirmed booking (for example the visitor can't come, or the class was cancelled). A reason is required. */
export async function cancelVisitorAsAdmin(formData: FormData) {
  await requireRole(["admin"], LOGIN);
  const id = text(formData, "id");
  const reason = text(formData, "reason");
  if (!isUuid(id)) redirect(`${BACK}?done=error`);
  if (reason.length < 3) redirect(`${BACK}?done=need_reason`);
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_visitor_booking", { p_booking_id: id, p_reason: reason });
  refresh();
  if (error) redirect(`${BACK}?done=error&msg=${encodeURIComponent(error.code === "P0001" ? error.message : "Database error.")}`);
  redirect(`${BACK}?done=cancelled`);
}
