"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { DAY_LONG, isUuid, nairobiToday } from "@/lib/timetable";
import { PHOTO_RE, SLOT_CHOICES, hhmm, minutesOf } from "@/lib/trainers";

export type TrainerFormState = { error?: string } | undefined;

const LOGIN = "/desk/login?as=admin";
const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function refresh(id?: string) {
  revalidatePath("/");                 // the public site shows coach names
  revalidatePath("/admin/trainers");
  revalidatePath("/admin/classes");
  if (id) revalidatePath(`/admin/trainers/${id}`);
}

/** Back to the trainer's page with ?done=<code> (and ?msg=<text> when something was refused). */
function back(id: string, done: string, msg?: string): never {
  return redirect(`/admin/trainers/${id}?done=${done}${msg ? `&msg=${encodeURIComponent(msg.slice(0, 200))}` : ""}`);
}

function parse(formData: FormData) {
  const name = text(formData, "full_name");
  const title = text(formData, "title");
  const bio = text(formData, "bio");
  const photo = text(formData, "photo");
  const expertise = [...new Set(text(formData, "expertise").split(",").map((s) => s.trim()).filter(Boolean))];
  const priceRaw = text(formData, "session_price_kes");
  const price = priceRaw === "" ? NaN : Number(priceRaw);
  const slot = Number(text(formData, "slot_minutes"));
  const sortRaw = text(formData, "sort_order");
  const sort = sortRaw === "" ? 0 : Number(sortRaw);

  if (name.length < 2 || name.length > 60) return { error: "Enter the trainer's name (2 to 60 characters)." } as const;
  if (title.length > 60) return { error: "The title is too long (60 characters at most)." } as const;
  if (bio.length > 400) return { error: "The short bio is too long (400 characters at most)." } as const;
  if (photo && !PHOTO_RE.test(photo)) {
    return { error: "The photo must be a file name like male3.webp (letters, numbers, dots and dashes only)." } as const;
  }
  if (expertise.length > 8 || expertise.some((x) => x.length > 30)) {
    return { error: "Use at most 8 areas of expertise, each under 30 characters." } as const;
  }
  if (!Number.isInteger(price) || price < 0 || price > 1000000) {
    return { error: "Enter the session price as a whole number of shillings." } as const;
  }
  if (!(SLOT_CHOICES as readonly number[]).includes(slot)) return { error: "Pick a session length." } as const;
  if (!Number.isInteger(sort) || sort < 0 || sort > 1000) return { error: "The order must be a whole number from 0 to 1000." } as const;

  return {
    values: {
      full_name: name,
      title: title || null,
      bio: bio || null,
      photo: photo || null,
      expertise,
      session_price_kes: price,
      slot_minutes: slot,
      sort_order: sort,
      is_active: formData.get("is_active") === "on",
    },
  } as const;
}

