import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { acceptPt, cancelPtAsAdmin, closePt, rejectPt, settleRefund } from "./actions";
import { fmtDate, fmtTime } from "@/lib/timetable";
import { fmtStamp, kes, namesMatch } from "@/lib/orders";
import { lfNo } from "@/lib/desk";
import { PT_COLUMNS, PT_LABEL, hydratePt, nairobiNowStamp, ptNo, type PtBooking, type PtRow } from "@/lib/pt";

const NOTES: Record<string, { text: string; err?: boolean }> = {
  approved: { text: "Accepted. The session is confirmed." },
  rejected: { text: "Rejected." },
  cancelled: { text: "Booking cancelled. If it was paid, it now shows under Refunds due." },
  completed: { text: "Marked as completed." },
  no_show: { text: "Marked as a no show." },
  refunded: { text: "Refund recorded." },
  waived: { text: "Closed with no refund." },
  need_confirm: { text: "Tick the box to confirm you've seen the payment in the M-Pesa statement.", err: true },
  need_reason: { text: "Please give a short reason.", err: true },
  need_method: { text: "Choose how the refund was paid.", err: true },
  need_ref: { text: "Add the M-Pesa, card or bank reference for the refund.", err: true },
  error: { text: "Something went wrong.", err: true },
};

type Mode = "review" | "upcoming" | "closeout" | "refund" | "none";

function Card({ r, mode }: { r: PtRow; mode: Mode }) {
  const claimed = r.status === "payment_claimed";
  const differ = claimed && !namesMatch(r.person?.full_name, r.mpesa_name);
  return (
    <div className={`pay-card${differ || r.refund_due ? " warn" : ""}`}>
      <div className="pay-top">
        <div>
          <strong>{r.coach} · {fmtDate(r.session_date)} {fmtTime(r.starts_at)}</strong> · {kes(r.amount_kes)}
          <span style={{ display: "block", fontSize: ".8rem", color: "var(--steel)" }}>
            {ptNo(r.booking_no)} · {claimed ? `claimed ${fmtStamp(r.claimed_at)}` : `booked ${fmtStamp(r.created_at)}`}
          </span>
        </div>
        <div>
          {claimed ? <span className="adm-tag red">Needs review</span>
            : r.status === "confirmed" ? <span className="adm-tag dark">Confirmed</span>
            : <span className="adm-tag">{PT_LABEL[r.status]}</span>}
          {differ && <span className="adm-tag red">Names differ</span>}
          {r.refund_due && <span className="adm-tag red">Refund due</span>}
        </div>
      </div>

      <div className="pay-who">
        <div>
          <span className="k">Client</span>
          <span className="v">{r.person?.full_name || "(no name)"}</span>
          <span className="s">{r.person?.email}{r.person?.phone ? ` · ${r.person.phone}` : ""}{r.person ? ` · ${lfNo(r.person.member_no)}` : ""}</span>
        </div>
        <div>
          <span className="k">M-Pesa name</span>
          <span className="v">{r.mpesa_name ?? "Not given yet"}</span>
        </div>
      </div>

      {r.reject_reason && ["rejected", "cancelled"].includes(r.status) && <p style={{ fontSize: ".88rem" }}>Reason: {r.reject_reason}</p>}

      {mode === "review" && (
        <div className="pay-act">
          <form action={acceptPt}>
            <input type="hidden" name="id" value={r.id} />
            <label className="chk"><input type="checkbox" name="confirm" required /> I&rsquo;ve seen this payment in the M-Pesa statement</label>
            <button type="submit" className="btn btn-primary btn-sm">Accept</button>
          </form>
          <form action={rejectPt}>
            <input type="hidden" name="id" value={r.id} />
            <input type="text" name="reason" placeholder="Reason, e.g. payment not found" required minLength={3} />
            <button type="submit" className="btn btn-danger btn-sm">Reject</button>
          </form>
        </div>
      )}
      {mode === "upcoming" && (
        <div className="pay-act">
          <form action={cancelPtAsAdmin}>
            <input type="hidden" name="id" value={r.id} />
            <input type="text" name="reason" placeholder="Reason to cancel (the client is owed a refund)" required minLength={3} />
            <button type="submit" className="btn btn-danger btn-sm">Cancel session</button>
          </form>
        </div>
      )}
      {mode === "closeout" && (
        <div className="pay-act">
          <form action={closePt}>
            <input type="hidden" name="id" value={r.id} />
            <input type="hidden" name="outcome" value="completed" />
            <button type="submit" className="btn btn-primary btn-sm">Session done</button>
          </form>
          <form action={closePt}>
            <input type="hidden" name="id" value={r.id} />
            <input type="hidden" name="outcome" value="no_show" />
            <button type="submit" className="btn btn-danger btn-sm">No show</button>
          </form>
        </div>
      )}
      {mode === "refund" && (
        <div className="pay-act">
          <form action={settleRefund}>
            <input type="hidden" name="id" value={r.id} />
            <select name="method" defaultValue="mpesa_paybill" aria-label="How the refund was paid">
              <option value="mpesa_paybill">M-Pesa</option>
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank transfer</option>
              <option value="card">Card</option>
              <option value="other">Other</option>
            </select>
            <input type="text" name="reference" placeholder="Reference (M-Pesa code)" />
            <button type="submit" className="btn btn-primary btn-sm">Record refund of {kes(r.amount_kes)}</button>
          </form>
          <form action={settleRefund}>
            <input type="hidden" name="id" value={r.id} />
            <input type="hidden" name="waive" value="1" />
            <button type="submit" className="btn btn-ghost btn-sm">No refund</button>
          </form>
        </div>
      )}
    </div>
  );
}

