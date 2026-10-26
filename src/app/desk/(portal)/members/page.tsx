import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import StatusPill from "@/components/desk/StatusPill";
import { cleanQuery, lfNo, type MemberRow, type StatusRow } from "@/lib/desk";
import { fmtLong } from "@/lib/orders";
import DailyCount from "./DailyCount";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "expiring", label: "Expiring (7 days)" },
  { key: "frozen", label: "Frozen" },
  { key: "expired", label: "Expired" },
  { key: "none", label: "No membership" },
] as const;

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ filter?: string; q?: string; day?: string }> }) {
  await requireRole(["staff", "admin"], "/desk/login");
  const sp = await searchParams;
  const daily = sp.filter === "daily";
  const filter = FILTERS.some((f) => f.key === sp.filter) ? (sp.filter as (typeof FILTERS)[number]["key"]) : "all";
  const q = cleanQuery(sp.q ?? "").toLowerCase();

  const supabase = await createClient();
  const [pRes, sRes] = await Promise.all([
    supabase.from("profiles").select("id, member_no, full_name, email, phone, role").order("full_name").limit(500),
    supabase.from("member_status").select("member_id, plan_name, state, ends_on, days_left, paid_until").limit(2000),
  ]);
  const people = (pRes.data ?? []) as unknown as MemberRow[];
  const status = new Map<string, StatusRow>();
  for (const s of (sRes.data ?? []) as unknown as StatusRow[]) status.set(s.member_id, s);

  const matches = (m: MemberRow) =>
    !q ||
    m.full_name.toLowerCase().includes(q) ||
    (m.email ?? "").toLowerCase().includes(q) ||
    (m.phone ?? "").replace(/\s/g, "").includes(q.replace(/\s/g, "")) ||
    lfNo(m.member_no).toLowerCase().includes(q);

  const inFilter = (m: MemberRow, key: string) => {
    const s = status.get(m.id);
    switch (key) {
      case "active": return s?.state === "active";
      case "expiring": return s?.state === "active" && s.days_left <= 7;
      case "frozen": return s?.state === "frozen";
      case "expired": return s?.state === "expired";
      case "none": return !s;
      default: return true;
    }
  };

  const searched = people.filter(matches);
  const counts = Object.fromEntries(FILTERS.map((f) => [f.key, searched.filter((m) => inFilter(m, f.key)).length]));
  let rows = searched.filter((m) => inFilter(m, filter));
  if (filter === "expiring") rows = rows.sort((a, b) => (status.get(a.id)?.days_left ?? 0) - (status.get(b.id)?.days_left ?? 0));

  const href = (key: string) => `/desk/members?filter=${key}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <>
      <h1>Members</h1>
      {!daily && (
      <form action="/desk/members" method="get" className="dk-search" role="search">
        <input type="hidden" name="filter" value={filter} />
        <input name="q" type="search" defaultValue={q} placeholder="Filter by name, phone, email or LF-0042" aria-label="Filter members" />
        <button type="submit" className="btn btn-primary">Filter</button>
      </form>
      )}

      <div className="dk-filters">
        {FILTERS.map((f) => (
          <Link key={f.key} href={href(f.key)} className={!daily && filter === f.key ? "on" : undefined}>
            {f.label} ({counts[f.key]})
          </Link>
        ))}
        <Link href="/desk/members?filter=daily" className={daily ? "on" : undefined}>Daily check-ins</Link>
      </div>

      {daily ? (
        <DailyCount day={sp.day} />
      ) : rows.length === 0 ? (
        <p className="portal-card">No one matches.</p>
      ) : (
        <div className="dk-scroll">
          <table className="dk-table">
            <thead>
              <tr><th>Member</th><th>Contact</th><th>Plan</th><th>Status</th><th>Paid until</th></tr>
            </thead>
            <tbody>
              {rows.map((m) => {
                const s = status.get(m.id);
                return (
                  <tr key={m.id}>
                    <td>
                      <Link href={`/desk/members/${m.id}`} style={{ fontWeight: 800, color: "inherit" }}>{m.full_name || "(no name)"}</Link>
                      <div style={{ fontSize: ".78rem", color: "var(--steel)" }}>{lfNo(m.member_no)}{m.role !== "member" ? ` · ${m.role}` : ""}</div>
                    </td>
                    <td>{m.phone ?? "—"}<div style={{ fontSize: ".78rem", color: "var(--steel)" }}>{m.email ?? ""}</div></td>
                    <td>{s?.plan_name ?? "—"}</td>
                    <td><StatusPill state={s?.state} daysLeft={s?.days_left} /></td>
                    <td>{s?.paid_until ? fmtLong(s.paid_until) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {!daily && people.length >= 500 && <p style={{ marginTop: 12, fontSize: ".85rem", color: "var(--steel)" }}>Showing the first 500 people. Use the search above to narrow down.</p>}
    </>
  );
}
