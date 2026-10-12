import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import PrintButton from "@/components/account/PrintButton";
import { fmtStamp, kes } from "@/lib/orders";
import { isUuid } from "@/lib/timetable";

type Pay = { id: string; kind: string; method: string; status: string; amount_kes: number; reference: string | null; paid_at: string | null; membership_id: string | null };

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireRole(["member", "staff", "admin"], "/login");
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const supabase = await createClient();
  const { data } = await supabase.from("payments")
    .select("id, kind, method, status, amount_kes, reference, paid_at, membership_id")
    .eq("id", id).eq("member_id", me.id).maybeSingle();
  const p = data as unknown as Pay | null;
  if (!p || p.status !== "paid") notFound();

  let plan = "";
  if (p.membership_id) {
    const { data: m } = await supabase.from("membership_overview").select("plan_name, starts_on, ends_on")
      .eq("membership_id", p.membership_id).maybeSingle();
    const mm = m as unknown as { plan_name: string; starts_on: string; ends_on: string } | null;
    if (mm) plan = `${mm.plan_name} (${mm.starts_on} to ${mm.ends_on})`;
  }
  const no = `RCP-${p.id.slice(0, 8).toUpperCase()}`;

  return (
    <>
      <div className="rc">
        <h1>THE <span style={{ color: "var(--red)" }}>LEGENDS</span> FITNESS</h1>
        <p className="ac-sub">Links Road, Nyali, Mombasa · Payment receipt</p>
        <dl>
          <div><dt>Receipt no.</dt><dd>{no}</dd></div>
          <div><dt>Date</dt><dd>{fmtStamp(p.paid_at)}</dd></div>
          <div><dt>Member</dt><dd>{me.fullName || me.email}</dd></div>
          <div><dt>For</dt><dd style={{ textTransform: "capitalize" }}>{p.kind.replace("_", " ")}{plan ? `: ${plan}` : ""}</dd></div>
          <div><dt>Paid by</dt><dd style={{ textTransform: "capitalize" }}>{p.method.replace("_", " ")}</dd></div>
          {p.reference && <div><dt>Reference</dt><dd>{p.reference}</dd></div>}
          <div className="total"><dt>Amount</dt><dd>{kes(p.amount_kes)}</dd></div>
        </dl>
        <p className="ac-sub">Thank you for training with us.</p>
      </div>
      <div style={{ textAlign: "center", marginTop: 18 }}><PrintButton /></div>
    </>
  );
}