export default async function OneToOneAdminPage({ searchParams }: { searchParams: Promise<{ done?: string; mail?: string; msg?: string }> }) {
  await requireRole(["admin"], "/desk/login?as=admin");
  const sp = await searchParams;
  const supabase = await createClient();
  await supabase.rpc("expire_stale_pt_bookings"); // let go of unpaid holds that ran out of time

  const [review, waiting, confirmed, refunds, recent] = await Promise.all([
    supabase.from("pt_bookings").select(PT_COLUMNS).eq("status", "payment_claimed").order("claimed_at"),
    supabase.from("pt_bookings").select(PT_COLUMNS).eq("status", "awaiting_payment").order("created_at", { ascending: false }),
    supabase.from("pt_bookings").select(PT_COLUMNS).eq("status", "confirmed").order("session_date").order("starts_at").limit(150),
    supabase.from("pt_bookings").select(PT_COLUMNS).eq("refund_due", true).order("created_at", { ascending: false }),
    supabase.from("pt_bookings").select(PT_COLUMNS).in("status", ["completed", "no_show", "rejected", "cancelled", "expired"]).order("created_at", { ascending: false }).limit(12),
  ]);
  const [reviewRows, waitingRows, confirmedAll, refundRows, recentRows] = await Promise.all(
    [review, waiting, confirmed, refunds, recent].map((q) => hydratePt(supabase, (q.data ?? []) as unknown as PtBooking[]))
  );

  const nowStamp = nairobiNowStamp();
  const started = (r: PtRow) => `${r.session_date}T${r.starts_at}` <= nowStamp;
  const upcoming = confirmedAll.filter((r) => !started(r));
  const toClose = confirmedAll.filter(started);

  const note = sp.done ? NOTES[sp.done] : undefined;
  const loadError = review.error ?? waiting.error ?? confirmed.error ?? refunds.error ?? recent.error;

  return (
    <>
      <div className="adm-head">
        <div>
          <h1>1-to-1 sessions</h1>
          <p className="lead">Clients who booked a private session. Match each M-Pesa payment, then accept it. They get a confirmation email.</p>
        </div>
      </div>

      {note && <p className={`adm-note${note.err ? " err" : ""}`} role="status">{note.text}{sp.msg ? ` ${sp.msg}` : ""}</p>}
      {sp.mail === "credits" && <p className="adm-note err" role="alert">The email wasn&rsquo;t sent because the mailbox is <strong>out of email credits</strong>. The decision itself was saved. Tell the client by phone or WhatsApp.</p>}
      {sp.mail === "fail" && <p className="adm-note err" role="alert">The email couldn&rsquo;t be sent (check the Bosonware mail settings). The decision itself was saved.</p>}
      {sp.mail === "ok" && <p className="adm-note" role="status">Email sent to the client.</p>}
      {loadError && <p className="adm-note err" role="alert">Couldn&rsquo;t load bookings: {loadError.message}</p>}

      <h2 className="pay-h">Needs review ({reviewRows.length})</h2>
      {reviewRows.length === 0 ? <p className="portal-card">Nothing waiting.</p> : reviewRows.map((r) => <Card key={r.id} r={r} mode="review" />)}

      <h2 className="pay-h">Booked but not marked as paid ({waitingRows.length})</h2>
      {waitingRows.length === 0 ? <p className="portal-card">None.</p> : waitingRows.map((r) => <Card key={r.id} r={r} mode="review" />)}
      <p style={{ fontSize: ".85rem", color: "var(--steel)" }}>
        Unpaid bookings let go of their time after two hours. If someone paid but forgot to press &ldquo;I&rsquo;ve paid&rdquo;, you can still accept them from here while the session hasn&rsquo;t finished.
      </p>

      <h2 className="pay-h">Refunds due ({refundRows.length})</h2>
      {refundRows.length === 0 ? <p className="portal-card">None.</p> : refundRows.map((r) => <Card key={r.id} r={r} mode="refund" />)}

      <h2 className="pay-h">To close out ({toClose.length})</h2>
      {toClose.length === 0 ? <p className="portal-card">No finished sessions waiting.</p> : toClose.map((r) => <Card key={r.id} r={r} mode="closeout" />)}

      <h2 className="pay-h">Confirmed, coming up ({upcoming.length})</h2>
      {upcoming.length === 0 ? <p className="portal-card">None.</p> : upcoming.map((r) => <Card key={r.id} r={r} mode="upcoming" />)}

      <h2 className="pay-h">Recently finished</h2>
      {recentRows.length === 0 ? <p className="portal-card">Nothing yet.</p> : recentRows.map((r) => <Card key={r.id} r={r} mode="none" />)}
    </>
  );
}
