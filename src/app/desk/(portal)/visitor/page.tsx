import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { checkInVisitor, undoVisitorCheckIn } from "@/app/desk/visitor-actions";
import { fmtClock, lfNo } from "@/lib/desk";
import { addDays, fmtDate, fmtTime, nairobiToday } from "@/lib/timetable";
import { BOOKING_COLUMNS, bookingNo, hydrate, type VisitorBooking, type VisitorRow } from "@/lib/visitors";

const DONE: Record<string, string> = {
  checked_in: "Visitor checked in.",
  undone: "Check-in undone.",
};

export default async function DeskVisitorsPage({ searchParams }: { searchParams: Promise<{ done?: string; msg?: string }> }) {
  await requireRole(["staff", "admin"], "/desk/login");
  const sp = await searchParams;
  const supabase = await createClient();
  const today = nairobiToday();

  const [liveRes, waitRes] = await Promise.all([
    supabase.from("visitor_bookings").select(BOOKING_COLUMNS).in("status", ["confirmed", "attended"]).order("created_at"),
    supabase.from("visitor_bookings").select("id", { count: "exact", head: true }).in("status", ["awaiting_payment", "payment_claimed"]),
  ]);
  const all = await hydrate(supabase, (liveRes.data ?? []) as unknown as VisitorBooking[]);

  // Group by class, today first, then the next 7 days.
  const horizon = addDays(today, 7);
  const rows = all.filter((r) => r.session && r.session.session_date >= today && r.session.session_date <= horizon);
  const byClass = new Map<string, VisitorRow[]>();
  for (const r of rows) byClass.set(r.session_id, [...(byClass.get(r.session_id) ?? []), r]);
  const groups = [...byClass.values()].sort((a, b) =>
    (a[0].session!.session_date + a[0].session!.starts_at).localeCompare(b[0].session!.session_date + b[0].session!.starts_at));

  const todayGroups = groups.filter((g) => g[0].session!.session_date === today);
  const laterGroups = groups.filter((g) => g[0].session!.session_date > today);
  const waiting = waitRes.count ?? 0;

  const Group = ({ list, canCheckIn }: { list: VisitorRow[]; canCheckIn: boolean }) => {
    const s = list[0].session!;
    return (
      <section className="dk-card">
        <h2 style={{ marginBottom: 4 }}>
          {s.name}{s.ladies_only ? " · Ladies only" : ""}
          <span style={{ fontWeight: 500, color: "var(--steel)" }}> · {fmtDate(s.session_date)} {fmtTime(s.starts_at)}–{fmtTime(s.ends_at)}</span>
        </h2>
        {s.status === "cancelled" && <p className="dk-note" style={{ borderLeftColor: "var(--red)", color: "var(--red)" }}>This class was cancelled. Tell these visitors; an admin handles refunds.</p>}
        <div className="dk-list">
          {list.map((r) => (
            <div key={r.id} className="dk-row">
              <span>
                <span className="n">{r.person?.full_name || "(no name)"}</span>
                <span className="s">
                  {r.person ? lfNo(r.person.member_no) : ""}{r.person?.phone ? ` · ${r.person.phone}` : ""} · {bookingNo(r.booking_no)}
                </span>
              </span>
              {r.status === "attended" ? (
                <span className="dk-undo">
                  <span className="pill pill-ok">In{r.attended_at ? ` · ${fmtClock(r.attended_at)}` : ""}</span>
                  {canCheckIn && (
                    <form action={undoVisitorCheckIn}>
                      <input type="hidden" name="id" value={r.id} />
                      <button type="submit" className="btn btn-ghost" style={{ padding: "6px 10px", fontSize: ".66rem" }}>Undo</button>
                    </form>
                  )}
                </span>
              ) : canCheckIn && s.status === "scheduled" ? (
                <form action={checkInVisitor}>
                  <input type="hidden" name="id" value={r.id} />
                  <button type="submit" className="btn btn-primary">Check in</button>
                </form>
              ) : (
                <span className="pill pill-warn">Paid · not today</span>
              )}
            </div>
          ))}
        </div>
      </section>
    );
  };

  return (
    <>
      <div className="dk-head">
        <h1>Visitors</h1>
        <p className="meta">People who booked and paid for a single class. Check them in when they arrive.</p>
        {waiting > 0 && <p className="meta">{waiting} booking{waiting === 1 ? "" : "s"} still waiting for payment to be accepted by the admin. Those visitors can&rsquo;t be checked in yet.</p>}
      </div>

      {sp.done && DONE[sp.done] && <p className="dk-note">{DONE[sp.done]}</p>}
      {sp.done === "error" && <p className="dk-note" role="alert" style={{ borderLeftColor: "var(--red)", color: "var(--red)" }}>{sp.msg || "Something went wrong. Please try again."}</p>}

      <h2 className="dk-h">Today</h2>
      {todayGroups.length === 0 ? <p className="dk-empty portal-card">No visitors booked for today.</p> : todayGroups.map((g) => <Group key={g[0].session_id} list={g} canCheckIn />)}

      <h2 className="dk-h">Coming up (next 7 days)</h2>
      {laterGroups.length === 0 ? <p className="dk-empty portal-card">None yet.</p> : laterGroups.map((g) => <Group key={g[0].session_id} list={g} canCheckIn={false} />)}
    </>
  );
}
