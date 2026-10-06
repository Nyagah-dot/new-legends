import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import "@/components/pay/pay.css";
import AuthShell from "@/components/auth/AuthShell";
import SubmitButton from "@/components/auth/SubmitButton";
import CopyButton from "@/components/pay/CopyButton";
import ClaimForm from "@/components/pay/ClaimForm";
import { cancelOrder } from "@/app/orders/actions";
import { getCurrentProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/timetable";
import { fmtLong, kes, orderNo } from "@/lib/orders";
import { one, type Rel } from "@/lib/rel";

type OrderView = {
  id: string; order_no: number; status: string; amount_kes: number; mpesa_name: string | null;
  reject_reason: string | null; member_id: string;
  plans: Rel<{ name: string; duration_days: number }>;
  memberships: Rel<{ starts_on: string; base_ends_on: string }>;
};

export const metadata: Metadata = { title: "Your payment — THE LEGENDS FITNESS" };

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const profile = await getCurrentProfile();
  if (!profile) redirect(`/login?next=${encodeURIComponent(`/orders/${id}`)}`);

  const supabase = await createClient();
  const { data: orderRaw } = await supabase
    .from("orders")
    .select("id, order_no, status, amount_kes, mpesa_name, reject_reason, member_id, plans(name, duration_days), memberships(starts_on, base_ends_on)")
    .eq("id", id)
    .maybeSingle();
  const order = orderRaw as unknown as OrderView | null;
  if (!order || order.member_id !== profile.id) notFound();
  const membership = one(order.memberships);

  const { data: settings } = await supabase.from("gym_settings").select("paybill_number, paybill_account").maybeSingle();
  const planName: string = one(order.plans)?.name ?? "membership";
  const ref = orderNo(order.order_no);

  return (
    <AuthShell title={order.status === "approved" ? "You're in" : "Your payment"} subtitle={`${planName} · ${kes(order.amount_kes)}`}>
      {order.status === "awaiting_payment" && (
        <>
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
                  <div><span className="k">Amount</span><span className="v">{kes(order.amount_kes)}</span></div>
                  <CopyButton value={String(order.amount_kes)} label="amount" />
                </div>
              </div>
              <div className="pay-after">
                <h2>Done paying?</h2>
                <p>Come back here and tell us whose name the M-Pesa message will show, then tap the button.</p>
                <ClaimForm orderId={order.id} defaultName={profile.fullName} />
              </div>
              <form action={cancelOrder} style={{ marginTop: 16 }}>
                <input type="hidden" name="order_id" value={order.id} />
                <button type="submit" className="auth-textbtn">Cancel this order</button>
              </form>
            </>
          ) : (
            <p className="auth-error" role="alert">Payment details aren&rsquo;t set up yet. Please speak to the front desk.</p>
          )}
        </>
      )}

      {order.status === "payment_claimed" && (
        <>
          <div className="pay-state">
            <strong>Payment received. Thank you!</strong>
            We&rsquo;re confirming it now. Please wait for the confirmation email: your membership becomes active as soon as we accept the payment.
          </div>
          <p className="pay-meta">M-Pesa name given: <strong>{order.mpesa_name}</strong> · Order {ref}</p>
          <div style={{ marginTop: 18 }}>
            <Link href="/" className="btn btn-ghost">Back to home</Link>
          </div>
        </>
      )}

      {order.status === "approved" && (
        <>
          <div className="pay-state good">
            <strong>Your {planName} membership is active.</strong>
            {membership
              ? <>From {fmtLong(membership.starts_on)} to {fmtLong(membership.base_ends_on)}.</>
              : <>Welcome to The Legends Fitness.</>}
          </div>
          <Link href="/account" className="btn btn-primary">Go to my account <span className="arrow">&rarr;</span></Link>
        </>
      )}

      {order.status === "rejected" && (
        <>
          <div className="pay-state bad">
            <strong>We couldn&rsquo;t confirm this payment.</strong>
            {order.reject_reason}
          </div>
          <p style={{ marginBottom: 14 }}>If you&rsquo;ve paid, please speak to the front desk with your M-Pesa message.</p>
          <Link href="/#pricing" className="btn btn-ghost">Back to pricing</Link>
        </>
      )}

      {(order.status === "expired" || order.status === "cancelled") && (
        <>
          <div className="pay-state">
            <strong>This order {order.status === "expired" ? "expired" : "was cancelled"}.</strong>
            {order.status === "expired" ? "If you've already paid, please tell the front desk." : "You can start again any time."}
          </div>
          <Link href="/#pricing" className="btn btn-primary">See pricing <span className="arrow">&rarr;</span></Link>
        </>
      )}
    </AuthShell>
  );
}
