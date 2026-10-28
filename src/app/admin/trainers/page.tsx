import "@/components/admin/trainers.css";
import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { kes } from "@/lib/orders";
import { TRAINER_COLUMNS, hoursSummary, type HoursRow, type TrainerRow } from "@/lib/trainers";

export default async function TrainersPage() {
  await requireRole(["admin"], "/desk/login?as=admin");
  const supabase = await createClient();

  const [tRes, hRes, cRes] = await Promise.all([
    supabase.from("trainers").select(TRAINER_COLUMNS).order("sort_order").order("full_name"),
    supabase.from("trainer_hours").select("id, trainer_id, weekday, starts_at, ends_at"),
    supabase.from("classes").select("id, trainer_id").not("trainer_id", "is", null),
  ]);

  const trainers = (tRes.data ?? []) as unknown as TrainerRow[];
  const hours = (hRes.data ?? []) as unknown as HoursRow[];
  const led = (cRes.data ?? []) as unknown as { id: string; trainer_id: string }[];

  const hoursBy = new Map<string, HoursRow[]>();
  for (const h of hours) hoursBy.set(h.trainer_id, [...(hoursBy.get(h.trainer_id) ?? []), h]);
  const ledBy = new Map<string, number>();
  for (const c of led) ledBy.set(c.trainer_id, (ledBy.get(c.trainer_id) ?? 0) + 1);

  const loadError = tRes.error ?? hRes.error;

  return (
    <>
      <div className="adm-head">
        <div>
          <h1>Trainers</h1>
          <p className="lead">Who coaches at the gym, when each trainer works, and what a 1-to-1 session costs.</p>
        </div>
        <Link href="/admin/trainers/new" className="btn btn-primary">Add trainer <span className="arrow">&rarr;</span></Link>
      </div>

      {loadError && (
        <p className="adm-note err" role="alert">
          Couldn&rsquo;t load trainers: {loadError.message}. Has the patch 24 SQL been run in Supabase?
        </p>
      )}

      {trainers.length === 0 && !loadError ? (
        <p className="portal-card">No trainers yet. Add your first one.</p>
      ) : (
        <div className="adm-scroll">
          <table className="adm-table">
            <thead>
              <tr><th>Trainer</th><th>1-to-1 session</th><th>Weekly hours</th><th>Classes led</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {trainers.map((t) => {
                const summary = hoursSummary(hoursBy.get(t.id) ?? []);
                return (
                  <tr key={t.id} className={t.is_active ? undefined : "off"}>
                    <td>
                      <strong>{t.full_name}</strong>
                      {t.title && <span className="sub">{t.title}</span>}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {t.session_price_kes > 0 ? kes(t.session_price_kes) : <span className="adm-tag red">Set price</span>}
                      <span className="sub">{t.slot_minutes} min</span>
                    </td>
                    <td>
                      {summary.length === 0 ? (
                        <span className="adm-tag red">No hours</span>
                      ) : (
                        summary.map((s) => (
                          <span key={s.days + s.time} className="sub" style={{ color: "var(--ink)" }}>{s.days} · {s.time}</span>
                        ))
                      )}
                    </td>
                    <td>{ledBy.get(t.id) ?? 0}</td>
                    <td>{t.is_active ? <span className="adm-tag">Active</span> : <span className="adm-tag dark">Hidden</span>}</td>
                    <td>
                      <Link href={`/admin/trainers/${t.id}`} className="btn btn-ghost btn-sm">Edit</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ marginTop: 16, fontSize: ".9rem", color: "var(--steel)" }}>
        To say which trainer leads a group class, open the class under Classes and pick the trainer there.
      </p>
    </>
  );
}
