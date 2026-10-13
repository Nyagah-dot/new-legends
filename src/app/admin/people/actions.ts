"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { isUuid } from "@/lib/timetable";

const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

/** Change someone's role. The database keeps at least one admin and writes the change to the audit log. */
export async function changeRole(formData: FormData) {
  const me = await requireRole(["admin"], "/desk/login?as=admin");
  const id = text(formData, "id");
  const role = text(formData, "role");
  const back = text(formData, "q") ? `/admin/people?q=${encodeURIComponent(text(formData, "q"))}&` : "/admin/people?";
  if (!isUuid(id) || !["member", "staff", "admin"].includes(role)) redirect(`${back}done=error`);
  if (id === me.id) redirect(`${back}done=error&msg=${encodeURIComponent("You can't change your own role. Ask another admin.")}`);

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_user_role", { p_profile_id: id, p_role: role });
  revalidatePath("/admin/people");
  if (error) redirect(`${back}done=error&msg=${encodeURIComponent(error.code === "P0001" ? error.message : "Couldn't change the role.")}`);
  redirect(`${back}done=role_changed`);
}