/** Create (no id) or update (id) a trainer. */
export async function saveTrainer(_prev: TrainerFormState, formData: FormData): Promise<TrainerFormState> {
  await requireRole(["admin"], LOGIN);
  const parsed = parse(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createClient();
  const id = text(formData, "id");

  if (id) {
    if (!isUuid(id)) return { error: "Trainer not found." };
    const { data: before } = await supabase.from("trainers").select("full_name").eq("id", id).maybeSingle();
    const old = before as unknown as { full_name: string } | null;
    if (!old) return { error: "Trainer not found, or you don't have permission." };

    const { data, error } = await supabase.from("trainers").update(parsed.values).eq("id", id).select("id");
    if (error) return { error: "We couldn't save that trainer. " + error.message };
    if (!data || data.length === 0) return { error: "Trainer not found, or you don't have permission." };

    // A renamed trainer keeps showing correctly on the classes they lead (same rebuild the class editor does).
    if (old.full_name !== parsed.values.full_name) {
      const { data: linked } = await supabase.from("classes").update({ coach_name: parsed.values.full_name }).eq("trainer_id", id).select("id");
      for (const c of (linked ?? []) as unknown as { id: string }[]) {
        await supabase.rpc("regenerate_future_sessions", { p_class_id: c.id });
      }
    }
    refresh(id);
    redirect(`/admin/trainers/${id}?done=saved`);
  }

  const { data, error } = await supabase.from("trainers").insert(parsed.values).select("id").single();
  if (error || !data) return { error: "We couldn't add that trainer. " + (error?.message ?? "") };
  const newId = (data as unknown as { id: string }).id;
  refresh();
  redirect(`/admin/trainers/${newId}?done=created`);
}

/** Add a weekly window on one or more days. */
export async function addHours(formData: FormData) {
  await requireRole(["admin"], LOGIN);
  const id = text(formData, "trainer_id");
  if (!isUuid(id)) redirect("/admin/trainers");

  const days = [...new Set(formData.getAll("days").map((d) => Number(d)))]
    .filter((d) => Number.isInteger(d) && d >= 1 && d <= 7)
    .sort((a, b) => a - b);
  const starts = text(formData, "starts_at");
  const ends = text(formData, "ends_at");

  if (days.length === 0) back(id, "error", "Pick at least one day.");
  if (!TIME_RE.test(starts) || !TIME_RE.test(ends)) back(id, "error", "Enter a start and end time.");
  if (ends <= starts) back(id, "error", "The end time must be after the start time.");

  const supabase = await createClient();
  const { data: t } = await supabase.from("trainers").select("slot_minutes").eq("id", id).maybeSingle();
  const trainer = t as unknown as { slot_minutes: number } | null;
  if (!trainer) back(id, "error", "Trainer not found.");
  const slot = trainer!.slot_minutes;
  if (minutesOf(ends) - minutesOf(starts) < slot) back(id, "error", `That window is shorter than one ${slot}-minute session.`);

  const { data: existing, error: exErr } = await supabase
    .from("trainer_hours").select("weekday, starts_at, ends_at").eq("trainer_id", id).in("weekday", days);
  if (exErr) back(id, "error", "Couldn't check the existing hours. Please try again.");
  const clash = ((existing ?? []) as unknown as { weekday: number; starts_at: string; ends_at: string }[])
    .find((r) => starts < hhmm(r.ends_at) && ends > hhmm(r.starts_at));
  if (clash) back(id, "error", `That overlaps hours already set for ${DAY_LONG[clash.weekday - 1]}.`);

  const { error } = await supabase
    .from("trainer_hours")
    .insert(days.map((d) => ({ trainer_id: id, weekday: d, starts_at: starts, ends_at: ends })));
  if (error) back(id, "error", "Couldn't save those hours. Please try again.");
  refresh(id);
  back(id, "hours_added");
}

export async function deleteHours(formData: FormData) {
  await requireRole(["admin"], LOGIN);
  const id = text(formData, "trainer_id");
  const rowId = text(formData, "id");
  if (!isUuid(id)) redirect("/admin/trainers");
  if (!isUuid(rowId)) back(id, "error", "Those hours weren't found.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("trainer_hours").delete().eq("id", rowId).eq("trainer_id", id).select("id");
  if (error || !data || data.length === 0) back(id, "error", "Couldn't remove those hours.");
  refresh(id);
  back(id, "hours_removed");
}

/** Add time off: a whole day, or part of a day when both times are given. */
export async function addTimeOff(formData: FormData) {
  await requireRole(["admin"], LOGIN);
  const id = text(formData, "trainer_id");
  if (!isUuid(id)) redirect("/admin/trainers");

  const date = text(formData, "off_date");
  const starts = text(formData, "starts_at");
  const ends = text(formData, "ends_at");
  const reason = text(formData, "reason");

  if (!DATE_RE.test(date) || date < nairobiToday()) back(id, "error", "Pick a date from today onward.");
  if ((starts === "") !== (ends === "")) back(id, "error", "Give both a start and an end time, or leave both empty for the whole day.");
  if (starts && (!TIME_RE.test(starts) || !TIME_RE.test(ends))) back(id, "error", "Enter the times as hours and minutes.");
  if (starts && ends <= starts) back(id, "error", "The end time must be after the start time.");
  if (reason.length > 80) back(id, "error", "Keep the reason under 80 characters.");

  const supabase = await createClient();
  const { error } = await supabase.from("trainer_time_off").insert({
    trainer_id: id,
    off_date: date,
    starts_at: starts || null,
    ends_at: ends || null,
    reason: reason || null,
  });
  if (error) back(id, "error", "Couldn't save that time off. Please check the date and try again.");
  refresh(id);
  back(id, "off_added");
}

export async function deleteTimeOff(formData: FormData) {
  await requireRole(["admin"], LOGIN);
  const id = text(formData, "trainer_id");
  const rowId = text(formData, "id");
  if (!isUuid(id)) redirect("/admin/trainers");
  if (!isUuid(rowId)) back(id, "error", "That time off wasn't found.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("trainer_time_off").delete().eq("id", rowId).eq("trainer_id", id).select("id");
  if (error || !data || data.length === 0) back(id, "error", "Couldn't remove that time off.");
  refresh(id);
  back(id, "off_removed");
}
