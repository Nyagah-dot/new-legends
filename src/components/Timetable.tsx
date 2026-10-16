import "./Timetable.css";
import type { CSSProperties } from "react";
import { createPublicClient } from "@/lib/supabase/public";
import { DAY_SHORT, addDays, fmtDate, fmtTime, nairobiToday, type ClassRow } from "@/lib/timetable";
import { classTone } from "./classTone";
import TimetableShell from "./TimetableShell";
import RectCta from "./RectCta";

type Slot = { start: string; end: string; cells: ClassRow[][] };
type Cancelled = { id: string; session_date: string; name: string; starts_at: string; cancel_reason: string | null };

async function loadTimetable(): Promise<{ classes: ClassRow[] | null; cancelled: Cancelled[]; problem: string | null }> {
  const supabase = createPublicClient();
  if (!supabase) return { classes: null, cancelled: [], problem: "Supabase keys are missing from .env.local" };

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
    cancelled: (cancelledRes.data ?? []) as Cancelled[],
    problem: classesRes.error ? classesRes.error.message : null,
  };
}

/** The single-class price shown in the "try a class" bar (same price as the day pass). */
async function loadTryPrice(): Promise<number> {
  const supabase = createPublicClient();
  if (!supabase) return 1000;
  const { data } = await supabase.from("plans").select("price_kes").eq("code", "day_pass").maybeSingle();
  return (data as { price_kes: number } | null)?.price_kes ?? 1000;
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

const tone = (name: string) => ({ "--tone": classTone(name) }) as CSSProperties;

/** Index 0..6 (Mon..Sun) of today in Nairobi, so the table can highlight the current day. */
function todayColumn(): number {
  const jsDay = new Date(`${nairobiToday()}T00:00:00Z`).getUTCDay(); // 0 = Sun
  return (jsDay + 6) % 7;
}

export default async function Timetable() {
  const [{ classes, cancelled, problem }, tryPrice] = await Promise.all([loadTimetable(), loadTryPrice()]);
  const slots = classes ? buildSlots(classes) : [];
  const legend = classes ? [...new Set(classes.map((c) => c.name))] : [];
  const today = todayColumn();

  return (
    <TimetableShell>
      {/* ---------- image + card (the "UFC" half) ---------- */}
      <div className="ltt__stage">
        <div className="ltt__bg" aria-hidden="true">
          <img src="/images/timetable/bg.webp" alt="" loading="lazy" decoding="async" />
        </div>

        <div className="ltt__card">
          <span className="eyebrow" data-fade>How you can train here</span>
          <h2 className="ltt__title">
            <span className="ltt__mask">
              <span data-rise>
                The weekly <span className="ltt__red">timetable</span>
              </span>
            </span>
          </h2>
          <p className="ltt__text" data-fade>
            Open gym all day. Coached classes at set times. Drop into any session that fits &mdash; a coach is always
            on the floor.
          </p>
          <div data-fade>
            <RectCta href="#timetable" label="See the timetable" tone="red" appear="none" />
          </div>
        </div>
      </div>

      {/* ---------- the colour-coded table (the "Fitness Club" half) ---------- */}
      <div className="ltt__panel" id="timetable">
        <div className="ltt__sheet">
          {cancelled.length > 0 && (
            <div className="ltt__alert" role="status">
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

          {slots.length === 0 && (
            <p className="ltt__empty-msg">
              {classes === null
                ? "The timetable is temporarily unavailable. Please check back shortly."
                : "The timetable is being finalised. Check back soon."}
            </p>
          )}

          {/* Developer-only hint (npm run dev). Never shown on the live site. */}
          {process.env.NODE_ENV !== "production" && problem && (
            <p className="ltt__note">DEV: timetable query failed: {problem}</p>
          )}

          {slots.length > 0 && (
            <>
              <p className="ltt__hint">Swipe to see the full week &rarr;</p>
              <div className="ltt__scroll" role="region" aria-label="Weekly class timetable, scrollable" tabIndex={0}>
                <table className="ltt__table">
                  <caption className="ltt__sr">Weekly class timetable, 24-hour times</caption>
                  <thead>
                    <tr>
                      <th scope="col" className="ltt__time">Time</th>
                      {DAY_SHORT.map((d, i) => (
                        <th
                          scope="col"
                          key={d}
                          className={i === today ? "ltt__today" : undefined}
                          aria-current={i === today ? "date" : undefined}
                        >
                          {d}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {slots.map((slot) => (
                      <tr key={`${slot.start}-${slot.end}`} data-row>
                        <th scope="row" className="ltt__time">
                          {fmtTime(slot.start)}&ndash;{fmtTime(slot.end)}
                        </th>
                        {slot.cells.map((cell, i) =>
                          cell.length === 0 ? (
                            <td key={i} className={`ltt__cell ltt__cell--empty${i === today ? " ltt__cell--today" : ""}`} aria-label="No class">
                              &mdash;
                            </td>
                          ) : (
                            <td key={i} className={`ltt__cell${i === today ? " ltt__cell--today" : ""}`}>
                              {cell.map((c) => (
                                <div key={c.id} className="ltt__class" style={tone(c.name)}>
                                  <span className="ltt__name">{c.name}</span>
                                  {(c.coach_name || !c.bookable) && (
                                    <span className="ltt__coach">{c.coach_name ?? "Just turn up"}</span>
                                  )}
                                  {c.ladies_only && <span className="ltt__tag">Ladies only</span>}
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

              <ul className="ltt__legend" aria-label="Class colours">
                {legend.map((n) => (
                  <li key={n} style={tone(n)}>{n}</li>
                ))}
              </ul>
              <p className="ltt__note">Times are 24-hour. Ladies Only sessions are tagged in red.</p>
            </>
          )}

          <div className="ltt__try">
            <div>
              <strong>New here? Try one class.</strong>
              <span>
                No membership needed. Book a single coached class for KES {tryPrice.toLocaleString("en-KE")}.
              </span>
            </div>
            <RectCta href="/book" label="Try a class" tone="red" />
          </div>
        </div>
      </div>
    </TimetableShell>
  );
}
