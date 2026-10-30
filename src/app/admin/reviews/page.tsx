import "@/components/admin/schedule.css";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { fmtDate } from "@/lib/timetable";

type Summary = {
  trainer_id: string; full_name: string; review_count: number; avg_rating: number | null; fair_score: number | null;
  count_30d: number; avg_30d: number | null; r1: number; r2: number; r3: number; r4: number; r5: number;
};
type Weekly = { trainer_id: string; week_start: string; review_count: number; avg_rating: number };
type Recent = { trainer_id: string; coach_name: string; client_name: string; rating: number; comment: string | null; session_date: string; created_at: string };

const stars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);
const fmt = (n: number | null) => (n === null ? "—" : Number(n).toFixed(1));

export default async function ReviewsPage() {
  await requireRole(["admin"], "/desk/login?as=admin");
  const supabase = await createClient();
  const [sRes, wRes, rRes] = await Promise.all([
    supabase.rpc("admin_review_summary"),
    supabase.rpc("admin_review_weekly", { p_weeks: 8 }),
    supabase.rpc("admin_recent_reviews", { p_limit: 30 }),
  ]);
  const summary = (sRes.data ?? []) as unknown as Summary[];
  const weekly = (wRes.data ?? []) as unknown as Weekly[];
  const recent = (rRes.data ?? []) as unknown as Recent[];

  // The last 8 Monday dates, oldest first, so each coach's trend bars line up.
  const now = new Date();
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(d.getUTCDate() - 7 * (7 - i));
    return d.toISOString().slice(0, 10);
  });

  return (
    <>
      <div className="adm-head">
        <div>
          <h1>Coach reviews</h1>
          <p className="lead">Clients rate each finished 1-to-1 session from 1 to 5 stars. Only admin sees this page.</p>
        </div>
      </div>
      <p className="rv-note">
        <strong>How to read it.</strong> &ldquo;Score&rdquo; is a fair average: a coach with very few reviews is pulled toward the gym&rsquo;s overall average, so one lucky 5 stars can&rsquo;t beat 40 reviews averaging 4.8. It becomes the plain average as reviews grow. The small bars show the average for each of the last 8 weeks.
      </p>
      {(sRes.error || wRes.error || rRes.error) && <p className="adm-note err" role="alert">Couldn&rsquo;t load reviews. Did you run the patch 27 SQL?</p>}

      {summary.length === 0 ? (
        <p className="sch-card">No coaches yet.</p>
      ) : (
        <div className="rv-grid">
          {summary.map((s) => {
            const max = Math.max(1, s.r1, s.r2, s.r3, s.r4, s.r5);
            const dist: [number, number][] = [[5, s.r5], [4, s.r4], [3, s.r3], [2, s.r2], [1, s.r1]];
            const wk = new Map(weekly.filter((w) => w.trainer_id === s.trainer_id).map((w) => [w.week_start, w]));
            const mine = recent.filter((r) => r.trainer_id === s.trainer_id && r.comment).slice(0, 5);
            return (
              <section key={s.trainer_id} className="sch-card">
                <div className="rv-top">
                  <div>
                    <h2>{s.full_name}</h2>
                    <span className="sch-sub">
                      {s.review_count} review{s.review_count === 1 ? "" : "s"}{s.review_count > 0 && s.review_count < 5 ? " · too few to judge yet" : ""}
                    </span>
                  </div>
                  <div className="rv-score">{fmt(s.fair_score)}<small> / 5 score</small></div>
                </div>

                {s.review_count === 0 ? (
                  <p className="sch-empty">No reviews yet.</p>
                ) : (
                  <>
                    <p className="sch-sub" style={{ margin: "4px 0" }}>
                      Plain average {fmt(s.avg_rating)} · last 30 days {fmt(s.avg_30d)} ({s.count_30d})
                    </p>
                    <div className="rv-bars">
                      {dist.map(([n, c]) => (
                        <div key={n} className="rv-bar">
                          <span>{n}★</span>
                          <i><b style={{ width: `${(c / max) * 100}%` }} /></i>
                          <span>{c}</span>
                        </div>
                      ))}
                    </div>
                    <span className="sch-sub" style={{ marginBottom: 0 }}>Weekly average, last 8 weeks</span>
                    <div className="rv-trend" role="img" aria-label="Weekly average rating for the last 8 weeks">
                      {weeks.map((w) => {
                        const x = wk.get(w);
                        return <span key={w} className={x ? undefined : "none"} style={{ height: x ? `${(x.avg_rating / 5) * 100}%` : "3px" }} title={x ? `Week of ${w}: ${x.avg_rating} (${x.review_count})` : `Week of ${w}: no reviews`} />;
                      })}
                    </div>
                    {mine.length > 0 && (
                      <details style={{ marginTop: 12 }}>
                        <summary style={{ cursor: "pointer", fontWeight: 700, minHeight: 44, display: "flex", alignItems: "center" }}>Latest comments ({mine.length})</summary>
                        {mine.map((r, i) => (
                          <div key={i} className="rv-cmt">
                            {stars(r.rating)} {r.comment}
                            <em>{r.client_name} · session {fmtDate(r.session_date)}</em>
                          </div>
                        ))}
                      </details>
                    )}
                  </>
                )}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
