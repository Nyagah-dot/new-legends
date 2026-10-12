"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { isUuid } from "@/lib/timetable";

const LOGIN = "/desk/login";
const BACK = "/desk/visitors";
const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

function refresh() {
  revalidatePath("/desk", "layout"); // also refreshes the Visitors badge
  revalidatePath("/admin", "layout");
}

/** Tick a confirmed visitor in on the day of their class. */
export async function checkInVisitor(formData: FormData) {
  await requireRole(["staff", "admin"], LOGIN);
  const id = text(formData, "id");
  if (!isUuid(id)) redirect(`${BACK}?done=error`);
  const supabase = await createClient();
  const { error } = await supabase.rpc("check_in_visitor", { p_booking_id: id });
  refresh();
  if (error) redirect(`${BACK}?done=error&msg=${encodeURIComponent(error.code === "P0001" ? error.message : "Couldn't check in. Please try again.")}`);
  redirect(`${BACK}?done=checked_in`);
}

export async function undoVisitorCheckIn(formData: FormData) {
  await requireRole(["staff", "admin"], LOGIN);
  const id = text(formData, "id");
  if (!isUuid(id)) redirect(`${BACK}?done=error`);
  const supabase = await createClient();
  const { error } = await supabase.rpc("undo_visitor_check_in", { p_booking_id: id });
  refresh();
  if (error) redirect(`${BACK}?done=error&msg=${encodeURIComponent(error.code === "P0001" ? error.message : "Couldn't undo. Please try again.")}`);
  redirect(`${BACK}?done=undone`);
}
