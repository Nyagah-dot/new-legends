import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { fmtStamp, kes } from "@/lib/orders";

type Pay = { id: string; kind: string; method: string; status: string; amount_kes: number; reference: string | null; paid_at: string | null };

export default async function PaymentsPage() {
  const me = await requireRole(["member", "staff", "admin"], "/login");
  const supabase = await createClient();
  const { data } = await supabase.from("payments")
    .select("id, kind, method, status, amount_kes, reference, paid_at")
    .eq("member_id", me.id).order("created_at", { ascending: false }).limit(50);
  const pays = (data ?? []) as unknown as Pay[];

  return (
    <>
      <h1>Payments</h1>
      <p className="lead">Everything you&rsquo;ve paid, with a receipt for each.</p>
      {pays.length === 0 ? (
        <p className="ac-card">No payments yet.</p>
      ) : (
        <div className="ac-scroll">
          <table className="ac-table">
            <thead><tr><th>Date</th><th>For</th><th>Method</th><th>Reference</th><th>Amount</th><th></th></tr></thead>
            <tbody>
              {pays.map((p) => (
                <tr key={p.id}>
                  <td>{fmtStamp(p.paid_at)}</td>
                  <td style={{ textTransform: "capitalize" }}>{p.kind.replace("_", " ")}</td>
                  <td style={{ textTransform: "capitalize" }}>{p.method.replace("_", " ")}</td>
                  <td>{p.reference ?? "—"}</td>
                  <td>{kes(p.amount_kes)}</td>
                  <td>{p.status === "paid" ? <Link href={`/account/receipts/${p.id}`} style={{ fontWeight: 700 }}>Receipt</Link> : p.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
