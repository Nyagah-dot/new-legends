import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import StatusPill from "@/components/desk/StatusPill";
import CheckInButton from "@/components/desk/CheckInButton";
import SellForm from "@/components/desk/SellForm";
import { lfNo, fmtClock, METHODS, type MemberRow } from "@/lib/desk";
import { fmtLong, fmtStamp, kes } from "@/lib/orders";
import { isUuid, nairobiToday } from "@/lib/timetable";
import { cancelMembership } from "@/app/desk/membership-actions";

type Status = { plan_name: string; state: string; starts_on: string; ends_on: string; days_left: number; paid_until: string | null };
type Membership = { membership_id: string; plan_name: string; starts_on: string; ends_on: string; state: string; days_left: number; frozen_days: number };
type Attendance = { visits_last_7_days: number; visits_last_30_days: number; visits_total: number; last_visit_at: string | null };
type Visit = { id: string; checked_in_at: string; checked_in_on: string };
type Payment = { id: string; kind: string; method: string; status: string; amount_kes: number; reference: string | null; paid_at: string | null };
type Plan = { code: string; name: string; price_kes: number };

export default async function MemberPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ done?: string; msg?: string }> }) {
  const me = await requireRole(["staff", "admin"], "/desk/login");
  const { id } = await params;
  const sp = await searchParams;
  if (!isUuid(id)) notFound();

  const supabase = await createClient();
  const [p, st, ms, att, cis, pays, plans] = await Promise.all([
    supabase.from("profiles").select("id, member_no, full_name, email, phone, role").eq("id", id).maybeSingle(),
    supabase.from("member_status").select("plan_name, state, starts_on, ends_on, days_left, paid_until").eq("member_id", id).maybeSingle(),
    supabase.from("membership_overview").select("membership_id, plan_name, starts_on, ends_on, state, days_left, frozen_days").eq("member_id", id).order("starts_on", { ascending: false }),
    supabase.from("member_attendance").select("visits_last_7_days, visits_last_30_days, visits_total, last_visit_at").eq("member_id", id).maybeSingle(),
    supabase.from("check_ins").select("id, checked_in_at, checked_in_on").eq("member_id", id).is("voided_at", null).order("checked_in_at", { ascending: false }).limit(10),
    supabase.from("payments").select("id, kind, method, status, amount_kes, reference, paid_at").eq("member_id", id).order("created_at", { ascending: false }).limit(10),
    supabase.from("plans").select("code, name, price_kes").eq("is_active", true).order("sort_order"),
  ]);

  const member = p.data as unknown as MemberRow | null;
  if (!member) notFound();
  const status = st.data as unknown as Status | null;
  const memberships = (ms.data ?? []) as unknown as Membership[];
  const attendance = att.data as unknown as Attendance | null;
  const visits = (cis.data ?? []) as unknown as Visit[];
  const payments = (pays.data ?? []) as unknown as Payment[];
  const planList = (plans.data ?? []) as unknown as Plan[];
  const today = nairobiToday();
  const cancellable = memberships.filter((m) => m.state !== "cancelled");

  return (
    <>
      {sp.done === "cancelled" && <p className="portal-card" role="status">Membership cancelled.</p>}
      {sp.done === "error" && <p className="portal-card" role="alert">{sp.msg || "Something went wrong."}</p>}
      <div className="dk-head">
        <h1>{member.full_name || "(no name)"}</h1>
        <p className="meta">
          {lfNo(member.member_no)}{member.role !== "member" ? ` · ${member.role}` : ""}
          {member.phone ? ` · ${member.phone}` : " · no phone on file"}
          {member.email ? ` · ${member.email}` : " · no email on file"}
        </p>
        <StatusPill state={status?.state} daysLeft={status?.days_left} />
        <dl className="dk-stats">
          <div><dt>Plan</dt><dd>{status?.plan_name ?? "—"}</dd></div>
          <div><dt>Paid until</dt><dd>{status?.paid_until ? fmtLong(status.paid_until) : "—"}</dd></div>
          <div><dt>Visits (7 / 30 days)</dt><dd>{attendance?.visits_last_7_days ?? 0} / {attendance?.visits_last_30_days ?? 0}</dd></div>
          <div><dt>Last visit</dt><dd>{attendance?.last_visit_at ? fmtStamp(attendance.last_visit_at) : "—"}</dd></div>
        </dl>
        <CheckInButton memberId={member.id} />
      </div>

      <section className="dk-card">
        <h2>Sell a membership</h2>
        <SellForm memberId={member.id} plans={planList} />
      </section>

      <h2 className="dk-h">Memberships</h2>
      {memberships.length === 0 ? (
        <p className="portal-card">None yet.</p>
      ) : (
        <div className="dk-scroll">
          <table className="dk-table">
            <thead><tr><th>Plan</th><th>Starts</th><th>Ends</th><th>Status</th></tr></thead>
            <tbody>
              {memberships.map((m) => (
                <tr key={m.membership_id}>
                  <td>{m.plan_name}</td>
                  <td>{fmtLong(m.starts_on)}</td>
                  <td>{fmtLong(m.ends_on)}{m.frozen_days > 0 ? ` (incl. ${m.frozen_days} frozen)` : ""}</td>
                  <td><StatusPill state={m.state} daysLeft={m.days_left} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {me.role === "admin" && cancellable.length > 0 && (
        <section className="dk-card">
          <h2>Cancel a membership (admin)</h2>
          <p style={{ fontSize: ".88rem", color: "var(--steel)", marginBottom: 12 }}>
            Ends the membership now and cancels any freeze booked on it. If you refunded money, enter the amount: it is recorded
            and can never be more than what was paid. This cannot be undone.
          </p>
          <form action={cancelMembership} className="dk-form" style={{ display: "grid", gap: 10, maxWidth: 460 }}>
            <input type="hidden" name="member_id" value={member.id} />
            <label>Which membership
              <select name="membership_id" required defaultValue="">
                <option value="" disabled>Choose…</option>
                {cancellable.map((m) => (
                  <option key={m.membership_id} value={m.membership_id}>{m.plan_name}: {fmtLong(m.starts_on)} to {fmtLong(m.ends_on)}</option>
                ))}
              </select>
            </label>
            <label>Reason
              <input type="text" name="reason" required minLength={3} maxLength={200} placeholder="e.g. Moved away, paid twice" />
            </label>
            <label>Refund amount in KES (0 if none)
              <input type="number" name="refund" min={0} step={1} defaultValue={0} inputMode="numeric" />
            </label>
            <label>Refunded by
              <select name="method" defaultValue="cash">
                {METHODS.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
              </select>
            </label>
            <label>Reference (M-Pesa code, if any)
              <input type="text" name="reference" maxLength={60} />
            </label>
            <button type="submit" className="btn btn-sm">Cancel this membership</button>
          </form>
        </section>
      )}

      <h2 className="dk-h">Recent visits</h2>
      <div className="dk-list">
        {visits.length === 0 ? (
          <p className="dk-empty">No visits yet.</p>
        ) : (
          visits.map((v) => (
            <div key={v.id} className="dk-row">
              <span>{fmtLong(v.checked_in_on)} · {fmtClock(v.checked_in_at)}</span>
              {v.checked_in_on === today && <span className="s">Today: undo it from the Check-in tab</span>}
            </div>
          ))
        )}
      </div>

      <h2 className="dk-h">Recent payments</h2>
      {payments.length === 0 ? (
        <p className="portal-card">None yet.</p>
      ) : (
        <div className="dk-scroll">
          <table className="dk-table">
            <thead><tr><th>When</th><th>For</th><th>Method</th><th>Reference</th><th>Amount</th></tr></thead>
            <tbody>
              {payments.map((x) => (
                <tr key={x.id}>
                  <td>{fmtStamp(x.paid_at)}</td>
                  <td>{x.kind.replace("_", " ")}</td>
                  <td>{x.method.replace("_", " ")}</td>
                  <td>{x.reference ?? "—"}</td>
                  <td>{kes(x.amount_kes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
