import "@/components/admin/settings.css";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { statusMap } from "@/lib/desk";
import { fmtLong } from "@/lib/orders";
import { sendRemindersNow } from "./actions";
import { audienceFilter, FILTERS, type AudienceRow } from "./audience";
import type { DueReminder } from "@/lib/reminders";

export default async function EmailsPage({ searchParams }: { searchParams: Promise<{ done?: string; msg?: string; n?: string; f?: string; filter?: string }> }) {
  await requireRole(["admin"], "/desk/login?as=admin");
  const sp = await searchParams;
  const filter = FILTERS.some((x) => x.value === sp.filter) ? (sp.filter as string) : "all";
  const supabase = await createClient();

  const [dueRes, audRes] = await Promise.all([
    supabase.rpc("due_expiry_reminders"),
    supabase.from("marketing_audience").select("email, profile_id, full_name, source, consented_at").order("email"),
  ]);
  const due = ((dueRes.data ?? []) as unknown as DueReminder[]);
  const waiting = due.filter((d) => !d.already_sent);
  const sentAlready = due.length - waiting.length;

  const all = (audRes.data ?? []) as unknown as AudienceRow[];
  const st = await statusMap(supabase, all.map((r) => r.profile_id).filter((x): x is string => Boolean(x)));
  const list = audienceFilter(all, st, filter);

  return (
    <>
      <div className="adm-head">
        <div>
          <h1>Emails</h1>
          <p className="lead">Expiry reminders to members, and the list of people who agreed to hear from you.</p>
        </div>
      </div>

      {sp.done === "sent" && (
        <p className="adm-note" role="status">
          Sent {sp.n ?? 0} reminder{sp.n === "1" ? "" : "s"}.{Number(sp.f) > 0 ? ` ${sp.f} could not be sent and will be tried again.` : ""}
        </p>
      )}
      {sp.done === "error" && <p className="adm-note err" role="alert">{sp.msg || "Something went wrong."}</p>}
      {(dueRes.error || audRes.error) && <p className="adm-note err" role="alert">Couldn&rsquo;t load everything: {(dueRes.error ?? audRes.error)?.message}</p>}

      <section className="st-card">
        <h2>Expiry reminders</h2>
        <p className="sub">
          Members get one email 7 days before and one 1 day before their membership ends. Nobody is emailed twice, and
          people who already renewed are skipped. The daily job sends these by itself; you can also send them now.
        </p>
        {due.length === 0 ? (
          <p>Nobody is 7 or 1 days from the end of their membership today.</p>
        ) : (
          <div className="dk-scroll">
            <table className="dk-table">
              <thead><tr><th>Member</th><th>Plan</th><th>Ends</th><th>Reminder</th><th>Status</th></tr></thead>
              <tbody>
                {due.map((d) => (
                  <tr key={`${d.membership_id}-${d.kind}`}>
                    <td>{d.full_name || d.email}<span style={{ display: "block", fontSize: ".8rem", color: "var(--steel)" }}>{d.email}</span></td>
                    <td>{d.plan_name}</td>
                    <td>{fmtLong(d.ends_on)}</td>
                    <td>{d.kind === "7d" ? "7 days before" : "1 day before"}</td>
                    <td>{d.already_sent ? "Sent" : "Waiting"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <form action={sendRemindersNow} style={{ marginTop: 14 }}>
          <button type="submit" className="btn btn-sm" disabled={waiting.length === 0}>
            {waiting.length === 0 ? "Nothing to send" : `Send ${waiting.length} reminder${waiting.length === 1 ? "" : "s"} now`}
          </button>
          {sentAlready > 0 && <span style={{ marginLeft: 12, fontSize: ".85rem", color: "var(--steel)" }}>{sentAlready} already sent</span>}
        </form>
      </section>

      <section className="st-card">
        <h2>Marketing list</h2>
        <p className="sub">
          Only people who ticked the box to receive offers are here, and anyone who later switched it off is removed.
          Use this list for offers and news, never for anyone else.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {FILTERS.map((x) => (
            <a key={x.value} href={`/admin/emails?filter=${x.value}`} className={`btn btn-sm${filter === x.value ? "" : " btn-ghost"}`}>{x.label}</a>
          ))}
        </div>
        <p style={{ marginBottom: 12 }}><strong>{list.length}</strong> {list.length === 1 ? "person" : "people"}
          {list.length > 0 && <> · <a href={`/admin/emails/export?filter=${filter}`}>Download as a spreadsheet (CSV)</a></>}
        </p>
        {list.length > 0 && (
          <div className="dk-scroll">
            <table className="dk-table">
              <thead><tr><th>Email</th><th>Name</th><th>Membership</th><th>Agreed on</th></tr></thead>
              <tbody>
                {list.slice(0, 200).map((r) => (
                  <tr key={r.email}>
                    <td>{r.email}</td><td>{r.full_name || "—"}</td><td>{r.label}</td><td>{fmtLong(r.consented_at.slice(0, 10))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {list.length > 200 && <p style={{ fontSize: ".85rem", color: "var(--steel)", marginTop: 8 }}>Showing the first 200. The download has everyone.</p>}
      </section>
    </>
  );
}
