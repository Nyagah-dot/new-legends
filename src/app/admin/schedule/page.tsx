import Link from "next/link";
import "@/components/admin/schedule.css";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { addDays, fmtDate, fmtTime, nairobiToday } from "@/lib/timetable";
import { PT_COLUMNS, PT_LABEL, hydratePt, type PtBooking } from "@/lib/pt";

type Trainer = { id: string; full_name: string; title: string | null };
type Hours = { trainer_id: string; starts_at: string; ends_at: string };
type Off = { trainer_id: string; starts_at: string | null; ends_at: string | null };
type Sess = { id: string; class_id: string | null; name: string; starts_at: string; ends_at: string; status: string };
type Cls = { id: string; trainer_id: string | null; coach_name: string | null };
type Entry = { start: string; end: string; kind: "group" | "one" | "off"; title: string; meta?: string; cancelled?: boolean };

const isoWeekday = (date: string) => {
  const d = new Date(`${date}T00:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
};

function Row({ e }: { e: Entry }) {
  return (
    <div className={`sch-row${e.cancelled ? " cancelled" : ""}`}>
      <span className="sch-time">{e.kind === "off" && e.start === "00:00:00" ? "All day" : `${fmtTime(e.start)}–${fmtTime(e.end)}`}</span>
      <div>
        <span className={`sch-tag ${e.kind === "one" ? "one" : e.kind === "group" ? "grp" : "off"}`}>{e.kind === "one" ? "1-to-1" : e.kind === "group" ? "Group" : "Off"}</span>
        <strong className="sch-what">{e.title}</strong>
        {e.meta && <span className="sch-meta">{e.meta}</span>}
        {e.cancelled && <span className="sch-meta">Cancelled</span>}
      </div>
    </div>
  );
}

export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  await requireRole(["admin"], "/desk/login?as=admin");
  const sp = await searchParams;
  const today = nairobiToday();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(sp.date ?? "") ? (sp.date as string) : today;
  const supabase = await createClient();

  const [tRes, hRes, oRes, sRes, bRes] = await Promise.all([
    supabase.from("trainers").select("id, full_name, title").eq("is_active", true).order("sort_order").order("full_name"),
    supabase.from("trainer_hours").select("trainer_id, starts_at, ends_at").eq("weekday", isoWeekday(date)).order("starts_at"),
    supabase.from("trainer_time_off").select("trainer_id, starts_at, ends_at").eq("off_date", date),
    supabase.from("class_sessions").select("id, class_id, name, starts_at, ends_at, status").eq("session_date", date).order("starts_at"),
    supabase.from("pt_bookings").select(PT_COLUMNS).eq("session_date", date).in("status", ["awaiting_payment", "payment_claimed", "confirmed", "completed", "no_show"]).order("starts_at"),
  ]);
  const trainers = (tRes.data ?? []) as unknown as Trainer[];
  const hours = (hRes.data ?? []) as unknown as Hours[];
  const offs = (oRes.data ?? []) as unknown as Off[];
  const sessions = (sRes.data ?? []) as unknown as Sess[];
  const bookings = await hydratePt(supabase, (bRes.data ?? []) as unknown as PtBooking[]);

  const classIds = [...new Set(sessions.map((s) => s.class_id).filter((x): x is string => !!x))];
  const { data: cData } = classIds.length ? await supabase.from("classes").select("id, trainer_id, coach_name").in("id", classIds) : { data: [] };
  const classes = new Map(((cData ?? []) as unknown as Cls[]).map((c) => [c.id, c]));

  const byCoach = new Map<string, Entry[]>();
  const push = (id: string, e: Entry) => byCoach.set(id, [...(byCoach.get(id) ?? []), e]);
  const unassigned: Entry[] = [];

  for (const s of sessions) {
    const c = s.class_id ? classes.get(s.class_id) : undefined;
    const e: Entry = { start: s.starts_at, end: s.ends_at, kind: "group", title: s.name, cancelled: s.status === "cancelled" };
    if (c?.trainer_id) push(c.trainer_id, e);
    else unassigned.push({ ...e, meta: c?.coach_name ? `Coach: ${c.coach_name} (not linked to a coach profile)` : "No coach set" });
  }
  for (const b of bookings) {
    push(b.trainer_id, {
      start: b.starts_at, end: b.ends_at, kind: "one",
      title: b.person?.full_name || "Client",
      meta: `${PT_LABEL[b.status]}${b.person?.phone ? ` · ${b.person.phone}` : ""}`,
    });
  }
  for (const o of offs) push(o.trainer_id, { start: o.starts_at ?? "00:00:00", end: o.ends_at ?? "23:59:00", kind: "off", title: "Time off" });
  for (const list of byCoach.values()) list.sort((a, b) => a.start.localeCompare(b.start));

  const groupCount = sessions.filter((s) => s.status !== "cancelled").length;
  const oneCount = bookings.length;
  const hoursByCoach = new Map<string, string[]>();
  for (const h of hours) hoursByCoach.set(h.trainer_id, [...(hoursByCoach.get(h.trainer_id) ?? []), `${fmtTime(h.starts_at)}–${fmtTime(h.ends_at)}`]);

  return (
    <>
      <div className="adm-head">
        <div>
          <h1>Schedule board</h1>
          <p className="lead">Who is coaching what, and when. Group classes and 1-to-1 sessions side by side.</p>
        </div>
      </div>

      <div className="sch-nav">
        <Link href={`/admin/schedule?date=${addDays(date, -1)}`} aria-label="Previous day">&larr; Prev</Link>
        <Link href="/admin/schedule" className={date === today ? "on" : undefined}>Today</Link>
        <Link href={`/admin/schedule?date=${addDays(date, 1)}`} aria-label="Next day">Next &rarr;</Link>
        <form method="get" style={{ display: "flex", gap: 8 }}>
          <input type="date" name="date" defaultValue={date} aria-label="Pick a date" />
          <button type="submit">Go</button>
        </form>
        <Link href="/admin/coach-logins">Coach logins</Link>
      </div>

      <div className="sch-stats">
        <span>{date === today ? "Today, " : ""}{fmtDate(date)}</span>
        <span>{groupCount} group classes</span>
        <span>{oneCount} 1-to-1 sessions</span>
      </div>

      {(tRes.error || sRes.error || bRes.error) && <p className="adm-note err" role="alert">Couldn&rsquo;t load part of the schedule. Please refresh.</p>}

      {trainers.length === 0 ? (
        <p className="sch-card">No coaches yet. Add them under Coaches.</p>
      ) : (
        <div className="sch-grid">
          {trainers.map((t) => {
            const list = byCoach.get(t.id) ?? [];
            const hrs = hoursByCoach.get(t.id);
            return (
              <section key={t.id} className="sch-card">
                <h2>{t.full_name}</h2>
                <span className="sch-sub">{hrs ? `Hours: ${hrs.join(", ")}` : "Not working this day"}</span>
                {list.length === 0 ? <p className="sch-empty">{hrs ? "Free all day" : "Nothing scheduled"}</p> : list.map((e, i) => <Row key={i} e={e} />)}
              </section>
            );
          })}
          {unassigned.length > 0 && (
            <section className="sch-card">
              <h2>Classes without a coach profile</h2>
              <span className="sch-sub">Link these classes to a coach under Classes</span>
              {unassigned.map((e, i) => <Row key={i} e={e} />)}
            </section>
          )}
        </div>
      )}
    </>
  );
}
