import Link from "next/link";
import { createPublicClient } from "@/lib/supabase/public";
import { perLabel } from "@/lib/orders";

type Plan = { code: string; name: string; price_kes: number; duration_days: number };

async function loadPlans(): Promise<Plan[]> {
  const supabase = createPublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("plans")
    .select("code, name, price_kes, duration_days")
    .eq("is_active", true)
    .order("sort_order");
  if (error) console.error("[pricing]", error.message);
  return (data ?? []) as Plan[];
}

export default async function Pricing() {
  const plans = await loadPlans();

  // "Best value" = the lowest price per day among the multi-day plans; "save" compares it to paying monthly.
  const monthly = plans.find((p) => p.duration_days === 30);
  const multi = plans.filter((p) => p.duration_days > 1);
  const best = multi.length ? multi.reduce((a, b) => (b.price_kes / b.duration_days < a.price_kes / a.duration_days ? b : a)) : null;
  const saving = best && monthly ? monthly.price_kes * Math.round(best.duration_days / 30) - best.price_kes : 0;

  return (
    <section id="pricing" className="pricing">
      <div className="wrap">
        <div className="shead">
          <span className="eyebrow">Straight pricing</span>
          <h2>No lock-in. <span className="serif i">No joining fees.</span></h2>
        </div>
        {plans.length === 0 ? (
          <p className="lead">Prices are being finalised. Check back soon.</p>
        ) : (
          <div className="prices">
            {plans.map((p) => {
              const isBest = best?.code === p.code && saving > 0;
              return (
                <div key={p.code} className={`price${isBest ? " best" : ""}`}>
                  <span className="plan">{p.name.toUpperCase()}</span>
                  {isBest && <span className="tag2">BEST VALUE — SAVE {saving.toLocaleString("en-KE")}</span>}
                  <div className="amt">{p.price_kes.toLocaleString("en-KE")}</div>
                  <span className="per">{perLabel(p.duration_days)}</span>
                  <Link href={`/join?plan=${p.code}`} className="btn btn-light">
                    {p.duration_days === 1 ? "Get a pass" : "Join"}
                  </Link>
                </div>
              );
            })}
          </div>
        )}
        <p className="pricenote">Not sure yet? Book a session and come try it — no lock-in.</p>
      </div>
    </section>
  );
}
