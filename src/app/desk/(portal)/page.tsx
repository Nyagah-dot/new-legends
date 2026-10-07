import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import StatusPill from "@/components/desk/StatusPill";
import { voidCheckIn } from "@/app/desk/actions";
import { fmtClock, lfNo, searchMembers, statusMap, type StatusRow } from "@/lib/desk";
import { one, type Rel } from "@/lib/rel";
import { nairobiToday } from "@/lib/timetable";

type CheckInRow = {
  id: string; checked_in_at: string; member_id: string;
  profiles: Rel<{ full_name: string; member_no: number }>;
};

const NOTES: Record<string, { text: string; err?: boolean }> = {
  voided: { text: "Check-in undone." },
  need_reason: { text: "Please give a short reason before undoing a check-in.", err: true },
  error: { text: "Something went wrong. Please try again.", err: true },
};

export default async function DeskPage({ searchParams }: { searchParams: Promise<{ q?: string; done?: string }> }) {
  const me = await requireRole(["staff", "admin"], "/desk/login");
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const supabase = await createClient();
  const today = nairobiToday();

  const results = q ? await searchMembers(supabase, q) : [];
  const statuses = await statusMap(supabase, results.map((r) => r.id));

  const [ciRes, expRes] = await Promise.all([
    supabase
      .from("check_ins")
      .select("id, checked_in_at, member_id, profiles!check_ins_member_id_fkey(full_name, member_no)")
      .eq("checked_in_on", today)
      .is("voided_at", null)
      .order("checked_in_at", { ascending: false }),
    supabase
      .from("member_status")
      .select("member_id, member_no, full_name, plan_name, state, ends_on, days_left, paid_until")
      .eq("state", "active")
      .lte("days_left", 7)
      .order("days_left")
      .limit(8),
  ]);
  const todays = (ciRes.data ?? []) as unknown as CheckInRow[];
  const expiring = (expRes.data ?? []) as unknown as (StatusRow & { member_no: number; full_name: string })[];
  const note = sp.done ? NOTES[sp.done] : undefined;

  return (
    <>
      <h1>Front desk</h1>
      <p className="lead">Signed in as {me.fullName || me.email}. Search a member to check them in.</p>

      <form action="/desk" method="get" className="dk-search" role="search">
        <input name="q" type="search" defaultValue={q} placeholder="Name, phone, email or LF-0042" autoFocus aria-label="Search members" />
        <button type="submit" className="btn btn-primary">Search</button>
      </form>

      {note && <p className="dk-note" role="status" style={note.err ? { borderLeftColor: "var(--red)", color: "var(--red)" } : undefined}>{note.text}</p>}

      {q && (
        <>
          <h2 className="dk-h">Results for &ldquo;{q}&rdquo; ({results.length})</h2>
          <div className="dk-list">
            {results.length === 0 ? (
              <p className="dk-empty">
                No one found. <Link href="/desk/new" style={{ fontWeight: 700 }}>Add them as a walk-in</Link>.
              </p>
            ) : (
              results.map((m) => {
                const st = statuses.get(m.id);
                return (
                  <Link key={m.id} href={`/desk/members/${m.id}`} className="dk-row">
                    <span>
                      <span className="n">{m.full_name || "(no name)"}</span>
                      <span className="s">{lfNo(m.member_no)}{m.phone ? ` · ${m.phone}` : ""}{m.email ? ` · ${m.email}` : ""}</span>
                    </span>
                    <StatusPill state={st?.state} daysLeft={st?.days_left} />
                  </Link>
                );
              })
            )}
          </div>
        </>
      )}

      <h2 className="dk-h">Checked in today ({todays.length})</h2>
      <div className="dk-list">
        {todays.length === 0 ? (
          <p className="dk-empty">No one yet today.</p>
        ) : (
          todays.map((c) => {
            const who = one(c.profiles);
            return (
              <div key={c.id} className="dk-row">
                <Link href={`/desk/members/${c.member_id}`} style={{ color: "inherit", textDecoration: "none" }}>
                  <span className="n">{who?.full_name || "(no name)"}</span>
                  <span className="s">{who ? lfNo(who.member_no) : ""} · {fmtClock(c.checked_in_at)}</span>
                </Link>
                <form action={voidCheckIn} className="dk-undo">
                  <input type="hidden" name="check_in_id" value={c.id} />
                  <input type="text" name="reason" placeholder="Reason to undo" required minLength={3} aria-label="Reason to undo" />
                  <button type="submit" className="btn btn-ghost" style={{ padding: "6px 10px", fontSize: ".66rem" }}>Undo</button>
                </form>
              </div>
            );
          })
        )}
      </div>

      <h2 className="dk-h">Expiring within 7 days</h2>
      <div className="dk-list">
        {expiring.length === 0 ? (
          <p className="dk-empty">No one is about to expire.</p>
        ) : (
          expiring.map((m) => (
            <Link key={m.member_id} href={`/desk/members/${m.member_id}`} className="dk-row">
              <span>
                <span className="n">{m.full_name}</span>
                <span className="s">{lfNo(m.member_no)} · {m.plan_name} · ends {m.ends_on}</span>
              </span>
              <StatusPill state={m.state} daysLeft={m.days_left} />
            </Link>
          ))
        )}
      </div>
    </>
  );
}
