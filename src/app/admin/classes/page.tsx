import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import DeleteClassButton from "@/components/admin/DeleteClassButton";
import { daysLabel, fmtTime, type ClassRow } from "@/lib/timetable";

const NOTES: Record<string, { text: string; err?: boolean }> = {
  saved: { text: "Saved. The public timetable is updated." },
  deleted: { text: "Class deleted." },
  error: { text: "Something went wrong. Please try again.", err: true },
};

export default async function ClassesPage({ searchParams }: { searchParams: Promise<{ done?: string }> }) {
  await requireRole(["admin"], "/desk/login?as=admin");
  const { done } = await searchParams;

  const supabase = await createClient();
  const { data, error } = await supabase.from("classes").select("*").order("starts_at").order("name");
  const classes = (data ?? []) as ClassRow[];
  const note = done ? NOTES[done] : undefined;

  return (
    <>
      <div className="adm-head">
        <div>
          <h1>Classes</h1>
          <p className="lead">The weekly pattern. Saving rebuilds the upcoming dates and updates the website.</p>
        </div>
        <Link href="/admin/classes/new" className="btn btn-primary">Add class <span className="arrow">&rarr;</span></Link>
      </div>

      {note && <p className={`adm-note${note.err ? " err" : ""}`} role="status">{note.text}</p>}
      {error && <p className="adm-note err" role="alert">Couldn&rsquo;t load classes: {error.message}</p>}

      {classes.length === 0 && !error ? (
        <p className="portal-card">No classes yet. Add your first one.</p>
      ) : (
        <div className="adm-scroll">
          <table className="adm-table">
            <thead>
              <tr><th>Class</th><th>Days</th><th>Time</th><th>Spaces</th><th>Notes</th><th></th></tr>
            </thead>
            <tbody>
              {classes.map((c) => (
                <tr key={c.id} className={c.is_active ? undefined : "off"}>
                  <td>
                    <strong>{c.name}</strong>
                    {c.coach_name && <span className="sub">{c.coach_name}</span>}
                  </td>
                  <td>{daysLabel(c.weekdays)}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{fmtTime(c.starts_at)}–{fmtTime(c.ends_at)}</td>
                  <td>{c.capacity ?? "No limit"}</td>
                  <td>
                    {c.ladies_only && <span className="adm-tag red">Ladies</span>}
                    {!c.bookable && <span className="adm-tag">Turn up</span>}
                    {!c.is_active && <span className="adm-tag dark">Hidden</span>}
                  </td>
                  <td>
                    <div className="adm-actions">
                      <Link href={`/admin/classes/${c.id}`} className="btn btn-ghost btn-sm">Edit</Link>
                      <DeleteClassButton id={c.id} name={c.name} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
