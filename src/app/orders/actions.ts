"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { hasEmailEnv, sendEmail } from "@/lib/email/send";
import { paymentClaimedAlertEmail } from "@/lib/email/templates";
import { isUuid } from "@/lib/timetable";
import { orderNo } from "@/lib/orders";
import { one, type Rel } from "@/lib/rel";

export type ClaimState = { error?: string } | undefined;

const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

/** "Continue to payment": creates the order (or reopens the one already open) and goes to its payment page. */
export async function startOrder(formData: FormData) {
  const plan = text(formData, "plan");
  if (!/^[a-z_]{2,30}$/.test(plan)) redirect("/#pricing");

  const profile = await getCurrentProfile();
  if (!profile) redirect(`/login?next=${encodeURIComponent(`/join?plan=${plan}`)}`);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_order", { p_plan_code: plan });
  if (error || !data) redirect(`/join?plan=${encodeURIComponent(plan)}&error=1`);
  redirect(`/orders/${data}`);
}

/** "I've paid": records the M-Pesa name and tells the gym a payment is waiting. */
export async function claimPayment(_prev: ClaimState, formData: FormData): Promise<ClaimState> {
  const id = text(formData, "order_id");
  const mpesaName = text(formData, "mpesa_name");
  if (!isUuid(id)) return { error: "Order not found." };
  if (mpesaName.length < 2) return { error: "Please enter the name that will show on the M-Pesa message." };

  const profile = await getCurrentProfile();
  if (!profile) redirect(`/login?next=${encodeURIComponent(`/orders/${id}`)}`);

  const supabase = await createClient();
  const { error } = await supabase.rpc("claim_payment", { p_order_id: id, p_mpesa_name: mpesaName });
  if (error) return { error: error.code === "P0001" ? error.message : "We couldn't save that. Please try again." };

  // Best-effort heads-up to the gym. Never blocks the member.
  const notifyTo = process.env.NOTIFICATIONS_RECIPIENT ?? process.env.ADMIN_NOTIFY_EMAIL;
  if (notifyTo && hasEmailEnv) {
    try {
      const { data: raw } = await supabase.from("orders").select("order_no, amount_kes, plans(name)").eq("id", id).maybeSingle();
      const o = raw as unknown as { order_no: number; amount_kes: number; plans: Rel<{ name: string }> } | null;
      if (o) {
        const h = await headers();
        const origin = h.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
        const mail = paymentClaimedAlertEmail({
          memberName: profile.fullName || profile.email || "A member",
          planName: one(o.plans)?.name ?? "membership",
          amount: o.amount_kes,
          mpesaName,
          orderNo: orderNo(o.order_no),
          link: `${origin}/admin/payments`,
        });
        const sent = await sendEmail({ to: notifyTo, ...mail });
        if (!sent.ok) console.error("[claim alert]", sent.error);
      }
    } catch (e) {
      console.error("[claim alert]", e);
    }
  }

  revalidatePath(`/orders/${id}`);
  revalidatePath("/account");
  redirect(`/orders/${id}`);
}

export async function cancelOrder(formData: FormData) {
  const id = text(formData, "order_id");
  if (!isUuid(id)) redirect("/account");
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  const supabase = await createClient();
  await supabase.rpc("cancel_order", { p_order_id: id });
  revalidatePath("/account");
  redirect("/#pricing");
}
