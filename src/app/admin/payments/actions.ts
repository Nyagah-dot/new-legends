"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { sendEmail } from "@/lib/email/send";
import { membershipApprovedEmail, paymentNotConfirmedEmail } from "@/lib/email/templates";
import { isUuid } from "@/lib/timetable";
import { one, type Rel } from "@/lib/rel";

type MailInfo = {
  amount_kes?: number;
  plans: Rel<{ name: string }>;
  profiles: Rel<{ full_name: string; email: string | null }>;
};

const LOGIN = "/desk/login?as=admin";
const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

function refresh() {
  revalidatePath("/admin", "layout"); // also refreshes the pending-payments badge
  revalidatePath("/account");
}

/** Accept a payment: creates the membership, then emails the member (the email never blocks the acceptance). */
export async function acceptOrder(formData: FormData) {
  await requireRole(["admin"], LOGIN);
  const id = text(formData, "id");
  if (!isUuid(id)) redirect("/admin/payments?done=error");
  if (formData.get("confirm") !== "on") redirect("/admin/payments?done=need_confirm");

  const startsRaw = text(formData, "starts_on");
  const startsOn = /^\d{4}-\d{2}-\d{2}$/.test(startsRaw) ? startsRaw : null;

  const supabase = await createClient();
  const { data: membershipId, error } = await supabase.rpc("approve_order", { p_order_id: id, p_starts_on: startsOn });
  if (error) {
    const msg = error.code === "P0001" ? error.message : "Database error.";
    redirect(`/admin/payments?done=error&msg=${encodeURIComponent(msg)}`);
  }

  let mail: "ok" | "fail" | "skip" | "credits" = "skip";
  try {
    const { data: raw } = await supabase
      .from("orders")
      .select("amount_kes, plans(name), profiles!orders_member_id_fkey(full_name, email)")
      .eq("id", id)
      .maybeSingle();
    const o = raw as unknown as MailInfo | null;
    const who = one(o?.profiles);
    const plan = one(o?.plans);
    const { data: m } = await supabase.from("memberships").select("starts_on, base_ends_on").eq("id", membershipId).maybeSingle();
    const email: string | undefined = who?.email ?? undefined;
    if (email && m) {
      const sent = await sendEmail({
        to: email,
        ...membershipApprovedEmail({
          name: who?.full_name,
          planName: plan?.name ?? "membership",
          startsOn: m.starts_on,
          endsOn: m.base_ends_on,
          amount: o?.amount_kes ?? 0,
        }),
      });
      mail = sent.ok ? "ok" : sent.code === "insufficient_credits" ? "credits" : "fail";
      if (!sent.ok) console.error("[approve email]", sent.error);
    }
  } catch (e) {
    mail = "fail";
    console.error("[approve email]", e);
  }

  refresh();
  redirect(`/admin/payments?done=approved&mail=${mail}`);
}

export async function rejectOrder(formData: FormData) {
  await requireRole(["admin"], LOGIN);
  const id = text(formData, "id");
  const reason = text(formData, "reason");
  if (!isUuid(id)) redirect("/admin/payments?done=error");
  if (reason.length < 3) redirect("/admin/payments?done=need_reason");

  const supabase = await createClient();
  const { error } = await supabase.rpc("reject_order", { p_order_id: id, p_reason: reason });
  if (error) {
    const msg = error.code === "P0001" ? error.message : "Database error.";
    redirect(`/admin/payments?done=error&msg=${encodeURIComponent(msg)}`);
  }

  let mail: "ok" | "fail" | "skip" | "credits" = "skip";
  try {
    const { data: raw } = await supabase
      .from("orders")
      .select("plans(name), profiles!orders_member_id_fkey(full_name, email)")
      .eq("id", id)
      .maybeSingle();
    const o = raw as unknown as MailInfo | null;
    const who = one(o?.profiles);
    const email: string | undefined = who?.email ?? undefined;
    if (email) {
      const sent = await sendEmail({
        to: email,
        ...paymentNotConfirmedEmail({ name: who?.full_name, planName: one(o?.plans)?.name ?? "membership", reason }),
      });
      mail = sent.ok ? "ok" : sent.code === "insufficient_credits" ? "credits" : "fail";
      if (!sent.ok) console.error("[reject email]", sent.error);
    }
  } catch (e) {
    mail = "fail";
    console.error("[reject email]", e);
  }

  refresh();
  redirect(`/admin/payments?done=rejected&mail=${mail}`);
}
