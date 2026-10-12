import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { acceptVisitor, cancelVisitorAsAdmin, rejectVisitor } from "./actions";
import { fmtDate, fmtTime, nairobiToday } from "@/lib/timetable";
import { fmtStamp, kes, namesMatch } from "@/lib/orders";
import { lfNo } from "@/lib/desk";
import { BOOKING_COLUMNS, STATUS_LABEL, bookingNo, hydrate, type VisitorBooking, type VisitorRow } from "@/lib/visitors";

const NOTES: Record<string, { text: string; err?: boolean }> = {
  approved: { text: "Accepted. The visitor's spot is confirmed." },
  rejected: { text: "Rejected." },
  cancelled: { text: "Booking cancelled." },
  need_confirm: { text: "Tick the box to confirm you've seen the payment in the M-Pesa statement.", err: true },
  need_reason: { text: "Please give a short reason.", err: true },
  error: { text: "Something went wrong.", err: true },
};

function Card({ r, mode }: { r: VisitorRow; mode: "review" | "confirmed" | "none" }) {
  const claimed = r.status === "payment_claimed";
  const differ = claimed && !namesMatch(r.person?.full_name, r.mpesa_name);
  const sessionCancelled = r.session?.status === "cancelled";
  return (
    <div className={`pay-card${differ || sessionCancelled ? " warn" : ""}`}>
      <div className="pay-top">
        <div>
          <strong>{r.session ? `${r.session.name} · ${fmtDate(r.session.session_date)} ${fmtTime(r.session.starts_at)}` : "Class"}</strong> · {kes(r.amount_kes)}
          <span className="sub" style={{ display: "block", fontSize: ".8rem", color: "var(--steel)" }}>
            {bookingNo(r.booking_no)} · {claimed ? `claimed ${fmtStamp(r.claimed_at)}` : `booked ${fmtStamp(r.created_at)}`}
          </span>
        </div>
        <div>
          {claimed ? <span className="adm-tag red">Needs review</span>
            : r.status === "confirmed" ? <span className="adm-tag dark">Confirmed</span>
            : <span className="adm-tag">{STATUS_LABEL[r.status]}</span>}
          {differ && <span className="adm-tag red">Names differ</span>}
          {sessionCancelled && <span className="adm-tag red">Class cancelled</span>}
        </div>
      </div>

      <div className="pay-who">
        <div>
          <span className="k">Signed-in name</span>
          <span className="v">{r.person?.full_name || "(no name)"}</span>
          <span className="s">{r.person?.email}{r.person?.phone ? ` · ${r.person.phone}` : ""}{r.person ? ` · ${lfNo(r.person.member_no)}` : ""}</span>
        </div>
        <div>
          <span className="k">M-Pesa name</span>
          <span className="v">{r.mpesa_name ?? "Not given yet"}</span>
        </div>
      </div>

      {r.reject_reason && (r.status === "rejected" || r.status === "cancelled") && <p style={{ fontSize: ".88rem" }}>Reason: {r.reject_reason}</p>}

      {mode === "review" && (
        <div className="pay-act">
          <form action={acceptVisitor}>
            <input type="hidden" name="id" value={r.id} />
            <label className="chk">
              <input type="checkbox" name="confirm" required /> I&rsquo;ve seen this payment in the M-Pesa statement
            </label>
            <button type="submit" className="btn btn-primary btn-sm">Accept</button>
          </form>
          <form action={rejectVisitor}>
            <input type="hidden" name="id" value={r.id} />
            <input type="text" name="reason" placeholder="Reason, e.g. payment not found" required minLength={3} />
            <button type="submit" className="btn btn-danger btn-sm">Reject</button>
          </form>
        </div>
      )}
      {mode === "confirmed" && (
        <div className="pay-act">
          <form action={cancelVisitorAsAdmin}>
            <input type="hidden" name="id" value={r.id} />
            <input type="text" name="reason" placeholder="Reason to cancel (refund them yourself)" required minLength={3} />
            <button type="submit" className="btn btn-danger btn-sm">Cancel booking</button>
          </form>
        </div>
      )}
    </div>
  );
}

