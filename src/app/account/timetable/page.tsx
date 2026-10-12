import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { addDays, fmtDate, fmtTime, nairobiToday, type SessionRow } from "@/lib/timetable";

type S = SessionRow & { ladies_only: boolean; bookable: boolean };

export default async function MemberTimetablePage() {
  await requireRole(["member", "staff", "admin"], "/login");
  const today = nairobiToday();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("class_sessions")
    .select("id, session_date, name, coach_name, starts_at, ends_at, capacity, status, cancel_reason, ladies_only, bookable")
    .gte("session_date", today).lte("session_date", addDays(today, 6))
    .order("session_date").order("starts_at");
  const list = (data ?? []) as unknown as S[];
  const byDate = new Map<string, S[]>();
  for (const s of list) byDate.set(s.session_date, [...(byDate.get(s.session_date) ?? []), s]);

  return (
    <>
      <h1>This week</h1>
      <p className="lead">The next seven days. Open gym is available during opening hours. Just come in and check in at the desk.</p>
      {error && <p className="auth-error">Couldn&rsquo;t load the timetable.</p>}
      {list.length === 0 && !error && <p className="ac-card">No classes are scheduled yet.</p>}
      {[...byDate.entries()].map(([date, sessions]) => (
        <div key={date} style={{ marginBottom: 18 }}>
          <div className="adm-day-head" style={{ fontFamily: "var(--font-mono)", fontSize: ".72rem", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", background: "var(--ink)", color: "#fff", padding: "8px 14px" }}>
            {fmtDate(date)}{date === today ? " · Today" : ""}
          </div>
          <div className="ac-list" style={{ borderTop: 0 }}>
            {sessions.map((s) => (
              <div key={s.id} className="ac-item" style={s.status === "cancelled" ? { opacity: 0.55 } : undefined}>
                <span>
                  <strong>{s.name}</strong>{s.ladies_only ? " · Ladies only" : ""}
                  <span className="ac-sub" style={{ display: "block" }}>{fmtTime(s.starts_at)}–{fmtTime(s.ends_at)}{s.coach_name ? ` · ${s.coach_name}` : ""}</span>
                </span>
                {s.status === "cancelled" && <span className="pill pill-bad">Cancelled{s.cancel_reason ? `: ${s.cancel_reason}` : ""}</span>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
