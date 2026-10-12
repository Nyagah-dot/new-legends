import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import "@/components/pay/pay.css";
import BookShell from "@/components/book/BookShell";
import CopyButton from "@/components/pay/CopyButton";
import VisitorClaimForm from "@/components/book/VisitorClaimForm";
import { cancelVisitorBooking } from "@/app/book/actions";
import { getCurrentProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { fmtDate, fmtTime, isUuid } from "@/lib/timetable";
import { fmtStamp, kes } from "@/lib/orders";
import { BOOKING_COLUMNS, bookingNo, type VisitorBooking, type VisitorSession } from "@/lib/visitors";

export const metadata: Metadata = { title: "Your class booking — THE LEGENDS FITNESS" };

export default async function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const profile = await getCurrentProfile();
  if (!profile) redirect(`/login?next=${encodeURIComponent(`/book/${id}`)}`);

  const supabase = await createClient();
  const { data: raw } = await supabase.from("visitor_bookings").select(BOOKING_COLUMNS).eq("id", id).eq("member_id", profile.id).maybeSingle();
  const b = raw as unknown as VisitorBooking | null;
  if (!b) notFound();

  const [sRes, setRes] = await Promise.all([
    supabase.from("class_sessions").select("id, session_date, name, coach_name, starts_at, ends_at, ladies_only, status").eq("id", b.session_id).maybeSingle(),
    supabase.from("gym_settings").select("paybill_number, paybill_account, visitor_hold_minutes").maybeSingle(),
  ]);
  const s = sRes.data as unknown as VisitorSession | null;
  const settings = setRes.data as unknown as { paybill_number: string | null; paybill_account: string | null; visitor_hold_minutes: number } | null;
  if (!s) notFound();

  const when = `${fmtDate(s.session_date)} · ${fmtTime(s.starts_at)}–${fmtTime(s.ends_at)}`;
  const ref = bookingNo(b.booking_no);
  const holdUntil = new Date(new Date(b.created_at).getTime() + (settings?.visitor_hold_minutes ?? 120) * 60000).toISOString();
  const cancelled = s.status === "cancelled";

  return (
    <BookShell>
      <h1>{b.status === "confirmed" ? "You're booked" : "Your class booking"}</h1>
      <p className="lead">{s.name}{s.ladies_only ? " (Ladies only)" : ""} · {when}{s.coach_name ? ` · ${s.coach_name}` : ""}</p>

      <div className="bk-card">
        {cancelled && b.status !== "cancelled" && (
          <div className="pay-state bad">
            <strong>This class was cancelled.</strong>
            Please speak to the front desk about a refund or another class.
          </div>
        )}

        {b.status === "awaiting_payment" && !cancelled && (
          <>
            <dl className="pay-sum">
              <div><dt>Class</dt><dd>{s.name}</dd></div>
              <div><dt>When</dt><dd>{when}</dd></div>
              <div><dt>Price</dt><dd>{kes(b.amount_kes)}</dd></div>
            </dl>
            {settings?.paybill_number && settings?.paybill_account ? (
              <>
                <ol className="pay-steps">
                  <li>Open <strong>M-Pesa</strong> on your phone.</li>
                  <li>Go to <strong>Lipa na M-Pesa → Pay Bill</strong>.</li>
                  <li>Enter the details below exactly, then your PIN.</li>
                </ol>
                <div className="pay-box">
                  <div className="pay-row">
                    <div><span className="k">Business no.</span><span className="v">{settings.paybill_number}</span></div>
                    <CopyButton value={settings.paybill_number} label="business number" />
                  </div>
                  <div className="pay-row">
                    <div><span className="k">Account no.</span><span className="v">{settings.paybill_account}</span></div>
                    <CopyButton value={settings.paybill_account} label="account number" />
                  </div>
                  <div className="pay-row">
                    <div><span className="k">Amount</span><span className="v">{kes(b.amount_kes)}</span></div>
                    <CopyButton value={String(b.amount_kes)} label="amount" />
                  </div>
                </div>
                <div className="pay-after">
                  <h2>Done paying?</h2>
                  <p>Come back here, tell us whose name the M-Pesa message will show, then tap the button. Your spot is held until {fmtStamp(holdUntil)}.</p>
                  <VisitorClaimForm bookingId={b.id} defaultName={profile.fullName} />
                </div>
                <form action={cancelVisitorBooking} style={{ marginTop: 16 }}>
                  <input type="hidden" name="booking_id" value={b.id} />
                  <button type="submit" className="auth-textbtn">Cancel this booking</button>
                </form>
              </>
            ) : (
              <p className="auth-error" role="alert">Payment details aren&rsquo;t set up yet. Please speak to the front desk.</p>
            )}
          </>
        )}

        {b.status === "payment_claimed" && (
          <>
            <div className="pay-state">
              <strong>Payment received. Thank you!</strong>
              We&rsquo;re confirming it now. You&rsquo;ll get a confirmation email as soon as we accept the payment. Your spot is being held.
            </div>
            <p className="pay-meta">M-Pesa name given: <strong>{b.mpesa_name}</strong> · Booking {ref}</p>
          </>
        )}

        {(b.status === "confirmed" || b.status === "attended") && (
          <>
            <div className="pay-state good">
              <strong>{b.status === "attended" ? "You've been checked in." : "Your spot is confirmed."}</strong>
              {s.name} · {when}. Booking {ref}.
            </div>
            {b.status === "confirmed" && (
              <ul className="bk-rules">
                <li>Arrive about 15 minutes early and tell the front desk your name. They&rsquo;ll check you in.</li>
                <li>Bring water, a towel and training shoes.</li>
                <li>Can&rsquo;t make it? Please tell the front desk before the class.</li>
              </ul>
            )}
          </>
        )}

        {b.status === "rejected" && (
          <div className="pay-state bad">
            <strong>We couldn&rsquo;t confirm this payment.</strong>
            {b.reject_reason}
            <span style={{ display: "block", marginTop: 8 }}>If you&rsquo;ve paid, please speak to the front desk with your M-Pesa message.</span>
          </div>
        )}

        {(b.status === "expired" || b.status === "cancelled") && (
          <div className="pay-state">
            <strong>This booking {b.status === "expired" ? "expired" : "was cancelled"}.</strong>
            {b.status === "expired" ? "The spot was released because the payment wasn't marked in time. If you've already paid, please tell the front desk." : (b.reject_reason ?? "You can book again any time.")}
          </div>
        )}
      </div>

      <Link href="/book" className="btn btn-ghost">&larr; Other classes</Link>
    </BookShell>
  );
}
