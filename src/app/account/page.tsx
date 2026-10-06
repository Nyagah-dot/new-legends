import { requireRole } from "@/lib/auth/session";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { kes } from "@/lib/orders";

export default async function AccountPage() {
  // Re-check here too: layouts don't re-run on every client-side navigation.
  const profile = await requireRole(["member", "staff", "admin"], "/login");

  // A first real read through row-level security: proves the database wiring works.
  const supabase = await createClient();
  const { data: status } = await supabase
    .from("member_status")
    .select("plan_name, state, ends_on, days_left")
    .eq("member_id", profile.id)
    .maybeSingle();

  const { data: openOrders } = await supabase
    .from("orders")
    .select("id, status, amount_kes, plans(name)")
    .eq("member_id", profile.id)
    .in("status", ["awaiting_payment", "payment_claimed"])
    .order("created_at", { ascending: false });

  return (
    <>
      <h1>Hi {profile.fullName.split(" ")[0] || "there"}</h1>
      <p className="lead">Member no. LF-{String(profile.memberNo).padStart(4, "0")}</p>

      {(openOrders ?? []).map((o) => (
        <section key={o.id} className="portal-card" style={{ borderColor: "var(--red)" }}>
          <h2>{o.status === "awaiting_payment" ? "Finish your payment" : "Payment under review"}</h2>
          <p style={{ marginBottom: 12 }}>
            {o.plans?.name ?? "Membership"} · {kes(o.amount_kes)}.{" "}
            {o.status === "awaiting_payment"
              ? "Pay with M-Pesa, then tap “I've paid”."
              : "We're confirming it. You'll get an email once your membership is active."}
          </p>
          <Link href={`/orders/${o.id}`} className="btn btn-ghost">
            {o.status === "awaiting_payment" ? "Continue" : "View"} <span className="arrow">&rarr;</span>
          </Link>
        </section>
      ))}

      <section className="portal-card">
        <h2>Your membership</h2>
        {status ? (
          <dl className="portal-dl">
            <div><dt>Plan</dt><dd>{status.plan_name}</dd></div>
            <div><dt>Status</dt><dd style={{ textTransform: "capitalize" }}>{status.state}</dd></div>
            <div><dt>Ends</dt><dd>{status.ends_on}</dd></div>
            <div><dt>Days left</dt><dd>{status.days_left}</dd></div>
          </dl>
        ) : (
          <p>No active membership yet. <Link href="/#pricing" style={{ fontWeight: 700 }}>See pricing</Link> or ask at the front desk.</p>
        )}
      </section>

      <section className="portal-card portal-soon">
        <h2>Coming next</h2>
        <p>Your day-by-day calendar, bookings and freeze requests arrive in the member portal patch.</p>
      </section>
    </>
  );
}
