import "@/components/admin/settings.css";
import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { changeRole } from "./actions";
import { cleanQuery, lfNo } from "@/lib/desk";

type Person = {
  id: string; member_no: number; full_name: string; email: string | null; phone: string | null; role: string; auth_user_id: string | null;
};
const COLS = "id, member_no, full_name, email, phone, role, auth_user_id";

function Row({ p, meId, q }: { p: Person; meId: string; q: string }) {
  const isMe = p.id === meId;
  return (
    <div className="dk-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "14px 18px", borderBottom: "1px solid rgba(20,20,20,.15)" }}>
      <span>
        <strong>{p.full_name || "(no name)"}</strong> <span className={`adm-tag${p.role === "admin" ? " red" : p.role === "staff" ? " dark" : ""}`}>{p.role}</span>
        {!p.auth_user_id && <span className="adm-tag">No login yet</span>}
        <span style={{ display: "block", fontSize: ".82rem", color: "var(--steel)" }}>
          {lfNo(p.member_no)}{p.email ? ` · ${p.email}` : ""}{p.phone ? ` · ${p.phone}` : ""}
        </span>
      </span>
      {isMe ? (
        <span style={{ fontSize: ".85rem", color: "var(--steel)" }}>This is you</span>
      ) : (
        <form action={changeRole} className="st-role">
          <input type="hidden" name="id" value={p.id} />
          <input type="hidden" name="q" value={q} />
          <select name="role" defaultValue={p.role} aria-label={`Role for ${p.full_name}`}>
            <option value="member">Member</option>
            <option value="staff">Front desk</option>
            <option value="admin">Admin</option>
          </select>
          <button type="submit" className="btn btn-ghost btn-sm">Save</button>
        </form>
      )}
    </div>
  );
}

export default async function PeoplePage({ searchParams }: { searchParams: Promise<{ q?: string; done?: string; msg?: string }> }) {
  const me = await requireRole(["admin"], "/desk/login?as=admin");
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const term = cleanQuery(q);
  const supabase = await createClient();

  const [teamRes, foundRes] = await Promise.all([
    supabase.from("profiles").select(COLS).in("role", ["staff", "admin"]).order("full_name"),
    term
      ? supabase.from("profiles").select(COLS)
          .or([`full_name.ilike.%${term}%`, `email.ilike.%${term}%`, `phone.ilike.%${term}%`].join(","))
          .order("full_name").limit(25)
      : Promise.resolve({ data: [] as unknown[], error: null }),
  ]);
  const team = (teamRes.data ?? []) as unknown as Person[];
  const found = ((foundRes.data ?? []) as unknown as Person[]).filter((p) => p.role === "member");

  return (
    <>
      <div className="adm-head">
        <div>
          <h1>People and roles</h1>
          <p className="lead">Make someone front desk staff or an admin. They must have created an account (or signed in with Google) first.</p>
        </div>
      </div>

      {sp.done === "role_changed" && <p className="adm-note" role="status">Role changed. It applies the next time they open a page.</p>}
      {sp.done === "error" && <p className="adm-note err" role="alert">{sp.msg || "Something went wrong."}</p>}
      {teamRes.error && <p className="adm-note err" role="alert">Couldn&rsquo;t load people: {teamRes.error.message}</p>}

      <h2 className="pay-h" style={{ marginTop: 0 }}>Staff and admins ({team.length})</h2>
      <div className="dk-list" style={{ border: "2px solid var(--ink)", background: "var(--white)" }}>
        {team.length === 0 ? <p style={{ padding: 18 }}>None.</p> : team.map((p) => <Row key={p.id} p={p} meId={me.id} q={q} />)}
      </div>
      <p style={{ fontSize: ".85rem", color: "var(--steel)", marginTop: 8 }}>
        A front desk person can check people in, sell memberships, add walk-ins and handle freezes. Only admins accept online payments, edit classes and prices, and change roles.
      </p>

      <h2 className="pay-h">Find a member to promote</h2>
      <form action="/admin/people" method="get" className="st-search" role="search">
        <input name="q" type="search" defaultValue={q} placeholder="Name, email or phone" aria-label="Search members" />
        <button type="submit" className="btn btn-primary">Search</button>
      </form>
      {q && (
        <div className="dk-list" style={{ border: "2px solid var(--ink)", background: "var(--white)" }}>
          {found.length === 0 ? (
            <p style={{ padding: 18 }}>No members found for &ldquo;{q}&rdquo;. They may already be staff (see above), or they haven&rsquo;t signed up yet. <Link href="/desk/members" style={{ fontWeight: 700 }}>Browse members</Link></p>
          ) : (
            found.map((p) => <Row key={p.id} p={p} meId={me.id} q={q} />)
          )}
        </div>
      )}
    </>
  );
}
