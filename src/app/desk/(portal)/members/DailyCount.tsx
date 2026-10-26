import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { addDays, nairobiToday } from "@/lib/timetable";
import { fmtLong } from "@/lib/orders";
import { fmtClock, lfNo } from "@/lib/desk";

const DAYS = 30;
const PAGE = 1000;
type CheckIn = { id: string; member_id: string; checked_in_at: string; checked_in_on: string };
type Person = { id: string; full_name: string; member_no: number };
const nairobiDay = (ts: string) => new Date(ts).toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" });

/** Daily check-in count: how many people came in each of the last 30 days, and who came on the chosen day. */
export default async function DailyCount({ day }: { day?: string }) {
  const supabase = await createClient();
  const today = nairobiToday();
  const start = addDays(today, -(DAYS - 1));
  const chosen = day && /^\d{4}-\d{2}-\d{2}$/.test(day) && day >= start && day <= today ? day : today;

  // Member check-ins (undone ones don't count). Read in pages because the database returns at most 1000 rows at once.
  const checkIns: CheckIn[] = [];
  for (let from = 0; from < 10 * PAGE; from += PAGE) {
    const { data } = await supabase
      .from("check_ins")
      .select("id, member_id, checked_in_at, checked_in_on")
      .is("voided_at", null)
      .gte("checked_in_on", start)
      .order("checked_in_at", { ascending: false })
      .range(from, from + PAGE - 1);
    const rows = (data ?? []) as unknown as CheckIn[];
    checkIns.push(...rows);
    if (rows.length < PAGE) break;
  }

  // Visitors who booked a single class and were checked in.
  const { data: vdata } = await supabase
    .from("visitor_bookings")
    .select("id, attended_at")
    .eq("status", "attended")
    .gte("attended_at", `${start}T00:00:00+03:00`)
    .limit(PAGE);
  const visitors = ((vdata ?? []) as unknown as { id: string; attended_at: string | null }[]).filter((v) => v.attended_at);

  const members = new Map<string, number>();
  const guests = new Map<string, number>();
  for (const c of checkIns) members.set(c.checked_in_on, (members.get(c.checked_in_on) ?? 0) + 1);
  for (const v of visitors) {
    const d = nairobiDay(v.attended_at as string);
    guests.set(d, (guests.get(d) ?? 0) + 1);
  }

  const days = Array.from({ length: DAYS }, (_, i) => addDays(today, -i));
  const total = (d: string) => (members.get(d) ?? 0) + (guests.get(d) ?? 0);
  const week = days.slice(0, 7).reduce((n, d) => n + total(d), 0);
  const busiest = days.reduce((best, d) => (total(d) > total(best) ? d : best), days[0]);

  // Names for the chosen day.
  const dayRows = checkIns.filter((c) => c.checked_in_on === chosen);
  const ids = [...new Set(dayRows.map((c) => c.member_id))];
  const people = new Map<string, Person>();
  for (let i = 0; i < ids.length; i += 100) {
    const { data } = await supabase.from("profiles").select("id, full_name, member_no").in("id", ids.slice(i, i + 100));
    for (const p of (data ?? []) as unknown as Person[]) people.set(p.id, p);
  }

  return (
    <>
      <dl className="dk-stats" style={{ marginBottom: 18 }}>
        <div><dt>Today</dt><dd>{total(today)}</dd></div>
        <div><dt>Last 7 days</dt><dd>{week}</dd></div>
        <div><dt>Busiest of 30 days</dt><dd>{total(busiest)}{total(busiest) > 0 ? ` (${fmtLong(busiest)})` : ""}</dd></div>
      </dl>

      <div className="dk-scroll">
        <table className="dk-table">
          <thead><tr><th>Day</th><th>Members</th><th>Single-class visitors</th><th>Total</th></tr></thead>
          <tbody>
            {days.map((d) => (
              <tr key={d} style={d === chosen ? { background: "var(--paper)" } : undefined}>
                <td><Link href={`/desk/members?filter=daily&day=${d}`} style={{ fontWeight: 800, color: "inherit" }}>{fmtLong(d)}{d === today ? " (today)" : ""}</Link></td>
                <td>{members.get(d) ?? 0}</td>
                <td>{guests.get(d) ?? 0}</td>
                <td><strong>{total(d)}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="dk-h">Who came in on {fmtLong(chosen)}</h2>
      {dayRows.length === 0 ? (
        <p className="portal-card">No member check-ins on this day.</p>
      ) : (
        <div className="dk-list">
          {dayRows.map((c) => {
            const p = people.get(c.member_id);
            return (
              <div key={c.id} className="dk-row">
                <span>
                  {p ? <Link href={`/desk/members/${p.id}`} style={{ fontWeight: 800, color: "inherit" }}>{p.full_name || "(no name)"}</Link> : "Member"}
                  {p ? <span className="s"> {lfNo(p.member_no)}</span> : null}
                </span>
                <span className="s">{fmtClock(c.checked_in_at)}</span>
              </div>
            );
          })}
        </div>
      )}
      {checkIns.length >= 10 * PAGE && <p style={{ marginTop: 12, fontSize: ".85rem", color: "var(--steel)" }}>Very busy month: counts may be slightly low.</p>}
    </>
  );
}