export default async function VisitorsAdminPage({ searchParams }: { searchParams: Promise<{ done?: string; mail?: string; msg?: string }> }) {
  await requireRole(["admin"], "/desk/login?as=admin");
  const sp = await searchParams;
  const supabase = await createClient();
  await supabase.rpc("expire_stale_visitor_bookings"); // let go of unpaid bookings that ran out of hold time
  const today = nairobiToday();

  const [review, waiting, confirmed, recent] = await Promise.all([
    supabase.from("visitor_bookings").select(BOOKING_COLUMNS).eq("status", "payment_claimed").order("claimed_at"),
    supabase.from("visitor_bookings").select(BOOKING_COLUMNS).eq("status", "awaiting_payment").order("created_at", { ascending: false }),
    supabase.from("visitor_bookings").select(BOOKING_COLUMNS).eq("status", "confirmed").order("created_at", { ascending: false }).limit(60),
    supabase.from("visitor_bookings").select(BOOKING_COLUMNS).in("status", ["attended", "rejected", "cancelled", "expired"]).order("created_at", { ascending: false }).limit(10),
  ]);
  const [reviewRows, waitingRows, confirmedAll, recentRows] = await Promise.all([
    hydrate(supabase, (review.data ?? []) as unknown as VisitorBooking[]),
    hydrate(supabase, (waiting.data ?? []) as unknown as VisitorBooking[]),
    hydrate(supabase, (confirmed.data ?? []) as unknown as VisitorBooking[]),
    hydrate(supabase, (recent.data ?? []) as unknown as VisitorBooking[]),
  ]);
  // Only confirmed bookings for classes that haven't passed yet.
  const upcoming = confirmedAll
    .filter((r) => r.session && r.session.session_date >= today)
    .sort((a, b) => (a.session!.session_date + a.session!.starts_at).localeCompare(b.session!.session_date + b.session!.starts_at));

  const note = sp.done ? NOTES[sp.done] : undefined;
  const loadError = review.error ?? waiting.error ?? confirmed.error ?? recent.error;

  return (
    <>
      <div className="adm-head">
        <div>
          <h1>Single classes</h1>
          <p className="lead">Visitors who booked one class. Match each M-Pesa payment, then accept it. They get a confirmation email.</p>
        </div>
      </div>

      {note && <p className={`adm-note${note.err ? " err" : ""}`} role="status">{note.text}{sp.msg ? ` ${sp.msg}` : ""}</p>}
      {sp.mail === "credits" && (
        <p className="adm-note err" role="alert">The email wasn&rsquo;t sent because the mailbox is <strong>out of email credits</strong>. The decision itself was saved. Tell the visitor by phone or WhatsApp.</p>
      )}
      {sp.mail === "fail" && <p className="adm-note err" role="alert">The email couldn&rsquo;t be sent (check the Bosonware mail settings). The decision itself was saved.</p>}
      {sp.mail === "ok" && <p className="adm-note" role="status">Email sent to the visitor.</p>}
      {loadError && <p className="adm-note err" role="alert">Couldn&rsquo;t load bookings: {loadError.message}</p>}

      <h2 className="pay-h">Needs review ({reviewRows.length})</h2>
      {reviewRows.length === 0 ? <p className="portal-card">Nothing waiting.</p> : reviewRows.map((r) => <Card key={r.id} r={r} mode="review" />)}

      <h2 className="pay-h">Booked but not marked as paid ({waitingRows.length})</h2>
      {waitingRows.length === 0 ? <p className="portal-card">None.</p> : waitingRows.map((r) => <Card key={r.id} r={r} mode="review" />)}
      <p style={{ fontSize: ".85rem", color: "var(--steel)" }}>
        Unpaid bookings let go of their spot after two hours. If someone paid but forgot to press &ldquo;I&rsquo;ve paid&rdquo;, you can still accept them from here while the class hasn&rsquo;t finished.
      </p>

      <h2 className="pay-h">Confirmed, coming up ({upcoming.length})</h2>
      {upcoming.length === 0 ? <p className="portal-card">None.</p> : upcoming.map((r) => <Card key={r.id} r={r} mode="confirmed" />)}

      <h2 className="pay-h">Recently finished</h2>
      {recentRows.length === 0 ? <p className="portal-card">Nothing yet.</p> : recentRows.map((r) => <Card key={r.id} r={r} mode="none" />)}
    </>
  );
}
