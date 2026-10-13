"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { isUuid } from "@/lib/timetable";

const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const METHODS = ["cash", "mpesa_paybill", "card", "bank_transfer", "other"];

/** Admin only: ends a membership now and optionally records a refund. The database re-checks everything. */
export async function cancelMembership(formData: FormData) {
  await requireRole(["admin"], "/desk/login?as=admin");
  const memberId = text(formData, "member_id");
  const membershipId = text(formData, "membership_id");
  const reason = text(formData, "reason");
  const refund = Math.max(0, Math.floor(Number(text(formData, "refund") || "0")) || 0);
  const method = text(formData, "method");
  const reference = text(formData, "reference");
  if (!isUuid(memberId)) redirect("/desk/members");
  const back = `/desk/members/${memberId}`;
  const fail = (m: string) => redirect(`${back}?done=error&msg=${encodeURIComponent(m)}`);

  if (!isUuid(membershipId)) fail("Pick which membership to cancel.");
  if (reason.length < 3) fail("Please write a short reason.");
  if (refund > 0 && !METHODS.includes(method)) fail("Choose how the refund was paid.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_membership_with_refund", {
    p_membership_id: membershipId,
    p_reason: reason,
    p_refund_kes: refund,
    p_method: refund > 0 ? method : null,
    p_reference: reference || null,
  });
  revalidatePath(back);
  if (error) fail(error.code === "P0001" ? error.message : "Couldn't cancel the membership.");
  redirect(`${back}?done=cancelled`);
}
