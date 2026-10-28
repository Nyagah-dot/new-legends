import type { Metadata } from "next";
import Link from "next/link";
import BookShell from "@/components/book/BookShell";
import SubmitButton from "@/components/auth/SubmitButton";
import { startVisitorBooking } from "@/app/book/actions";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getCurrentProfile } from "@/lib/auth/session";
import { addDays, fmtDate, fmtTime, nairobiToday } from "@/lib/timetable";
import { kes } from "@/lib/orders";
import { VISITOR_HORIZON_DAYS, nairobiNowTime } from "@/lib/visitors";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Try a class — THE LEGENDS FITNESS" };

type S = {
  id: string; session_date: string; name: string; coach_name: string | null; starts_at: string; ends_at: string; ladies_only: boolean;
};
type Avail = { session_id: string; spots: number; taken: number };

export default async function BookPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  const pub = createPublicClient();
  if (!hasSupabaseEnv || !pub) {
    return <BookShell><h1>Try a class</h1><p className="bk-note err">Booking isn&rsquo;t set up yet.</p></BookShell>;
  }

  const today = nairobiToday();
  const nowTime = nairobiNowTime();
  const [sRes, planRes] = await Promise.all([
    pub.from("class_sessions")
      .select("id, session_date, name, coach_name, starts_at, ends_at, ladies_only")
      .eq("status", "scheduled").eq("bookable", true)
      .gte("session_date", today).lte("session_date", addDays(today, VISITOR_HORIZON_DAYS))
      .order("session_date").order("starts_at"),
    pub.from("plans").select("price_kes").eq("code", "day_pass").maybeSingle(),
  ]);
  const price = (planRes.data as unknown as { price_kes: number } | null)?.price_kes ?? 1000;
  const sessions = ((sRes.data ?? []) as unknown as S[]).filter((s) => s.session_date > today || s.starts_at > nowTime);

  const ids = sessions.map((s) => s.id);
  const aRes = ids.length ? await pub.rpc("visitor_availability", { p_session_ids: ids }) : { data: [] };
  const avail = new Map(((aRes.data ?? []) as unknown as Avail[]).map((a) => [a.session_id, a]));

  // If a member with a running membership opens this page, tell them they don't need it.
  let isMember = false;
  const profile = await getCurrentProfile();
  if (profile) {
    const supabase = await createClient();
    const { data } = await supabase.from("member_status").select("state").eq("member_id", profile.id).maybeSingle();
    isMember = (data as unknown as { state: string } | null)?.state === "active";
  }

  const byDate = new Map<string, S[]>();
  for (const s of sessions) byDate.set(s.session_date, [...(byDate.get(s.session_date) ?? []), s]);

  return (
    <BookShell>
      <h1>Try a class</h1>
      <p className="lead">
        New here? Book one coached class for <strong>{kes(price)}</strong>, no membership needed. Pick a class, pay with M-Pesa,
        and we&rsquo;ll email your confirmation once we&rsquo;ve seen the payment.
      </p>

      {sp.error && <p className="bk-note err" role="alert">{sp.error}</p>}
      {isMember && <p className="bk-note">You have a running membership, so you don&rsquo;t need to book. Just turn up and check in at the desk.</p>}
      {!profile && <p className="bk-note">You&rsquo;ll be asked to log in or create a free account when you pick a class, so we know who is coming.</p>}

      {sessions.length === 0 ? (
        <p className="bk-card">No classes are open for booking right now. Please check back soon, or <Link href="/#classes">see the weekly timetable</Link>.</p>
      ) : (
        [...byDate.entries()].map(([date, list]) => (
          <div key={date}>
            <div className="bk-day">{fmtDate(date)}{date === today ? " · Today" : ""}</div>
            <div className="bk-list">
              {list.map((s) => {
                const a = avail.get(s.id);
                const left = a ? Math.max(a.spots - a.taken, 0) : 0;
                return (
                  <div key={s.id} className="bk-item">
                    <span>
                      <span className="n">{s.name}{s.ladies_only ? " · Ladies only" : ""}</span>
                      <span className="s">{fmtTime(s.starts_at)}–{fmtTime(s.ends_at)}{s.coach_name ? ` · ${s.coach_name}` : ""}</span>
                    </span>
                    <span className="bk-act">
                      <span className={`bk-left${left <= 2 ? " low" : ""}`}>{left === 0 ? "Full" : `${left} spot${left === 1 ? "" : "s"} left`}</span>
                      {left > 0 && (
                        <form action={startVisitorBooking}>
                          <input type="hidden" name="session_id" value={s.id} />
                          <SubmitButton className="btn btn-primary">Book · {kes(price)}</SubmitButton>
                        </form>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
      <p className="ttnote" style={{ marginTop: 18, fontSize: ".85rem", color: "var(--steel)" }}>
        Times are 24-hour. You can book up to {VISITOR_HORIZON_DAYS} days ahead. Visitor spots are limited per class.
      </p>
    </BookShell>
  );
}
