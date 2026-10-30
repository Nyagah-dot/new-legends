"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { isUuid } from "@/lib/timetable";

const BACK = "/admin/coach-logins";

export async function linkCoachLogin(formData: FormData) {
  await requireRole(["admin"], "/desk/login?as=admin");
  const id = String(formData.get("id") ?? "");
  const email = String(formData.get("email") ?? "").trim();
  const unlink = String(formData.get("unlink") ?? "") === "1";
  if (!isUuid(id)) redirect(`${BACK}?done=error`);
  if (!unlink && !/^\S+@\S+\.\S+$/.test(email)) redirect(`${BACK}?done=bad_email`);

  const supabase = await createClient();
  const { error } = await supabase.rpc("link_coach_login", { p_trainer_id: id, p_email: unlink ? null : email });
  revalidatePath(BACK);
  if (error) redirect(`${BACK}?done=error&msg=${encodeURIComponent(error.code === "P0001" ? error.message : "Database error.")}`);
  redirect(`${BACK}?done=${unlink ? "unlinked" : "linked"}`);
}
