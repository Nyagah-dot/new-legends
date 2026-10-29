import "@/components/admin/trainers.css";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import TrainerForm from "@/components/admin/TrainerForm";
import SubmitButton from "@/components/auth/SubmitButton";
import { addHours, addTimeOff, deleteHours, deleteTimeOff } from "../actions";
import { DAY_SHORT, daysLabel, fmtDate, fmtTime, isUuid, nairobiToday } from "@/lib/timetable";
import { TRAINER_COLUMNS, type HoursRow, type TimeOffRow, type TrainerRow } from "@/lib/trainers";

const NOTES: Record<string, { text: string; err?: boolean }> = {
  created: { text: "Coach added. Now set their weekly hours below." },
  saved: { text: "Saved." },
  hours_added: { text: "Hours added." },
  hours_removed: { text: "Hours removed." },
  off_added: { text: "Time off added." },
  off_removed: { text: "Time off removed." },
  error: { text: "Something went wrong. Please try again.", err: true },
};

type LedClass = { id: string; name: string; weekdays: number[]; starts_at: string; ends_at: string };

export default async function EditTrainerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ done?: string; msg?: string }>;
}) {
  await requireRole(["admin"], "/desk/login?as=admin");
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const sp = await searchParams;
  const today = nairobiToday();

  const supabase = await createClient();
  const [tRes, hRes, oRes, cRes] = await Promise.all([
    supabase.from("trainers").select(TRAINER_COLUMNS).eq("id", id).maybeSingle(),
    supabase.from("trainer_hours").select("id, trainer_id, weekday, starts_at, ends_at").eq("trainer_id", id).order("starts_at"),
    supabase.from("trainer_time_off").select("id, trainer_id, off_date, starts_at, ends_at, reason")
      .eq("trainer_id", id).gte("off_date", today).order("off_date").order("starts_at"),
    supabase.from("classes").select("id, name, weekdays, starts_at, ends_at").eq("trainer_id", id).order("starts_at"),
  ]);

  if (tRes.error) {
    return <p className="adm-note err" role="alert">Couldn&rsquo;t load this coach: {tRes.error.message}</p>;
  }
  if (!tRes.data) notFound();

  const trainer = tRes.data as unknown as TrainerRow;
  const hours = (hRes.data ?? []) as unknown as HoursRow[];
  const timeOff = (oRes.data ?? []) as unknown as TimeOffRow[];
  const led = (cRes.data ?? []) as unknown as LedClass[];

  const note = sp.done ? NOTES[sp.done] : undefined;
  const noteText = sp.done === "error" ? sp.msg || note?.text : note?.text;

  return (
    <>
      <div className="adm-head">
        <div>
          <h1>{trainer.full_name}</h1>
          <p className="lead">
            Details, weekly hours and time off. Clients will only be offered times inside the weekly hours, outside the classes this coach leads and outside time off.
          </p>
        </div>
        <Link href="/admin/trainers" className="btn btn-ghost">&larr; All coaches</Link>
      </div>

      {note && <p className={`adm-note${note.err ? " err" : ""}`} role="status">{noteText}</p>}

      <TrainerForm initial={trainer} />

      {/* ---- Weekly hours ---- */}
      <section className="tr-card" aria-labelledby="hours-h">
        <h2 id="hours-h">Weekly hours</h2>
        <p className="tr-sub">The times this coach can take 1-to-1 sessions, every week. A day can have more than one window (for example a morning and an evening).</p>

        {DAY_SHORT.map((label, i) => {
          const wins = hours.filter((h) => h.weekday === i + 1);
          return (
            <div key={label} className="tr-row">
              <span className="d">{label}</span>
              <span className="tr-wins">
                {wins.length === 0 ? (
                  <span className="tr-none">Not working</span>
                ) : (
                  wins.map((w) => (
                    <form key={w.id} action={deleteHours} className="tr-win">
                      <input type="hidden" name="id" value={w.id} />
                      <input type="hidden" name="trainer_id" value={trainer.id} />
                      {fmtTime(w.starts_at)}–{fmtTime(w.ends_at)}
                      <button type="submit" aria-label={`Remove ${label} ${fmtTime(w.starts_at)} to ${fmtTime(w.ends_at)}`}>&times;</button>
                    </form>
                  ))
                )}
              </span>
            </div>
          );
        })}

        <form action={addHours} className="tr-add">
          <input type="hidden" name="trainer_id" value={trainer.id} />
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend>Add hours on</legend>
            <div className="adm-days">
              {DAY_SHORT.map((label, i) => (
                <label key={label} className="adm-day">
                  <input type="checkbox" name="days" value={i + 1} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="adm-grid2">
            <label className="f">
              From
              <input name="starts_at" type="time" defaultValue="06:00" required />
            </label>
            <label className="f">
              Until
              <input name="ends_at" type="time" defaultValue="10:00" required />
            </label>
          </div>
          <div><SubmitButton className="btn btn-primary btn-sm">Add hours</SubmitButton></div>
        </form>
      </section>

      {/* ---- Time off ---- */}
      <section className="tr-card" aria-labelledby="off-h">
        <h2 id="off-h">Time off</h2>
        <p className="tr-sub">Days or hours this coach is away (leave, sickness, an appointment). Clients can&rsquo;t book them then.</p>

        {timeOff.length === 0 ? (
          <p className="tr-none">No time off coming up.</p>
        ) : (
          timeOff.map((o) => (
            <div key={o.id} className="tr-row">
              <span className="grow">
                <strong>{fmtDate(o.off_date)}</strong>
                {o.off_date === today ? " · Today" : ""}
                <span className="sub">
                  {o.starts_at && o.ends_at ? `${fmtTime(o.starts_at)}–${fmtTime(o.ends_at)}` : "All day"}
                  {o.reason ? ` · ${o.reason}` : ""}
                </span>
              </span>
              <form action={deleteTimeOff}>
                <input type="hidden" name="id" value={o.id} />
                <input type="hidden" name="trainer_id" value={trainer.id} />
                <button type="submit" className="btn btn-danger btn-sm">Remove</button>
              </form>
            </div>
          ))
        )}

        <form action={addTimeOff} className="tr-add">
          <input type="hidden" name="trainer_id" value={trainer.id} />
          <label className="f">
            Date
            <input name="off_date" type="date" min={today} defaultValue={today} required />
          </label>
          <div className="adm-grid2">
            <label className="f">
              From (optional)
              <input name="starts_at" type="time" />
            </label>
            <label className="f">
              Until (optional)
              <input name="ends_at" type="time" />
              <span className="hint">Leave both empty for the whole day.</span>
            </label>
          </div>
          <label className="f">
            Reason (optional)
            <input name="reason" type="text" maxLength={80} placeholder="e.g. Annual leave" />
          </label>
          <div><SubmitButton className="btn btn-primary btn-sm">Add time off</SubmitButton></div>
        </form>
      </section>

      {/* ---- Classes led ---- */}
      <section className="tr-card" aria-labelledby="led-h">
        <h2 id="led-h">Classes they lead</h2>
        <p className="tr-sub">Group classes are blocked out of this coach&rsquo;s 1-to-1 times. To change this, edit the class under Classes.</p>
        {led.length === 0 ? (
          <p className="tr-none">None yet.</p>
        ) : (
          led.map((c) => (
            <div key={c.id} className="tr-row">
              <span className="grow">
                <strong>{c.name}</strong>
                <span className="sub">{daysLabel(c.weekdays)} · {fmtTime(c.starts_at)}–{fmtTime(c.ends_at)}</span>
              </span>
              <Link href={`/admin/classes/${c.id}`} className="btn btn-ghost btn-sm">Open class</Link>
            </div>
          ))
        )}
      </section>
    </>
  );
}
