"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { isUuid } from "@/lib/timetable";

const LOGIN = "/desk/login?as=admin";
const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

function refresh() {
  revalidatePath("/");
  revalidatePath("/admin/sessions");
}

export async function cancelSession(formData: FormData) {
  await requireRole(["admin"], LOGIN);
  const id = text(formData, "id");
  const reason = text(formData, "reason");
  if (!isUuid(id) || reason.length < 2) redirect("/admin/sessions?done=need_reason");
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_class_session", { p_session_id: id, p_reason: reason });
  refresh();
  redirect(`/admin/sessions?done=${error ? "error" : "cancelled"}`);
}

export async function restoreSession(formData: FormData) {
  await requireRole(["admin"], LOGIN);
  const id = text(formData, "id");
  if (!isUuid(id)) redirect("/admin/sessions?done=error");
  const supabase = await createClient();
  const { error } = await supabase.rpc("restore_class_session", { p_session_id: id });
  refresh();
  redirect(`/admin/sessions?done=${error ? "error" : "restored"}`);
}

export async function generateSessions() {
  await requireRole(["admin"], LOGIN);
  const supabase = await createClient();
  const { error } = await supabase.rpc("generate_class_sessions", { p_days_ahead: 28 });
  refresh();
  redirect(`/admin/sessions?done=${error ? "error" : "generated"}`);
}
