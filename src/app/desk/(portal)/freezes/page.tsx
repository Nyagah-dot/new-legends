import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { approveFreeze, rejectFreeze, endFreezeEarly, cancelFreezeAtDesk } from "@/app/desk/actions";
import { METHODS, lfNo } from "@/lib/desk";
import { daysBetween } from "@/lib/account";
import { addDays, nairobiToday } from "@/lib/timetable";
import { fmtLong, kes } from "@/lib/orders";

type Fz = {
  id: string; membership_id: string; starts_on: string; resumes_on: string; status: string;
  is_medical: boolean; medical_note: string | null; override_reason: string | null;
  reject_reason: string | null; created_at: string;
};
type Ms = { id: string; member_id: string; plan_id: string };
type Pf = { id: string; full_name: string; member_no: number };
type Pl = { id: string; name: string; freeze_fee_kes: number };

const DONE: Record<string, string> = {
  approved: "Freeze approved. It starts on its start date and resumes by itself.",
  rejected: "Freeze rejected. The member can see the reason.",
  ended: "Freeze ended. The member is active again from today.",
  cancelled: "Freeze cancelled.",
};

export default async function FreezesPage({ searchParams }: { searchParams: Promise<{ done?: string; msg?: string }> }) {
  const me = await requireRole(["staff", "admin"], "/desk/login");
  const sp = await searchParams;
  const isAdmin = me.role === "admin";
  const today = nairobiToday();
  const supabase = await createClient();

  // Pending first, then anything approved that hasn't finished, then a short history.
  const [openRes, histRes] = await Promise.all([
    supabase.from("membership_freezes")
      .select("id, membership_id, starts_on, resumes_on, status, is_medical, medical_note, override_reason, reject_reason, created_at")
      .in("status", ["pending", "approved"]).gte("resumes_on", today).order("starts_on"),
    supabase.from("membership_freezes")
      .select("id, membership_id, starts_on, resumes_on, status, is_medical, medical_note, override_reason, reject_reason, created_at")
      .or(`status.in.(rejected,cancelled),resumes_on.lt.${today}`).order("created_at", { ascending: false }).limit(15),
  ]);
  const open = (openRes.data ?? []) as unknown as Fz[];
  const hist = (histRes.data ?? []) as unknown as Fz[];
  const all = [...open, ...hist];

  // Look up who and what plan, in plain separate queries (no embedded relations to trip the type checker).
  const msIds = [...new Set(all.map((f) => f.membership_id))];
  const msRes = msIds.length ? await supabase.from("memberships").select("id, member_id, plan_id").in("id", msIds) : { data: [] };
  const mss = (msRes.data ?? []) as unknown as Ms[];
  const memberIds = [...new Set(mss.map((m) => m.member_id))];
  const planIds = [...new Set(mss.map((m) => m.plan_id))];
  const [pfRes, plRes] = await Promise.all([
    memberIds.length ? supabase.from("profiles").select("id, full_name, member_no").in("id", memberIds) : Promise.resolve({ data: [] }),
    planIds.length ? supabase.from("plans").select("id, name, freeze_fee_kes").in("id", planIds) : Promise.resolve({ data: [] }),
  ]);
  const msById = new Map(mss.map((m) => [m.id, m]));
  const pfById = new Map(((pfRes.data ?? []) as unknown as Pf[]).map((p) => [p.id, p]));
  const plById = new Map(((plRes.data ?? []) as unknown as Pl[]).map((p) => [p.id, p]));
  const who = (f: Fz) => {
    const m = msById.get(f.membership_id);
    return { member: m ? pfById.get(m.member_id) : undefined, plan: m ? plById.get(m.plan_id) : undefined };
  };

  const pending = open.filter((f) => f.status === "pending");
  const approved = open.filter((f) => f.status === "approved");

  const Head = ({ f }: { f: Fz }) => {
    const { member, plan } = who(f);
    return (
      <div>
        <span className="n">
          {member ? <Link href={`/desk/members/${member.id}`}>{member.full_name || "(no name)"}</Link> : "Unknown member"}
          {member ? <span className="s" style={{ display: "inline", marginLeft: 8 }}>{lfNo(member.member_no)}</span> : null}
        </span>
        <span className="s">
          {fmtLong(f.starts_on)} to {fmtLong(addDays(f.resumes_on, -1))} · {daysBetween(f.starts_on, f.resumes_on)} days
          {plan ? ` · ${plan.name}` : ""}
          {f.is_medical ? " · medical" : ""}
        </span>
        {f.medical_note && <span className="s">Note: {f.medical_note}</span>}
        {f.override_reason && <span className="s">Override reason: {f.override_reason}</span>}
        {f.reject_reason && <span className="s">Reason given: {f.reject_reason}</span>}
      </div>
    );
  };

  return (
    <>
      <div className="dk-head">
        <h1>Freezes</h1>
        <p className="meta">Approve or reject member freeze requests. Medical freezes and overrides can only be approved by an admin.</p>
      </div>

      {sp.done && DONE[sp.done] && <p className="dk-note">{DONE[sp.done]}</p>}
      {sp.done === "error" && <p className="dk-note" role="alert">{sp.msg || "Something went wrong. Please try again."}</p>}

      <h2 className="dk-h">Waiting for a decision ({pending.length})</h2>
      {pending.length === 0 ? (
        <p className="dk-empty portal-card">Nothing waiting.</p>
      ) : (
        pending.map((f) => {
          const { plan } = who(f);
          const skip = f.is_medical || f.override_reason !== null;
          const fee = skip ? 0 : plan?.freeze_fee_kes ?? 0;
          const canApprove = !skip || isAdmin;
          return (
            <section key={f.id} className="dk-card">
              <Head f={f} />
              {!canApprove && <p className="dk-note" style={{ marginTop: 12 }}>This needs an admin to approve. You can still reject it.</p>}
              {canApprove && (
                <form action={approveFreeze} className="dk-form" style={{ marginTop: 14 }}>
                  <input type="hidden" name="freeze_id" value={f.id} />
                  {fee > 0 ? (
                    <>
                      <p><strong>Freeze fee: {kes(fee)}</strong>. Collect it before approving.</p>
                      <label>
                        Paid by
                        <select name="method" defaultValue="cash">
                          {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                      </label>
                      <label>
                        Transaction code (needed for M-Pesa, card and bank)
                        <input name="reference" type="text" autoComplete="off" />
                      </label>
                      {isAdmin && (
                        <label className="chk"><input type="checkbox" name="waive" /> Waive the fee (admin)</label>
                      )}
                    </>
                  ) : (
                    <p>{skip ? "No fee for medical freezes or overrides." : "This plan has no freeze fee."}</p>
                  )}
                  <button type="submit" className="btn btn-primary">Approve freeze</button>
                </form>
              )}
              <form action={rejectFreeze} className="dk-undo" style={{ marginTop: 14 }}>
                <input type="hidden" name="freeze_id" value={f.id} />
                <input name="reason" type="text" required minLength={3} placeholder="Reason to reject" aria-label="Reason to reject" />
                <button type="submit" className="btn btn-ghost">Reject</button>
              </form>
            </section>
          );
        })
      )}

      <h2 className="dk-h">Approved, upcoming or running ({approved.length})</h2>
      {approved.length === 0 ? (
        <p className="dk-empty portal-card">None.</p>
      ) : (
        <div className="dk-list">
          {approved.map((f) => {
            const running = f.starts_on <= today;
            return (
              <div key={f.id} className="dk-row">
                <Head f={f} />
                <span className="dk-undo">
                  <span className={`pill pill-${running ? "warn" : "ok"}`}>{running ? "Frozen now" : "Starts later"}</span>
                  {running ? (
                    <form action={endFreezeEarly}>
                      <input type="hidden" name="freeze_id" value={f.id} />
                      <button type="submit" className="btn btn-ghost">End early</button>
                    </form>
                  ) : (
                    <form action={cancelFreezeAtDesk}>
                      <input type="hidden" name="freeze_id" value={f.id} />
                      <button type="submit" className="btn btn-ghost">Cancel</button>
                    </form>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <h2 className="dk-h">Recent history</h2>
      {hist.length === 0 ? (
        <p className="dk-empty portal-card">Nothing yet.</p>
      ) : (
        <div className="dk-list">
          {hist.map((f) => (
            <div key={f.id} className="dk-row">
              <Head f={f} />
              <span className={`pill pill-${f.status === "approved" ? "ok" : "none"}`}>{f.status === "approved" ? "finished" : f.status === "pending" ? "never decided" : f.status}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
