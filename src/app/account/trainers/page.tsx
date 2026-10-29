import type { Metadata } from "next";
import Link from "next/link";
import "@/components/account/pt.css";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { addDays, fmtDate, fmtTime, isUuid, nairobiToday } from "@/lib/timetable";
import { kes } from "@/lib/orders";
import { PT_LABEL, ptNo, type MyPt } from "@/lib/pt";
import type { OpenSlot, PublicCoach } from "@/lib/publicCoaches";
import { cancelPtBooking, startPtBooking } from "./actions";

export const metadata: Metadata = { title: "1-to-1 sessions — THE LEGENDS FITNESS" };

const pillClass = (s: string) => (s === "confirmed" || s === "completed" ? "good" : s === "payment_claimed" || s === "awaiting_payment" ? "warn" : "dim");

export default async function TrainersPage({ searchParams }: { searchParams: Promise<{ coach?: string; error?: string; done?: string }> }) {
  await requireRole(["member", "staff", "admin"], "/login");
  const sp = await searchParams;
  const supabase = await createClient();

  const [cRes, sRes, mRes, gRes] = await Promise.all([
    supabase.rpc("public_coaches"),
    supabase.rpc("coach_open_slots", { p_days: 14 }),
    supabase.rpc("my_pt_bookings"),
    supabase.from("gym_settings").select("pt_hold_minutes, pt_cancel_hours").maybeSingle(),
  ]);
  const coaches = (cRes.data ?? []) as unknown as PublicCoach[];
  const slots = (sRes.data ?? []) as unknown as OpenSlot[];
  const mine = (mRes.data ?? []) as unknown as MyPt[];
  const gs = gRes.data as unknown as { pt_hold_minutes: number; pt_cancel_hours: number } | null;
  const holdMs = (gs?.pt_hold_minutes ?? 120) * 60000;
  const cancelHours = gs?.pt_cancel_hours ?? 24;
  const loadError = cRes.error ?? sRes.error ?? mRes.error;

  const today = nairobiToday();
  const tomorrow = addDays(today, 1);
  const now = Date.now();

  // Show a lapsed unpaid hold as expired, matching what the database will do.
  const rows = mine.map((b) => (b.status === "awaiting_payment" && new Date(b.created_at).getTime() + holdMs < now ? { ...b, status: "expired" as const } : b));
  const live = rows.filter((b) => ["awaiting_payment", "payment_claimed", "confirmed"].includes(b.status) && b.session_date >= today)
    .sort((a, b) => (a.session_date + a.starts_at).localeCompare(b.session_date + b.starts_at));
  const past = rows.filter((b) => !live.includes(b)).slice(0, 8);

  const selected = coaches.find((c) => c.id === sp.coach && isUuid(sp.coach ?? "")) ?? coaches[0];
  const byDay = new Map<string, string[]>();
  for (const s of slots) {
    if (selected && s.trainer_id === selected.id) byDay.set(s.slot_date, [...(byDay.get(s.slot_date) ?? []), s.starts_at]);
  }

  return (
    <>
      <h1>1-to-1 sessions</h1>
      <p className="lead">Pick a coach and a time. Pay by M-Pesa, and we confirm it by email.</p>

      {sp.error && <p className="pt-note err" role="alert">{sp.error}</p>}
      {sp.done === "cancelled" && <p className="pt-note" role="status">Your session was cancelled.</p>}
      {loadError && <p className="pt-note err" role="alert">Couldn&rsquo;t load 1-to-1 sessions. Please try again in a moment.</p>}

      <h2 className="pt-h">Your sessions</h2>
      {live.length === 0 ? (
        <p className="ac-card">You have no upcoming 1-to-1 sessions.</p>
      ) : (
        <div className="ac-list">
          {live.map((b) => (
            <div key={b.id} className="ac-item">
              <div>
                <strong>{b.coach_name}</strong>
                <span className="ac-sub" style={{ display: "block" }}>
                  {fmtDate(b.session_date)} · {fmtTime(b.starts_at)}–{fmtTime(b.ends_at)} · {kes(b.amount_kes)} · {ptNo(b.booking_no)}
                </span>
              </div>
              <div className="pt-actions">
                <span className={`pt-pill ${pillClass(b.status)}`}>{PT_LABEL[b.status]}</span>
                {b.status === "awaiting_payment" && <Link className="pt-link" href={`/account/trainers/${b.id}`}>Pay now</Link>}
                {b.status !== "awaiting_payment" && <Link className="pt-link" href={`/account/trainers/${b.id}`}>Details</Link>}
                <form action={cancelPtBooking}>
                  <input type="hidden" name="booking_id" value={b.id} />
                  <button type="submit" className="pt-linkbtn">Cancel</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="ac-sub" style={{ marginTop: 8 }}>
        Unpaid bookings are held for {gs?.pt_hold_minutes ?? 120} minutes. Paid sessions can be cancelled online up to {cancelHours} hours before they start.
      </p>

      <h2 className="pt-h">Book a session</h2>
      {coaches.length === 0 ? (
        <p className="ac-card">No coaches are open for booking yet. Please ask at the front desk.</p>
      ) : (
        <>
          <nav className="pt-coaches" aria-label="Choose a coach">
            {coaches.map((c) => (
              <Link key={c.id} href={`/account/trainers?coach=${c.id}`} className={c.id === selected?.id ? "on" : undefined} aria-current={c.id === selected?.id ? "page" : undefined}>
                {c.full_name}
              </Link>
            ))}
          </nav>

          {selected && (
            <div className="ac-card">
              <div className="pt-coach-meta">
                <strong>{selected.full_name}</strong>
                <span className="ac-sub">{selected.title?.trim() || "Coach"} · {selected.slot_minutes} min · {selected.session_price_kes > 0 ? kes(selected.session_price_kes) : "Price at the desk"}</span>
              </div>
              {selected.expertise?.length > 0 && <p className="ac-sub">{selected.expertise.join(" · ")}</p>}

              {byDay.size === 0 ? (
                <p style={{ marginTop: 14 }}>No open times in the next 14 days. Check back soon or try another coach.</p>
              ) : (
                <div style={{ marginTop: 10 }}>
                  {[...byDay.entries()].map(([date, starts]) => (
                    <div key={date} className="pt-day">
                      <span className="pt-date">{date === today ? "Today" : date === tomorrow ? "Tomorrow" : ""} {fmtDate(date)}</span>
                      <div className="pt-times">
                        {starts.map((t) => (
                          <form key={t} action={startPtBooking}>
                            <input type="hidden" name="coach" value={selected.id} />
                            <input type="hidden" name="date" value={date} />
                            <input type="hidden" name="start" value={t} />
                            <button type="submit" className="pt-time" aria-label={`Book ${fmtDate(date)} at ${fmtTime(t)}`}>{fmtTime(t)}</button>
                          </form>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {past.length > 0 && (
        <>
          <h2 className="pt-h">Earlier</h2>
          <div className="ac-list">
            {past.map((b) => (
              <div key={b.id} className="ac-item">
                <div>
                  <strong>{b.coach_name}</strong>
                  <span className="ac-sub" style={{ display: "block" }}>{fmtDate(b.session_date)} · {fmtTime(b.starts_at)} · {ptNo(b.booking_no)}</span>
                </div>
                <span className={`pt-pill ${pillClass(b.status)}`}>{PT_LABEL[b.status]}{b.refund_due ? " · refund due" : ""}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
