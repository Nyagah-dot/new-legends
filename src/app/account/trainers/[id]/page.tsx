import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import "@/components/pay/pay.css";
import "@/components/account/pt.css";
import CopyButton from "@/components/pay/CopyButton";
import PtClaimForm from "@/components/account/PtClaimForm";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { fmtDate, fmtTime, isUuid } from "@/lib/timetable";
import { fmtStamp, kes } from "@/lib/orders";
import { PT_LABEL, ptNo, type MyPt } from "@/lib/pt";
import { cancelPtBooking } from "../actions";

export const metadata: Metadata = { title: "Your 1-to-1 session — THE LEGENDS FITNESS" };

export default async function PtBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const profile = await requireRole(["member", "staff", "admin"], "/login");

  const supabase = await createClient();
  const [mRes, gRes] = await Promise.all([
    supabase.rpc("my_pt_bookings"),
    supabase.from("gym_settings").select("paybill_number, paybill_account, pt_hold_minutes, pt_cancel_hours, pt_grace_minutes").maybeSingle(),
  ]);
  const b = ((mRes.data ?? []) as unknown as MyPt[]).find((x) => x.id === id);
  if (!b) notFound();
  const gs = gRes.data as unknown as { paybill_number: string | null; paybill_account: string | null; pt_hold_minutes: number; pt_cancel_hours: number; pt_grace_minutes: number } | null;

  const holdMs = (gs?.pt_hold_minutes ?? 120) * 60000;
  const holdUntil = new Date(new Date(b.created_at).getTime() + holdMs).toISOString();
  const lapsed = b.status === "awaiting_payment" && new Date(holdUntil).getTime() < Date.now();
  const status = lapsed ? "expired" : b.status;
  const when = `${fmtDate(b.session_date)} · ${fmtTime(b.starts_at)}–${fmtTime(b.ends_at)}`;
  const canCancel = status === "awaiting_payment" || status === "payment_claimed" || status === "confirmed";

  return (
    <>
      <h1>{status === "confirmed" ? "You're booked" : "Your 1-to-1 session"}</h1>
      <p className="lead">{b.coach_name} · {when}</p>

      <div className="ac-card">
        {status === "awaiting_payment" && (
          <>
            <dl className="pay-sum">
              <div><dt>Coach</dt><dd>{b.coach_name}</dd></div>
              <div><dt>When</dt><dd>{when}</dd></div>
              <div><dt>Price</dt><dd>{kes(b.amount_kes)}</dd></div>
            </dl>
            {gs?.paybill_number && gs?.paybill_account ? (
              <>
                <ol className="pay-steps">
                  <li>Open <strong>M-Pesa</strong> on your phone.</li>
                  <li>Go to <strong>Lipa na M-Pesa, then Pay Bill</strong>.</li>
                  <li>Enter the details below exactly, then your PIN.</li>
                </ol>
                <div className="pay-box">
                  <div className="pay-row"><div><span className="k">Business no.</span><span className="v">{gs.paybill_number}</span></div><CopyButton value={gs.paybill_number} label="business number" /></div>
                  <div className="pay-row"><div><span className="k">Account no.</span><span className="v">{gs.paybill_account}</span></div><CopyButton value={gs.paybill_account} label="account number" /></div>
                  <div className="pay-row"><div><span className="k">Amount</span><span className="v">{kes(b.amount_kes)}</span></div><CopyButton value={String(b.amount_kes)} label="amount" /></div>
                </div>
                <div className="pay-after">
                  <h2>Done paying?</h2>
                  <p>Come back here, tell us whose name the M-Pesa message will show, then tap the button. Your time is held until {fmtStamp(holdUntil)}.</p>
                  <PtClaimForm bookingId={b.id} defaultName={profile.fullName} />
                </div>
              </>
            ) : (
              <p className="auth-error" role="alert">Payment details aren&rsquo;t set up yet. Please speak to the front desk.</p>
            )}
          </>
        )}

        {status === "payment_claimed" && (
          <div className="pay-state">
            <strong>Payment received. Thank you!</strong>
            We&rsquo;re confirming it now. You&rsquo;ll get an email as soon as it&rsquo;s accepted. Your time is being held. Booking {ptNo(b.booking_no)}.
          </div>
        )}

        {status === "confirmed" && (
          <>
            <div className="pay-state good">
              <strong>Your session is confirmed.</strong>
              {b.coach_name} · {when}. Booking {ptNo(b.booking_no)}.
            </div>
            <ul className="ac-rules">
              <li>Arrive a few minutes early and tell the front desk your name.</li>
              <li>If you&rsquo;re more than {gs?.pt_grace_minutes ?? 15} minutes late, the session counts as a no show.</li>
              <li>You can cancel online up to {gs?.pt_cancel_hours ?? 24} hours before the start. After that, please speak to the front desk.</li>
            </ul>
          </>
        )}

        {(status === "completed" || status === "no_show") && (
          <div className="pay-state"><strong>{PT_LABEL[status]}.</strong>{b.coach_name} · {when}.</div>
        )}

        {status === "rejected" && (
          <div className="pay-state bad">
            <strong>We couldn&rsquo;t confirm this payment.</strong>
            {b.reject_reason}
            <span style={{ display: "block", marginTop: 8 }}>If you&rsquo;ve paid, please speak to the front desk with your M-Pesa message.</span>
          </div>
        )}

        {(status === "expired" || status === "cancelled") && (
          <div className="pay-state">
            <strong>This booking {status === "expired" ? "expired" : "was cancelled"}.</strong>
            {status === "expired" ? "The time was released because the payment wasn't marked in time. If you've already paid, please tell the front desk." : (b.reject_reason ?? "You can book again any time.")}
            {b.refund_due && <span style={{ display: "block", marginTop: 8 }}>A refund of {kes(b.amount_kes)} is due. The gym will send it to you by M-Pesa.</span>}
          </div>
        )}

        {canCancel && (
          <form action={cancelPtBooking} style={{ marginTop: 16 }}>
            <input type="hidden" name="booking_id" value={b.id} />
            <button type="submit" className="pt-linkbtn">Cancel this booking</button>
          </form>
        )}
      </div>

      <Link href="/account/trainers" className="btn btn-ghost">&larr; All 1-to-1 sessions</Link>
    </>
  );
}
