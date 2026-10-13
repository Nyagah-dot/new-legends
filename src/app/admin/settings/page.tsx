import "@/components/admin/settings.css";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { addPlan, savePlan, saveSettings } from "./actions";
import { perLabel } from "@/lib/orders";

type Plan = {
  id: string; code: string; name: string; price_kes: number; duration_days: number; sort_order: number; is_active: boolean;
  freeze_allowed: boolean; freeze_min_days: number; freeze_max_single_days: number; freeze_max_total_days: number;
  freeze_max_count: number; freeze_fee_kes: number;
};
type Settings = {
  paybill_number: string | null; paybill_account: string | null; visitor_spots_per_class: number; visitor_hold_minutes: number;
  freeze_min_notice_days: number; freeze_min_membership_age_days: number; freeze_min_days_remaining: number;
  freeze_hard_ceiling_pct: number; booking_cancel_cutoff_hours: number;
};

const NOTES: Record<string, string> = {
  plan_saved: "Plan saved. The website pricing is updated.",
  plan_added: "Plan added. It's switched OFF: tick \"Show on the website\" on it and save when you're ready.",
  settings_saved: "Settings saved.",
};

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ done?: string; msg?: string }> }) {
  await requireRole(["admin"], "/desk/login?as=admin");
  const sp = await searchParams;
  const supabase = await createClient();
  const [plansRes, setRes] = await Promise.all([
    supabase.from("plans").select("*").order("sort_order"),
    supabase.from("gym_settings").select("*").maybeSingle(),
  ]);
  const plans = (plansRes.data ?? []) as unknown as Plan[];
  const s = setRes.data as unknown as Settings | null;
  const loadError = plansRes.error ?? setRes.error;

  return (
    <>
      <div className="adm-head">
        <div>
          <h1>Settings</h1>
          <p className="lead">Plans and prices, where members send their M-Pesa, and the gym&rsquo;s rules.</p>
        </div>
      </div>

      {sp.done && NOTES[sp.done] && <p className="adm-note" role="status">{NOTES[sp.done]}</p>}
      {sp.done === "error" && <p className="adm-note err" role="alert">{sp.msg || "Something went wrong."}</p>}
      {loadError && <p className="adm-note err" role="alert">Couldn&rsquo;t load settings: {loadError.message}</p>}

      <h2 className="pay-h" style={{ marginTop: 0 }}>Plans and prices</h2>
      <p style={{ fontSize: ".88rem", color: "var(--steel)", marginBottom: 14 }}>
        Changing a price only affects NEW sales. Memberships and orders already made keep the price they were sold at.
        The <strong>Day pass</strong> price is also the price of a single class for visitors.
      </p>

      {plans.map((p) => (
        <form key={p.id} action={savePlan} className={`st-card st-form st-plan${p.is_active ? "" : " off"}`}>
          <input type="hidden" name="id" value={p.id} />
          <h3>
            {p.name}
            <span className="adm-tag">{p.code}</span>
            <span className="adm-tag">{p.duration_days === 1 ? "1 day" : `${p.duration_days} days`}</span>
            {!p.is_active && <span className="adm-tag red">Hidden</span>}
          </h3>
          <div className="st-grid">
            <label className="f">Name<input name="name" type="text" defaultValue={p.name} required minLength={2} maxLength={40} /></label>
            <label className="f">Price (KES)<input name="price_kes" type="number" min={0} max={1000000} defaultValue={p.price_kes} required />
              <span className="hint">{perLabel(p.duration_days)}</span></label>
            <label className="f">Order on site<input name="sort_order" type="number" min={0} max={1000} defaultValue={p.sort_order} required />
              <span className="hint">Smaller shows first.</span></label>
          </div>
          <label className="adm-check">
            <input type="checkbox" name="is_active" defaultChecked={p.is_active} />
            <span>Show on the website<small>Untick to stop selling it. Existing members keep it.</small></span>
          </label>
          <label className="adm-check">
            <input type="checkbox" name="freeze_allowed" defaultChecked={p.freeze_allowed} />
            <span>Freezing allowed<small>If ticked, fill in the rules below.</small></span>
          </label>
          <div className="st-rules st-grid">
            <label className="f">Shortest freeze (days)<input name="freeze_min_days" type="number" min={0} defaultValue={p.freeze_min_days} /></label>
            <label className="f">Longest single freeze<input name="freeze_max_single_days" type="number" min={0} defaultValue={p.freeze_max_single_days} /></label>
            <label className="f">Most frozen days in total<input name="freeze_max_total_days" type="number" min={0} defaultValue={p.freeze_max_total_days} /></label>
            <label className="f">Most freezes<input name="freeze_max_count" type="number" min={0} defaultValue={p.freeze_max_count} /></label>
            <label className="f">Freeze fee (KES)<input name="freeze_fee_kes" type="number" min={0} defaultValue={p.freeze_fee_kes} /></label>
          </div>
          <div className="adm-actions"><button type="submit" className="btn btn-primary btn-sm">Save {p.name}</button></div>
        </form>
      ))}

      <form action={addPlan} className="st-card st-form">
        <h2>Add a plan</h2>
        <p className="sub">It starts hidden. Set freeze rules and switch it on afterwards. The code and length can&rsquo;t be changed later.</p>
        <div className="st-grid">
          <label className="f">Code<input name="code" type="text" placeholder="two_month" required pattern="[a-z][a-z_]{1,29}" /></label>
          <label className="f">Name<input name="name" type="text" placeholder="Two months" required minLength={2} maxLength={40} /></label>
          <label className="f">Price (KES)<input name="price_kes" type="number" min={0} required /></label>
          <label className="f">Length (days)<input name="duration_days" type="number" min={1} max={1000} required /></label>
        </div>
        <div className="adm-actions"><button type="submit" className="btn btn-primary btn-sm">Add plan</button></div>
      </form>

      <h2 className="pay-h">Payments and rules</h2>
      {s && (
        <form action={saveSettings} className="st-card st-form">
          <h2>M-Pesa Paybill</h2>
          <p className="sub">Shown to members and visitors on the payment page. Check these carefully: customers send real money here.</p>
          <div className="st-grid">
            <label className="f">Business number<input name="paybill_number" type="text" inputMode="numeric" defaultValue={s.paybill_number ?? ""} required /></label>
            <label className="f">Account number<input name="paybill_account" type="text" defaultValue={s.paybill_account ?? ""} required /></label>
          </div>

          <h2 style={{ marginTop: 10 }}>Single-class visitors</h2>
          <div className="st-grid">
            <label className="f">Visitor spots per class<input name="visitor_spots_per_class" type="number" min={0} max={100} defaultValue={s.visitor_spots_per_class} required /></label>
            <label className="f">Hold an unpaid spot (minutes)<input name="visitor_hold_minutes" type="number" min={15} max={1440} defaultValue={s.visitor_hold_minutes} required />
              <span className="hint">120 = 2 hours.</span></label>
          </div>

          <h2 style={{ marginTop: 10 }}>Freeze rules (all plans)</h2>
          <div className="st-grid">
            <label className="f">Ask this many days ahead<input name="freeze_min_notice_days" type="number" min={0} max={90} defaultValue={s.freeze_min_notice_days} required /></label>
            <label className="f">Membership must have run (days)<input name="freeze_min_membership_age_days" type="number" min={0} max={365} defaultValue={s.freeze_min_membership_age_days} required /></label>
            <label className="f">Days that must remain<input name="freeze_min_days_remaining" type="number" min={0} max={365} defaultValue={s.freeze_min_days_remaining} required /></label>
            <label className="f">Absolute ceiling (% of plan)<input name="freeze_hard_ceiling_pct" type="number" min={1} max={100} defaultValue={s.freeze_hard_ceiling_pct} required />
              <span className="hint">Nobody, not even an admin override, can freeze more than this.</span></label>
          </div>

          <h2 style={{ marginTop: 10 }}>Class bookings</h2>
          <div className="st-grid">
            <label className="f">Cancel up to this many hours before<input name="booking_cancel_cutoff_hours" type="number" min={0} max={72} defaultValue={s.booking_cancel_cutoff_hours} required /></label>
          </div>
          <div className="adm-actions"><button type="submit" className="btn btn-primary btn-sm">Save settings</button></div>
        </form>
      )}
    </>
  );
}
