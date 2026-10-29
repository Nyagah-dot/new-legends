"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { sendEmail } from "@/lib/email/send";
import { paymentNotConfirmedEmail, ptBookingConfirmedEmail } from "@/lib/email/templates";
import { fmtDate, fmtTime, isUuid } from "@/lib/timetable";
import { PT_COLUMNS, hydratePt, ptNo, type PtBooking, type PtRow } from "@/lib/pt";

const LOGIN = "/desk/login?as=admin";
const BACK = "/admin/one-to-one";
const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const dbMsg = (e: { code?: string; message: string }) => (e.code === "P0001" ? e.message : "Database error.");
const METHODS = ["cash", "mpesa_paybill", "card", "bank_transfer", "other"];

type MailCode = "ok" | "fail" | "skip" | "credits";

function refresh() {
  revalidatePath("/admin", "layout"); // refreshes the pending badge
  revalidatePath("/account/trainers", "layout");
}

async function loadOne(id: string): Promise<PtRow | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("pt_bookings").select(PT_COLUMNS).eq("id", id).maybeSingle();
  const b = data as unknown as PtBooking | null;
  if (!b) return null;
  const [row] = await hydratePt(supabase, [b]);
  return row ?? null;
}

/** Accept a payment: confirms the session, then emails the client (the email never blocks the acceptance). */
export async function acceptPt(formData: FormData) {
  await requireRole(["admin"], LOGIN);
  const id = text(formData, "id");
  if (!isUuid(id)) redirect(`${BACK}?done=error`);
  if (formData.get("confirm") !== "on") redirect(`${BACK}?done=need_confirm`);

  const supabase = await createClient();
  const { error } = await supabase.rpc("approve_pt_booking", { p_booking_id: id });
  if (error) redirect(`${BACK}?done=error&msg=${encodeURIComponent(dbMsg(error))}`);

  let mail: MailCode = "skip";
  try {
    const row = await loadOne(id);
    const email = row?.person?.email ?? undefined;
    if (row && email) {
      const h = await headers();
      const origin = h.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
      const sent = await sendEmail({
        to: email,
        ...ptBookingConfirmedEmail({
          name: row.person?.full_name,
          coach: row.coach,
          date: row.session_date,
          startsAt: fmtTime(row.starts_at),
          endsAt: fmtTime(row.ends_at),
          bookingNo: ptNo(row.booking_no),
          amount: row.amount_kes,
          siteUrl: `${origin}/account/trainers/${row.id}`,
        }),
      });
      mail = sent.ok ? "ok" : sent.code === "insufficient_credits" ? "credits" : "fail";
      if (!sent.ok) console.error("[pt approve email]", sent.error);
    }
  } catch (e) {
    mail = "fail";
    console.error("[pt approve email]", e);
  }
  refresh();
  redirect(`${BACK}?done=approved&mail=${mail}`);
}

export async function rejectPt(formData: FormData) {
  await requireRole(["admin"], LOGIN);
  const id = text(formData, "id");
  const reason = text(formData, "reason");
  if (!isUuid(id)) redirect(`${BACK}?done=error`);
  if (reason.length < 3) redirect(`${BACK}?done=need_reason`);

  const supabase = await createClient();
  const { error } = await supabase.rpc("reject_pt_booking", { p_booking_id: id, p_reason: reason });
  if (error) redirect(`${BACK}?done=error&msg=${encodeURIComponent(dbMsg(error))}`);

  let mail: MailCode = "skip";
  try {
    const row = await loadOne(id);
    const email = row?.person?.email ?? undefined;
    if (row && email) {
      const what = `1-to-1 session with ${row.coach} (${fmtDate(row.session_date)} ${fmtTime(row.starts_at)})`;
      const sent = await sendEmail({ to: email, ...paymentNotConfirmedEmail({ name: row.person?.full_name, planName: what, reason }) });
      mail = sent.ok ? "ok" : sent.code === "insufficient_credits" ? "credits" : "fail";
      if (!sent.ok) console.error("[pt reject email]", sent.error);
    }
  } catch (e) {
    mail = "fail";
    console.error("[pt reject email]", e);
  }
  refresh();
  redirect(`${BACK}?done=rejected&mail=${mail}`);
}

/** The gym or coach cancels a booking. A paid one is flagged "refund due". A reason is required. */
export async function cancelPtAsAdmin(formData: FormData) {
  await requireRole(["admin"], LOGIN);
  const id = text(formData, "id");
  const reason = text(formData, "reason");
  if (!isUuid(id)) redirect(`${BACK}?done=error`);
  if (reason.length < 3) redirect(`${BACK}?done=need_reason`);
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_pt_booking", { p_booking_id: id, p_reason: reason });
  refresh();
  if (error) redirect(`${BACK}?done=error&msg=${encodeURIComponent(dbMsg(error))}`);
  redirect(`${BACK}?done=cancelled`);
}

/** After the session: mark it completed or a no show. */
export async function closePt(formData: FormData) {
  await requireRole(["admin"], LOGIN);
  const id = text(formData, "id");
  const outcome = text(formData, "outcome");
  if (!isUuid(id) || !["completed", "no_show"].includes(outcome)) redirect(`${BACK}?done=error`);
  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_pt_booking", { p_booking_id: id, p_outcome: outcome });
  refresh();
  if (error) redirect(`${BACK}?done=error&msg=${encodeURIComponent(dbMsg(error))}`);
  redirect(`${BACK}?done=${outcome}`);
}

/** Record a refund you paid by hand, or choose "no refund" (for example a late cancellation). */
export async function settleRefund(formData: FormData) {
  await requireRole(["admin"], LOGIN);
  const id = text(formData, "id");
  const waive = text(formData, "waive") === "1";
  const method = text(formData, "method");
  const reference = text(formData, "reference");
  if (!isUuid(id)) redirect(`${BACK}?done=error`);
  if (!waive && !METHODS.includes(method)) redirect(`${BACK}?done=need_method`);
  if (!waive && method !== "cash" && method !== "other" && reference.length < 3) redirect(`${BACK}?done=need_ref`);

  const supabase = await createClient();
  const { error } = await supabase.rpc("settle_pt_refund", {
    p_booking_id: id,
    p_method: waive ? null : method,
    p_reference: waive || !reference ? null : reference,
    p_waive: waive,
  });
  refresh();
  if (error) redirect(`${BACK}?done=error&msg=${encodeURIComponent(dbMsg(error))}`);
  redirect(`${BACK}?done=${waive ? "waived" : "refunded"}`);
}
