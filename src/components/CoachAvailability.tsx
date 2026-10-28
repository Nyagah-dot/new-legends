import "./CoachesLive.css";
import Link from "next/link";
import { addDays, fmtDate, fmtTime, nairobiToday } from "@/lib/timetable";
import { kes } from "@/lib/orders";
import { ONE_TO_ONE_HREF, ONE_TO_ONE_ONLINE } from "@/lib/site";
import type { OpenSlot, PublicCoach } from "@/lib/publicCoaches";

/** Public view: which coach is free, and when, over the next seven days. Never shows who booked. */
export default function CoachAvailability({ coaches, slots }: { coaches: PublicCoach[]; slots: OpenSlot[] }) {
  const today = nairobiToday();
  const tomorrow = addDays(today, 1);

  // coach -> date -> start times
  const byCoach = new Map<string, Map<string, string[]>>();
  for (const s of slots) {
    const days = byCoach.get(s.trainer_id) ?? new Map<string, string[]>();
    days.set(s.slot_date, [...(days.get(s.slot_date) ?? []), s.starts_at]);
    byCoach.set(s.trainer_id, days);
  }

  return (
    <section className="lav" id="coach-availability" aria-labelledby="lav-title">
      <div className="lav__inner">
        <p className="lav__eyebrow"><span className="lav__tick" aria-hidden="true" />1-to-1 sessions</p>
        <h2 className="lav__title" id="lav-title">
          Available <span>this week</span>
        </h2>
        <p className="lav__lead">
          Open times for private sessions with our coaches over the next seven days. One coach, one client, built around your goal.
        </p>

        <div className="lav__grid">
          {coaches.map((c) => {
            const days = byCoach.get(c.id);
            return (
              <article key={c.id} className="lav__card">
                <header className="lav__head">
                  <h3 className="lav__name">{c.full_name}</h3>
                  <p className="lav__role">{c.title?.trim() || "Coach"}</p>
                  <p className="lav__meta">
                    {c.session_price_kes > 0 ? `${kes(c.session_price_kes)} · ` : ""}
                    {c.slot_minutes} min session
                  </p>
                </header>

                {!days || days.size === 0 ? (
                  <p className="lav__none">No open times in the next seven days. Check back soon.</p>
                ) : (
                  <ul className="lav__days">
                    {[...days.entries()].map(([date, starts]) => (
                      <li key={date} className="lav__day">
                        <span className="lav__date">
                          {date === today ? "Today" : date === tomorrow ? "Tomorrow" : fmtDate(date)}
                          {(date === today || date === tomorrow) && <small>{fmtDate(date)}</small>}
                        </span>
                        <ul className="lav__times" aria-label={`Open times on ${fmtDate(date)}`}>
                          {starts.map((t) => (
                            <li key={t}>{fmtTime(t)}</li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            );
          })}
        </div>

        <div className="lav__cta">
          {ONE_TO_ONE_ONLINE ? (
            <Link href={ONE_TO_ONE_HREF} className="lav__btn">Sign in to book a 1-to-1</Link>
          ) : (
            <p>Online booking is opening soon. To book a 1-to-1 session now, ask at the front desk.</p>
          )}
          <p className="lav__note">Times are start times in Nairobi time (24-hour clock).</p>
        </div>
      </div>
    </section>
  );
}
