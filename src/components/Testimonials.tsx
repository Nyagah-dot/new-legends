import "./Timetable.css";
import { createPublicClient } from "@/lib/supabase/public";
import { DAY_SHORT, addDays, fmtDate, fmtTime, nairobiToday, type ClassRow } from "@/lib/timetable";

type Slot = { start: string; end: string; cells: ClassRow[][] };

async function loadTimetable() {
  const supabase = createPublicClient();
  if (!supabase) return { classes: null, cancelled: [] as { id: string; session_date: string; name: string; starts_at: string; cancel_reason: string | null }[] };

  const today = nairobiToday();
  const [classesRes, cancelledRes] = await Promise.all([
    supabase
      .from("classes")
      .select("id, name, coach_name, weekdays, starts_at, ends_at, bookable, ladies_only, capacity, description, is_active")
      .eq("is_active", true)
      .order("starts_at"),
    supabase
      .from("class_sessions")
      .select("id, session_date, name, starts_at, cancel_reason")
      .eq("status", "cancelled")
      .gte("session_date", today)
      .lte("session_date", addDays(today, 14))
      .order("session_date")
      .order("starts_at"),
  ]);

  if (classesRes.error) console.error("[timetable]", classesRes.error.message);
  return {
    classes: classesRes.error ? null : ((classesRes.data ?? []) as ClassRow[]),
    cancelled: cancelledRes.data ?? [],
  };
}

function buildSlots(classes: ClassRow[]): Slot[] {
  const slots = new Map<string, Slot>();
  for (const c of classes) {
    const key = `${c.starts_at}|${c.ends_at}`;
    if (!slots.has(key)) slots.set(key, { start: c.starts_at, end: c.ends_at, cells: Array.from({ length: 7 }, () => []) });
    for (const d of c.weekdays) slots.get(key)!.cells[d - 1]?.push(c);
  }
  return [...slots.values()].sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end));
}

export default async function Timetable() {
  const { classes, cancelled } = await loadTimetable();
  const slots = classes ? buildSlots(classes) : [];

  return (
    <section id="classes" className="classes">
      <div className="wrap">
        <div className="shead">
          <span className="eyebrow">How you can train here</span>
          <h2>The weekly <span className="serif i">timetable.</span></h2>
          <p className="lead">
            Open gym all day. Coached classes at set times. Drop into any session that fits &mdash; a coach is
            always on the floor.
          </p>
        </div>

        {cancelled.length > 0 && (
          <div className="tt-alert" role="status">
            <strong>Cancelled this fortnight</strong>
            <ul>
              {cancelled.map((s) => (
                <li key={s.id}>
                  {s.name} &middot; {fmtDate(s.session_date)} {fmtTime(s.starts_at)}
                  {s.cancel_reason ? ` (${s.cancel_reason})` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}

        {slots.length === 0 ? (
          <p className="lead">
            {classes === null ? "The timetable is temporarily unavailable. Please check back shortly." : "The timetable is being finalised. Check back soon."}
          </p>
        ) : (
          <>
            <div className="tt-scroll">
              <table className="tt">
                <thead>
                  <tr>
                    <th>Time</th>
                    {DAY_SHORT.map((d) => <th key={d}>{d}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {slots.map((slot) => (
                    <tr key={`${slot.start}-${slot.end}`}>
                      <td className="time">{fmtTime(slot.start)}–{fmtTime(slot.end)}</td>
                      {slot.cells.map((cell, i) =>
                        cell.length === 0 ? (
                          <td key={i} className="empty">&mdash;</td>
                        ) : (
                          <td key={i} className={cell.some((c) => c.ladies_only) ? "ladies" : undefined}>
                            {cell.map((c) => (
                              <div key={c.id}>
                                <div className="cls">{c.name}</div>
                                {(c.coach_name || !c.bookable) && (
                                  <div className="co">{c.coach_name ?? "Just turn up"}</div>
                                )}
                              </div>
                            ))}
                          </td>
                        )
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="ttnote">Ladies Only sessions are marked in red. Times are 24-hour.</p>
          </>
        )}
      </div>
    </section>
  );
}
