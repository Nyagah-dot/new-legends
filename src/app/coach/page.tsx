import type { Metadata } from "next";
import "@/components/coach/coach.css";
import PortalShell from "@/components/auth/PortalShell";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { addDays, fmtDate, fmtTime, nairobiToday } from "@/lib/timetable";

export const metadata: Metadata = { title: "My schedule — THE LEGENDS FITNESS" };

type Item = { kind: "group" | "one_to_one" | "off"; slot_date: string; starts_at: string; ends_at: string; title: string; client: string | null; status: string };
const DONE = new Set(["completed", "no_show"]);

export default async function CoachPage() {
  const profile = await requireRole(["member", "staff", "admin"], "/login?next=%2Fcoach");
  const supabase = await createClient();
  const [infoRes, schRes] = await Promise.all([supabase.rpc("my_coach_info"), supabase.rpc("my_coach_schedule", { p_days: 14 })]);
  const info = ((infoRes.data ?? []) as unknown as { trainer_id: string; full_name: string }[])[0];
  const items = (schRes.data ?? []) as unknown as Item[];

  const today = nairobiToday();
  const byDay = new Map<string, Item[]>();
  for (const it of items) byDay.set(it.slot_date, [...(byDay.get(it.slot_date) ?? []), it]);
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i)).filter((d) => byDay.has(d));
  const todayItems = byDay.get(today) ?? [];
  const oneToOnes = items.filter((i) => i.kind === "one_to_one" && !DONE.has(i.status)).length;
  const groups = items.filter((i) => i.kind === "group" && i.status !== "cancelled").length;

  return (
    <PortalShell profile={profile} area="account">
      {!info ? (
        <>
          <h1>My schedule</h1>
          <p className="co-empty">This account isn&rsquo;t linked to a coach yet. Ask the gym admin to link your login to your coach profile.</p>
        </>
      ) : (
        <>
          <h1>{info.full_name.split(" ")[0]}&rsquo;s schedule</h1>
          <p className="lead">Next 14 days. {todayItems.length > 0 ? `${todayItems.length} on today.` : "Nothing on today."} {groups} group classes and {oneToOnes} 1-to-1 sessions coming up.</p>

          {days.length === 0 ? (
            <p className="co-empty">Nothing booked in the next 14 days.</p>
          ) : (
            days.map((d) => (
              <section key={d} className="co-day">
                <h2 className="co-date">{d === today ? "Today" : d === addDays(today, 1) ? "Tomorrow" : ""} {fmtDate(d)}</h2>
                {byDay.get(d)!.map((it, i) => {
                  const cls = it.kind === "one_to_one" ? "one" : it.kind === "group" ? "grp" : "off";
                  const cancelled = it.status === "cancelled";
                  return (
                    <div key={`${d}-${i}`} className={`co-item ${cls}${cancelled ? " cancelled" : ""}`}>
                      <span className="co-time">{it.kind === "off" ? "All day" : `${fmtTime(it.starts_at)}–${fmtTime(it.ends_at)}`}</span>
                      <div>
                        <strong>{it.kind === "one_to_one" ? it.client ?? "Client" : it.title}</strong>
                        <span className="co-tag">{it.kind === "one_to_one" ? "1-to-1" : it.kind === "group" ? "Group" : "Off"}</span>
                        {it.kind === "one_to_one" && (
                          <span className="co-sub">
                            {it.status === "confirmed" ? "Confirmed" : it.status === "payment_claimed" ? "Payment being checked" : it.status === "completed" ? "Completed" : "No show"}
                          </span>
                        )}
                        {cancelled && <span className="co-sub">Cancelled</span>}
                      </div>
                    </div>
                  );
                })}
              </section>
            ))
          )}
        </>
      )}
    </PortalShell>
  );
}
