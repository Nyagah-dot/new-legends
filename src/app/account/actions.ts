"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { addDays, isUuid } from "@/lib/timetable";

export type Msg = { ok: boolean; message: string } | undefined;

const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const PHONE_RE = /^[0-9+()\-\s]{7,20}$/;
const ALL = ["member", "staff", "admin"] as const;
const friendly = (e: { code?: string; message: string }, fallback: string) => (e.code === "P0001" ? e.message : fallback);

export async function updateProfile(_prev: Msg, formData: FormData): Promise<Msg> {
  const me = await requireRole([...ALL], "/login");
  const fullName = text(formData, "full_name");
  const phone = text(formData, "phone");
  const ecName = text(formData, "ec_name");
  const ecPhone = text(formData, "ec_phone");
  if (fullName.length < 2) return { ok: false, message: "Please enter your full name." };
  if (!PHONE_RE.test(phone)) return { ok: false, message: "Enter a phone number we can reach you on." };
  if (ecPhone && !PHONE_RE.test(ecPhone)) return { ok: false, message: "The emergency phone number doesn't look right." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      phone,
      emergency_contact_name: ecName || null,
      emergency_contact_phone: ecPhone || null,
    })
    .eq("id", me.id)
    .select("id");
  if (error || !data || data.length === 0) return { ok: false, message: "We couldn't save that. Please try again." };
  revalidatePath("/account", "layout");
  return { ok: true, message: "Saved." };
}

export async function setMarketing(_prev: Msg, formData: FormData): Promise<Msg> {
  await requireRole([...ALL], "/login");
  const granted = formData.get("granted") === "on";
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_my_marketing_consent", { p_granted: granted });
  if (error) return { ok: false, message: friendly(error, "We couldn't save that. Please try again.") };
  revalidatePath("/account/profile");
  return { ok: true, message: granted ? "You'll get our offers and updates." : "You won't get marketing emails." };
}

export async function requestFreeze(_prev: Msg, formData: FormData): Promise<Msg> {
  await requireRole([...ALL], "/login");
  const membershipId = text(formData, "membership_id");
  const startsOn = text(formData, "starts_on");
  const days = Number(text(formData, "days"));
  const medical = formData.get("medical") === "on";
  const note = text(formData, "medical_note");

  if (!isUuid(membershipId)) return { ok: false, message: "Membership not found." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startsOn)) return { ok: false, message: "Pick the first day of the freeze." };
  if (!Number.isInteger(days) || days < 1 || days > 200) return { ok: false, message: "Enter how many days." };
  if (medical && note.length < 3) return { ok: false, message: "Add a short note for the medical freeze." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("request_freeze", {
    p_membership_id: membershipId,
    p_starts_on: startsOn,
    p_resumes_on: addDays(startsOn, days),
    p_is_medical: medical,
    p_medical_note: medical ? note : null,
  });
  if (error) return { ok: false, message: friendly(error, "We couldn't send that request. Please try again.") };
  revalidatePath("/account/freeze");
  revalidatePath("/desk/freezes");
  return { ok: true, message: "Request sent. The front desk will confirm it, and it shows below until they do." };
}

export async function cancelFreezeRequest(formData: FormData) {
  await requireRole([...ALL], "/login");
  const id = text(formData, "freeze_id");
  if (!isUuid(id)) return;
  const supabase = await createClient();
  await supabase.rpc("cancel_freeze", { p_freeze_id: id });
  revalidatePath("/account/freeze");
  revalidatePath("/desk/freezes");
}
