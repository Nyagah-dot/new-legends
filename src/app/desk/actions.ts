"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { isUuid } from "@/lib/timetable";
import { METHODS } from "@/lib/desk";

const LOGIN = "/desk/login";
const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const PHONE_RE = /^[0-9+()\-\s]{7,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type CheckInState = { ok: boolean; message: string; warning?: string } | undefined;
export type SellState = { ok: boolean; message: string } | undefined;
export type WalkInState = { error?: string } | undefined;

/** Friendly text for the errors our database functions raise on purpose (code P0001). */
const friendly = (e: { code?: string; message: string }, fallback: string) => (e.code === "P0001" ? e.message : fallback);

export async function checkIn(_prev: CheckInState, formData: FormData): Promise<CheckInState> {
  await requireRole(["staff", "admin"], LOGIN);
  const id = text(formData, "member_id");
  if (!isUuid(id)) return { ok: false, message: "Member not found." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("check_in_member", { p_member_id: id });
  if (error) return { ok: false, message: friendly(error, "Couldn't check in. Please try again.") };

  const r = (data ?? {}) as {
    ok?: boolean; message?: string; full_name?: string; plan_name?: string; days_left?: number; warning?: string | null;
  };
  revalidatePath(`/desk/members/${id}`);
  revalidatePath("/desk");
  if (r.ok) {
    return {
      ok: true,
      message: `Checked in: ${r.full_name ?? "member"} · ${r.plan_name ?? ""} · ${r.days_left ?? 0} day(s) left`,
      warning: r.warning ?? undefined,
    };
  }
  return { ok: false, message: r.message ?? "Not allowed in." };
}

export async function sellMembership(_prev: SellState, formData: FormData): Promise<SellState> {
  await requireRole(["staff", "admin"], LOGIN);
  const id = text(formData, "member_id");
  const plan = text(formData, "plan");
  const method = text(formData, "method");
  const reference = text(formData, "reference");

  const m = METHODS.find((x) => x.value === method);
  if (!isUuid(id) || !/^[a-z_]{2,30}$/.test(plan) || !m) return { ok: false, message: "Choose a plan and how they paid." };
  if (m.needsRef && reference.length < 3) return { ok: false, message: "Enter the transaction code." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("sell_membership", {
    p_member_id: id,
    p_plan_code: plan,
    p_method: method,
    p_reference: reference || null,
  });
  if (error) {
    if (error.code === "23505") return { ok: false, message: "That transaction code has already been used." };
    return { ok: false, message: friendly(error, "Couldn't sell the membership. Please try again.") };
  }
  revalidatePath(`/desk/members/${id}`);
  revalidatePath("/desk");
  revalidatePath("/desk/members");
  return { ok: true, message: "Membership sold and payment recorded." };
}

export async function createWalkIn(_prev: WalkInState, formData: FormData): Promise<WalkInState> {
  await requireRole(["staff", "admin"], LOGIN);
  const name = text(formData, "full_name");
  const phone = text(formData, "phone");
  const email = text(formData, "email").toLowerCase();
  const marketing = formData.get("marketing") === "on";

  if (name.length < 2) return { error: "Enter the member's full name." };
  if (!PHONE_RE.test(phone)) return { error: "Enter a phone number." };
  if (email && !EMAIL_RE.test(email)) return { error: "That email address doesn't look right." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("staff_create_member", {
    p_full_name: name,
    p_phone: phone,
    p_email: email || null,
    p_marketing_opt_in: marketing && Boolean(email),
  });
  if (error) {
    if (error.code === "23505") return { error: "A member with that email already exists. Search for them instead." };
    return { error: friendly(error, "Couldn't add the member. Please try again.") };
  }
  revalidatePath("/desk/members");
  redirect(`/desk/members/${data}`);
}

/** Undo a mistaken check-in from today (a reason is always kept). */
export async function voidCheckIn(formData: FormData) {
  await requireRole(["staff", "admin"], LOGIN);
  const id = text(formData, "check_in_id");
  const reason = text(formData, "reason");
  if (!isUuid(id) || reason.length < 3) redirect("/desk?done=need_reason");
  const supabase = await createClient();
  const { error } = await supabase.rpc("void_check_in", { p_check_in_id: id, p_reason: reason });
  revalidatePath("/desk");
  redirect(`/desk?done=${error ? "error" : "voided"}`);
}
