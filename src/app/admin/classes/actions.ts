"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { isUuid } from "@/lib/timetable";

export type ClassFormState = { error?: string } | undefined;

const LOGIN = "/desk/login?as=admin";
const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function refresh() {
  revalidatePath("/");                 // the public timetable
  revalidatePath("/admin/classes");
  revalidatePath("/admin/sessions");
}

function parse(formData: FormData) {
  const name = text(formData, "name");
  const days = [...new Set(formData.getAll("days").map((d) => Number(d)))]
    .filter((d) => Number.isInteger(d) && d >= 1 && d <= 7)
    .sort((a, b) => a - b);
  const starts = text(formData, "starts_at");
  const ends = text(formData, "ends_at");
  const capRaw = text(formData, "capacity");

  if (name.length < 2) return { error: "Give the class a name." } as const;
  if (days.length === 0) return { error: "Pick at least one day." } as const;
  if (!TIME_RE.test(starts) || !TIME_RE.test(ends)) return { error: "Enter a start and end time." } as const;
  if (ends <= starts) return { error: "The end time must be after the start time." } as const;

  let capacity: number | null = null;
  if (capRaw !== "") {
    capacity = Number(capRaw);
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 500) {
      return { error: "Capacity must be a whole number, or leave it empty for no limit." } as const;
    }
  }

  return {
    values: {
      name,
      description: text(formData, "description") || null,
      coach_name: text(formData, "coach_name") || null,
      weekdays: days,
      starts_at: starts,
      ends_at: ends,
      capacity,
      bookable: formData.get("bookable") === "on",
      ladies_only: formData.get("ladies_only") === "on",
      is_active: formData.get("is_active") === "on",
    },
  } as const;
}

/** Create (no id) or update (id) a class, then rebuild its upcoming dates. */
export async function saveClass(_prev: ClassFormState, formData: FormData): Promise<ClassFormState> {
  await requireRole(["admin"], LOGIN);
  const parsed = parse(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createClient();
  const id = text(formData, "id");

  if (id) {
    if (!isUuid(id)) return { error: "Class not found." };
    const { data, error } = await supabase.from("classes").update(parsed.values).eq("id", id).select("id");
    if (error) return { error: "We couldn't save that class. " + error.message };
    if (!data || data.length === 0) return { error: "Class not found, or you don't have permission." };
    const { error: rpcError } = await supabase.rpc("regenerate_future_sessions", { p_class_id: id });
    if (rpcError) return { error: "Saved, but the upcoming dates couldn't be rebuilt: " + rpcError.message };
  } else {
    const { error } = await supabase.from("classes").insert(parsed.values);
    if (error) return { error: "We couldn't create that class. " + error.message };
    const { error: rpcError } = await supabase.rpc("generate_class_sessions", { p_days_ahead: 28 });
    if (rpcError) return { error: "Created, but the upcoming dates couldn't be made: " + rpcError.message };
  }

  refresh();
  redirect("/admin/classes?done=saved");
}

export async function deleteClass(formData: FormData) {
  await requireRole(["admin"], LOGIN);
  const id = text(formData, "id");
  if (!isUuid(id)) redirect("/admin/classes?done=error");
  const supabase = await createClient();
  const { error } = await supabase.from("classes").delete().eq("id", id);
  refresh();
  redirect(`/admin/classes?done=${error ? "error" : "deleted"}`);
}
