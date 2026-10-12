import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import FreezeForm from "@/components/account/FreezeForm";
import { cancelFreezeRequest } from "@/app/account/actions";
import { addDays, nairobiToday } from "@/lib/timetable";
import { daysBetween, pickCurrent, type OverviewRow } from "@/lib/account";
import { fmtLong } from "@/lib/orders";

type Rules = { freeze_allowed: boolean; freeze_min_days: number; freeze_max_single_days: number; freeze_max_total_days: number; freeze_max_count: number; freeze_fee_kes: number };
type Settings = { freeze_min_notice_days: number; freeze_min_membership_age_days: number; freeze_min_days_remaining: number };
type Fz = { id: string; starts_on: string; resumes_on: string; status: string; is_medical: boolean; reject_reason: string | null };

export default async function FreezePage() {
  const me = await requireRole(["member", "staff", "admin"], "/login");
  const supabase = await createClient();
  const { data: ov } = await supabase.from("membership_overview")
    .select("membership_id, plan_code, plan_name, starts_on, base_ends_on, ends_on, frozen_days, state, days_left").eq("member_id", me.id);
  const cur = pickCurrent((ov ?? []) as unknown as OverviewRow[]);
  const live = cur && (cur.state === "active" || cur.state === "frozen" || cur.state === "upcoming") ? cur : null;

  if (!live) {
    return (<><h1>Freeze</h1><p className="ac-card">You need a running membership to request a freeze.</p></>);
  }

  const [planRes, setRes, fzRes] = await Promise.all([
    supabase.from("plans").select("freeze_allowed, freeze_min_days, freeze_max_single_days, freeze_max_total_days, freeze_max_count, freeze_fee_kes").eq("code", live.plan_code).maybeSingle(),
    supabase.from("gym_settings").select("freeze_min_notice_days, freeze_min_membership_age_days, freeze_min_days_remaining").maybeSingle(),
    supabase.from("membership_freezes").select("id, starts_on, resumes_on, status, is_medical, reject_reason").eq("membership_id", live.membership_id).order("starts_on", { ascending: false }),
  ]);
  const rules = planRes.data as unknown as Rules | null;
  const set = setRes.data as unknown as Settings | null;
  const freezes = (fzRes.data ?? []) as unknown as Fz[];
  const today = nairobiToday();

  const used = freezes.filter((f) => f.status === "pending" || f.status === "approved").reduce((n, f) => n + daysBetween(f.starts_on, f.resumes_on), 0);
  const count = freezes.filter((f) => f.status === "pending" || f.status === "approved").length;
  const minStart = (() => {
    const a = addDays(today, set?.freeze_min_notice_days ?? 2);
    const b = addDays(live.starts_on, set?.freeze_min_membership_age_days ?? 30);
    return a > b ? a : b;
  })();
  const canRequest = rules?.freeze_allowed && count < (rules?.freeze_max_count ?? 0);

  return (
    <>
      <h1>Freeze</h1>
      <p className="lead">Pause your {live.plan_name} membership. It resumes by itself on the date it ends, and your end date moves by the same number of days.</p>

      <section className="ac-card">
        <h2>The rules</h2>
        {!rules?.freeze_allowed ? (
          <p>The {live.plan_name} plan can&rsquo;t be frozen.</p>
        ) : (
          <ul className="ac-rules">
            <li>Each freeze lasts {rules.freeze_min_days} to {rules.freeze_max_single_days} days.</li>
            <li>At most {rules.freeze_max_total_days} frozen days and {rules.freeze_max_count} freeze(s) per membership. You&rsquo;ve used {used} day(s) and {count} freeze(s).</li>
            <li>Ask at least {set?.freeze_min_notice_days ?? 2} days ahead. The membership must have run {set?.freeze_min_membership_age_days ?? 30} days first, and have {set?.freeze_min_days_remaining ?? 14}+ days left.</li>
            <li>A fee of {rules.freeze_fee_kes > 0 ? `KES ${rules.freeze_fee_kes.toLocaleString("en-KE")}` : "nothing"} is paid at the front desk when it&rsquo;s approved (not for medical freezes).</li>
          </ul>
        )}
        {canRequest && rules && (
          <FreezeForm membershipId={live.membership_id} minStart={minStart} minDays={rules.freeze_min_days} maxDays={Math.min(rules.freeze_max_single_days, Math.max(rules.freeze_max_total_days - used, 1))} />
        )}
        {rules?.freeze_allowed && !canRequest && <p>You&rsquo;ve used all the freezes this plan allows.</p>}
      </section>

      <h2 style={{ fontSize: "1rem", marginBottom: 10 }}>Your freezes</h2>
      {freezes.length === 0 ? <p className="ac-card">None yet.</p> : (
        <div className="ac-list">
          {freezes.map((f) => (
            <div key={f.id} className="ac-item">
              <span>
                <strong>{fmtLong(f.starts_on)}</strong> to {fmtLong(addDays(f.resumes_on, -1))}
                <span className="ac-sub" style={{ display: "block" }}>{daysBetween(f.starts_on, f.resumes_on)} days{f.is_medical ? " · medical" : ""}{f.reject_reason ? ` · ${f.reject_reason}` : ""}</span>
              </span>
              <span className="ac-row">
                <span className={`pill pill-${f.status === "approved" ? "ok" : f.status === "pending" ? "warn" : "none"}`}>{f.status === "pending" ? "Waiting for the desk" : f.status}</span>
                {(f.status === "pending" || (f.status === "approved" && f.starts_on > today)) && (
                  <form action={cancelFreezeRequest}><input type="hidden" name="freeze_id" value={f.id} /><button className="auth-textbtn" type="submit">Cancel</button></form>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
