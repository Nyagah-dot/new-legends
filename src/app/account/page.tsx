import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import MembershipCalendar from "@/components/account/MembershipCalendar";
import StatusPill from "@/components/desk/StatusPill";
import { firstName, paidUntil, pickCurrent, type CalDay, type OverviewRow } from "@/lib/account";
import { fmtLong, kes } from "@/lib/orders";
import { lfNo } from "@/lib/desk";
import { daysBetween } from "@/lib/account";
import { one, type Rel } from "@/lib/rel";

type OpenOrder = { id: string; status: string; amount_kes: number; plans: Rel<{ name: string }> };
type Att = { visits_last_7_days: number; visits_last_30_days: number; visits_total: number };

export default async function AccountPage() {
  const me = await requireRole(["member", "staff", "admin"], "/login");
  const supabase = await createClient();

  const [ovRes, ordRes, attRes] = await Promise.all([
    supabase.from("membership_overview")
      .select("membership_id, plan_code, plan_name, starts_on, base_ends_on, ends_on, frozen_days, state, days_left")
      .eq("member_id", me.id),
    supabase.from("orders").select("id, status, amount_kes, plans(name)").eq("member_id", me.id)
      .in("status", ["awaiting_payment", "payment_claimed"]).order("created_at", { ascending: false }),
    supabase.from("member_attendance").select("visits_last_7_days, visits_last_30_days, visits_total").eq("member_id", me.id).maybeSingle(),
  ]);
  const rows = (ovRes.data ?? []) as unknown as OverviewRow[];
  const orders = (ordRes.data ?? []) as unknown as OpenOrder[];
  const att = attRes.data as unknown as Att | null;
  const cur = pickCurrent(rows);

  let days: CalDay[] = [];
  if (cur && cur.state !== "cancelled") {
    const { data } = await supabase.rpc("membership_calendar", { p_membership_id: cur.membership_id });
    days = (data ?? []) as unknown as CalDay[];
  }

  const total = cur ? daysBetween(cur.starts_on, cur.ends_on) + 1 : 0;
  const pct = cur && total > 0 ? Math.min(100, Math.max(0, Math.round(((total - cur.days_left) / total) * 100))) : 0;
  const ending = cur && cur.state === "active" && cur.days_left <= 7;
  const ended = cur && (cur.state === "expired" || cur.state === "cancelled");
  const until = paidUntil(rows);

  return (
    <>
      <h1>Hi {firstName(me.fullName) || "there"}</h1>
      <p className="lead">Member no. {lfNo(me.memberNo)}</p>

      {orders.map((o) => (
        <div key={o.id} className="ac-banner">
          <strong>{o.status === "awaiting_payment" ? "Finish your payment" : "Payment under review"}</strong>
          {one(o.plans)?.name ?? "Membership"} · {kes(o.amount_kes)}.{" "}
          {o.status === "awaiting_payment" ? "Pay with M-Pesa, then tap “I’ve paid”." : "We’re confirming it. You’ll get an email once your membership is active."}
          <div style={{ marginTop: 10 }}>
            <Link href={`/orders/${o.id}`} className="btn btn-ghost">{o.status === "awaiting_payment" ? "Continue" : "View"} <span className="arrow">&rarr;</span></Link>
          </div>
        </div>
      ))}

      {(ending || ended) && cur && (
        <div className="ac-banner">
          <strong>{ended ? "Your membership has ended" : `Only ${cur.days_left} day${cur.days_left === 1 ? "" : "s"} left`}</strong>
          Renew to keep training{!ended && until ? `: a new plan starts the day after ${fmtLong(until)}` : ""}.
          <div style={{ marginTop: 10 }}>
            <Link href={`/join?plan=${cur.plan_code}`} className="btn btn-primary">Renew {cur.plan_name} <span className="arrow">&rarr;</span></Link>
          </div>
        </div>
      )}

      <section className="ac-card">
        <h2>Your membership</h2>
        {!cur ? (
          <p>No membership yet. <Link href="/#pricing" style={{ fontWeight: 700 }}>See pricing</Link> or ask at the front desk.</p>
        ) : (
          <>
            <div className="ac-row"><strong style={{ fontSize: "1.2rem" }}>{cur.plan_name}</strong><StatusPill state={cur.state} daysLeft={cur.days_left} /></div>
            <div className="ac-bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>
            <p className="ac-sub">{pct}% of this membership used</p>
            <dl className="ac-stats">
              <div><dt>Days left</dt><dd>{cur.days_left}</dd></div>
              <div><dt>Starts</dt><dd>{fmtLong(cur.starts_on)}</dd></div>
              <div><dt>Ends</dt><dd>{fmtLong(cur.ends_on)}</dd></div>
              <div><dt>Visits (7 / 30 days)</dt><dd>{att?.visits_last_7_days ?? 0} / {att?.visits_last_30_days ?? 0}</dd></div>
            </dl>
            {cur.frozen_days > 0 && <p className="ac-sub">Includes {cur.frozen_days} frozen day(s) added to your end date.</p>}
            <div className="ac-row" style={{ marginTop: 14 }}>
              <Link href={`/join?plan=${cur.plan_code}`} className="btn btn-ghost">Renew <span className="arrow">&rarr;</span></Link>
              <Link href="/account/freeze" className="btn btn-ghost">Freeze</Link>
            </div>
          </>
        )}
      </section>

      {days.length > 0 && (
        <section className="ac-card">
          <h2>Your days</h2>
          <p className="ac-sub" style={{ marginBottom: 10 }}>Days cross off by themselves as they pass. The front desk ticks the days you train when you check in.</p>
          <MembershipCalendar days={days} />
        </section>
      )}

      <section className="ac-card">
        <h2>Coming up</h2>
        <p style={{ marginBottom: 12 }}>See this week&rsquo;s classes. Just turn up and check in at the desk.</p>
        <Link href="/account/timetable" className="btn btn-ghost">This week&rsquo;s timetable <span className="arrow">&rarr;</span></Link>
      </section>
    </>
  );
}
