import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { cancelSession, generateSessions, restoreSession } from "./actions";
import { addDays, fmtDate, fmtTime, nairobiToday, type SessionRow } from "@/lib/timetable";

const NOTES: Record<string, { text: string; err?: boolean }> = {
  cancelled: { text: "Date cancelled. It now shows as cancelled on the website." },
  restored: { text: "Date restored." },
  generated: { text: "Dates created for the next four weeks." },
  need_reason: { text: "Please give a short reason before cancelling.", err: true },
  error: { text: "Something went wrong. Please try again.", err: true },
};

export default async function SessionsPage({ searchParams }: { searchParams: Promise<{ done?: string }> }) {
  await requireRole(["admin"], "/desk/login?as=admin");
  const { done } = await searchParams;

  const today = nairobiToday();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("class_sessions")
    .select("id, session_date, name, coach_name, starts_at, ends_at, capacity, status, cancel_reason")
    .gte("session_date", today)
    .lte("session_date", addDays(today, 14))
    .order("session_date")
    .order("starts_at");

  const sessions = (data ?? []) as SessionRow[];
  const byDate = new Map<string, SessionRow[]>();
  for (const s of sessions) byDate.set(s.session_date, [...(byDate.get(s.session_date) ?? []), s]);
  const note = done ? NOTES[done] : undefined;

  return (
    <>
      <div className="adm-head">
        <div>
          <h1>Dates</h1>
          <p className="lead">The next two weeks. Cancel a single day without touching the weekly class.</p>
        </div>
        <form action={generateSessions}>
          <button type="submit" className="btn btn-ghost">Create the next 4 weeks of dates</button>
        </form>
      </div>

      {note && <p className={`adm-note${note.err ? " err" : ""}`} role="status">{note.text}</p>}
      {error && <p className="adm-note err" role="alert">Couldn&rsquo;t load dates: {error.message}</p>}

      {sessions.length === 0 && !error ? (
        <p className="portal-card">
          No dates yet. Add classes first, then press &ldquo;Create the next 4 weeks of dates&rdquo;.
        </p>
      ) : (
        [...byDate.entries()].map(([date, list]) => (
          <div key={date} style={{ marginBottom: 20 }}>
            <div className="adm-day-head">{fmtDate(date)}{date === today ? " · Today" : ""}</div>
            <div className="adm-scroll" style={{ borderTop: 0 }}>
              <table className="adm-table">
                <tbody>
                  {list.map((s) => {
                    const cancelled = s.status === "cancelled";
                    return (
                      <tr key={s.id} className={cancelled ? "off" : undefined}>
                        <td style={{ whiteSpace: "nowrap", width: 120 }}>{fmtTime(s.starts_at)}–{fmtTime(s.ends_at)}</td>
                        <td>
                          <strong>{s.name}</strong>
                          {s.coach_name && <span className="sub">{s.coach_name}</span>}
                        </td>
                        <td>
                          {cancelled ? (
                            <>
                              <span className="adm-tag red">Cancelled</span>
                              {s.cancel_reason && <span className="sub">{s.cancel_reason}</span>}
                            </>
                          ) : (
                            <span className="adm-tag">On</span>
                          )}
                        </td>
                        <td>
                          {cancelled ? (
                            <form action={restoreSession}>
                              <input type="hidden" name="id" value={s.id} />
                              <button type="submit" className="btn btn-ghost btn-sm">Restore</button>
                            </form>
                          ) : (
                            <form action={cancelSession} className="adm-inline">
                              <input type="hidden" name="id" value={s.id} />
                              <input type="text" name="reason" placeholder="Reason, e.g. coach unwell" required minLength={2} />
                              <button type="submit" className="btn btn-danger btn-sm">Cancel this date</button>
                            </form>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </>
  );
}
