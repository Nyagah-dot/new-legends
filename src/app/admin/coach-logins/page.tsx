import "@/components/admin/schedule.css";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { linkCoachLogin } from "./actions";

const NOTES: Record<string, { text: string; err?: boolean }> = {
  linked: { text: "Linked. The coach can now open their schedule at /coach after signing in." },
  unlinked: { text: "Login removed." },
  bad_email: { text: "Enter a valid email address.", err: true },
  error: { text: "Something went wrong.", err: true },
};

export default async function CoachLoginsPage({ searchParams }: { searchParams: Promise<{ done?: string; msg?: string }> }) {
  await requireRole(["admin"], "/desk/login?as=admin");
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: tData } = await supabase.from("trainers").select("id, full_name, profile_id, is_active").order("sort_order").order("full_name");
  const trainers = (tData ?? []) as unknown as { id: string; full_name: string; profile_id: string | null; is_active: boolean }[];
  const pIds = trainers.map((t) => t.profile_id).filter((x): x is string => !!x);
  const { data: pData } = pIds.length ? await supabase.from("profiles").select("id, full_name, email").in("id", pIds) : { data: [] };
  const people = new Map(((pData ?? []) as unknown as { id: string; full_name: string; email: string | null }[]).map((p) => [p.id, p]));
  const note = sp.done ? NOTES[sp.done] : undefined;

  return (
    <>
      <div className="adm-head">
        <div>
          <h1>Coach logins</h1>
          <p className="lead">Link a coach to their account so they can see their own schedule on their phone. The coach signs up on the site first, then you enter the same email here.</p>
        </div>
      </div>
      {note && <p className={`adm-note${note.err ? " err" : ""}`} role="status">{note.text}{sp.msg ? ` ${sp.msg}` : ""}</p>}
      <div className="sch-card">
        {trainers.length === 0 && <p className="sch-empty">No coaches yet.</p>}
        {trainers.map((t) => {
          const p = t.profile_id ? people.get(t.profile_id) : null;
          return (
            <div key={t.id} className="cl-row">
              <div>
                <strong>{t.full_name}</strong>{!t.is_active && " (hidden)"}
                <span className="sch-sub">{p ? `Linked to ${p.full_name || "account"} · ${p.email ?? ""}` : "Not linked yet"}</span>
              </div>
              <form action={linkCoachLogin}>
                <input type="hidden" name="id" value={t.id} />
                <input type="email" name="email" placeholder="Coach's account email" defaultValue={p?.email ?? ""} aria-label={`Account email for ${t.full_name}`} />
                <button type="submit" className="btn btn-primary btn-sm">{p ? "Change" : "Link"}</button>
              </form>
              {p && (
                <form action={linkCoachLogin}>
                  <input type="hidden" name="id" value={t.id} />
                  <input type="hidden" name="unlink" value="1" />
                  <button type="submit" className="btn btn-ghost btn-sm">Remove login</button>
                </form>
              )}
            </div>
          );
        })}
      </div>
      <p className="rv-note" style={{ marginTop: 14 }}>Coaches open <strong>/coach</strong> on the site after signing in. Their account stays a normal member account and sees nothing else new.</p>
    </>
  );
}
