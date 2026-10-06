import "@/components/admin/payments.css";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { acceptOrder, rejectOrder } from "./actions";
import { fmtStamp, kes, namesMatch, orderNo } from "@/lib/orders";
import { nairobiToday } from "@/lib/timetable";

const SELECT =
  "id, order_no, status, amount_kes, mpesa_name, claimed_at, created_at, decided_at, reject_reason, plans(name), profiles!orders_member_id_fkey(full_name, email, phone, member_no)";

type Row = {
  id: string; order_no: number; status: string; amount_kes: number; mpesa_name: string | null;
  claimed_at: string | null; created_at: string; decided_at: string | null; reject_reason: string | null;
  plans: { name: string } | null;
  profiles: { full_name: string; email: string | null; phone: string | null; member_no: number } | null;
};

function Card({ o, today, actions }: { o: Row; today: string; actions: boolean }) {
  const claimed = o.status === "payment_claimed";
  const differ = claimed && !namesMatch(o.profiles?.full_name, o.mpesa_name);
  return (
    <div className={`pay-card${differ ? " warn" : ""}`}>
      <div className="pay-top">
        <div>
          <strong>{o.plans?.name ?? "Plan"}</strong> · {kes(o.amount_kes)}
          <span className="sub" style={{ display: "block", fontSize: ".8rem", color: "var(--steel)" }}>
            {orderNo(o.order_no)} · {claimed ? `claimed ${fmtStamp(o.claimed_at)}` : `started ${fmtStamp(o.created_at)}`}
          </span>
        </div>
        <div>
          {claimed ? <span className="adm-tag red">Needs review</span> : o.status === "awaiting_payment" ? <span className="adm-tag">Not paid yet</span>
            : o.status === "approved" ? <span className="adm-tag dark">Accepted</span> : <span className="adm-tag">{o.status}</span>}
          {differ && <span className="adm-tag red">Names differ</span>}
        </div>
      </div>

      <div className="pay-who">
        <div>
          <span className="k">Signed-in name</span>
          <span className="v">{o.profiles?.full_name || "(no name)"}</span>
          <span className="s">{o.profiles?.email}{o.profiles?.phone ? ` · ${o.profiles.phone}` : ""} · LF-{String(o.profiles?.member_no ?? 0).padStart(4, "0")}</span>
        </div>
        <div>
          <span className="k">M-Pesa name</span>
          <span className="v">{o.mpesa_name ?? "Not given yet"}</span>
        </div>
      </div>

      {o.status === "rejected" && o.reject_reason && <p style={{ fontSize: ".88rem" }}>Reason: {o.reject_reason}</p>}

      {actions && (
        <div className="pay-act">
          <form action={acceptOrder}>
            <input type="hidden" name="id" value={o.id} />
            <label className="chk">
              <input type="checkbox" name="confirm" required /> I&rsquo;ve seen this payment in the M-Pesa statement
            </label>
            <label className="chk" title="Leave empty to start today, or right after their current membership">
              Starts <input type="date" name="starts_on" min={today} />
            </label>
            <button type="submit" className="btn btn-primary btn-sm">Accept</button>
          </form>
          <form action={rejectOrder}>
            <input type="hidden" name="id" value={o.id} />
            <input type="text" name="reason" placeholder="Reason, e.g. payment not found" required minLength={3} />
            <button type="submit" className="btn btn-danger btn-sm">Reject</button>
          </form>
        </div>
      )}
    </div>
  );
}

const NOTES: Record<string, { text: string; err?: boolean }> = {
  approved: { text: "Accepted. The membership is now active." },
  rejected: { text: "Rejected." },
  need_confirm: { text: "Tick the box to confirm you've seen the payment in the M-Pesa statement.", err: true },
  need_reason: { text: "Please give a short reason.", err: true },
  error: { text: "Something went wrong.", err: true },
};

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string; mail?: string; msg?: string }>;
}) {
  await requireRole(["admin"], "/desk/login?as=admin");
  const sp = await searchParams;
  const supabase = await createClient();
  await supabase.rpc("expire_stale_orders"); // tidy up unpaid orders older than 48h

  const [review, waiting, recent] = await Promise.all([
    supabase.from("orders").select(SELECT).eq("status", "payment_claimed").order("claimed_at"),
    supabase.from("orders").select(SELECT).eq("status", "awaiting_payment").order("created_at", { ascending: false }),
    supabase.from("orders").select(SELECT).in("status", ["approved", "rejected"]).order("decided_at", { ascending: false }).limit(10),
  ]);

  const today = nairobiToday();
  const note = sp.done ? NOTES[sp.done] : undefined;
  const loadError = review.error ?? waiting.error ?? recent.error;

  return (
    <>
      <div className="adm-head">
        <div>
          <h1>Payments</h1>
          <p className="lead">Match each M-Pesa payment to a member, then accept it. Their membership starts straight away.</p>
        </div>
      </div>

      {note && (
        <p className={`adm-note${note.err ? " err" : ""}`} role="status">
          {note.text}{sp.msg ? ` ${sp.msg}` : ""}
        </p>
      )}
      {sp.mail === "credits" && (
        <p className="adm-note err" role="alert">
          The email wasn&rsquo;t sent because the mailbox is <strong>out of email credits</strong>. The decision itself was saved.
          Top up the credits with Bosonware, then tell the member by phone or WhatsApp in the meantime.
        </p>
      )}
      {sp.mail === "fail" && (
        <p className="adm-note err" role="alert">
          The confirmation email couldn&rsquo;t be sent (check the Bosonware mail settings). The decision itself was saved.
        </p>
      )}
      {sp.mail === "ok" && <p className="adm-note" role="status">Email sent to the member.</p>}
      {loadError && <p className="adm-note err" role="alert">Couldn&rsquo;t load payments: {loadError.message}</p>}

      <h2 className="pay-h">Needs review ({review.data?.length ?? 0})</h2>
      {(review.data ?? []).length === 0 ? (
        <p className="portal-card">Nothing waiting. 🎉</p>
      ) : (
        (review.data as Row[]).map((o) => <Card key={o.id} o={o} today={today} actions />)
      )}

      <h2 className="pay-h">Started but not marked as paid ({waiting.data?.length ?? 0})</h2>
      {(waiting.data ?? []).length === 0 ? (
        <p className="portal-card">None.</p>
      ) : (
        (waiting.data as Row[]).map((o) => <Card key={o.id} o={o} today={today} actions />)
      )}
      <p style={{ fontSize: ".85rem", color: "var(--steel)" }}>
        Unpaid orders disappear after 48 hours. If someone paid but forgot to press &ldquo;I&rsquo;ve paid&rdquo;, you can still accept them from here.
      </p>

      <h2 className="pay-h">Recently decided</h2>
      {(recent.data ?? []).length === 0 ? (
        <p className="portal-card">Nothing yet.</p>
      ) : (
        (recent.data as Row[]).map((o) => <Card key={o.id} o={o} today={today} actions={false} />)
      )}
    </>
  );
}
