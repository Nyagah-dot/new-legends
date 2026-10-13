"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { isUuid } from "@/lib/timetable";

const LOGIN = "/desk/login?as=admin";
const BACK = "/admin/settings";
const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const num = (f: FormData, k: string) => (text(f, k) === "" ? NaN : Number(text(f, k)));
const inRange = (n: number, lo: number, hi: number) => Number.isInteger(n) && n >= lo && n <= hi;
const fail = (msg: string): never => redirect(`${BACK}?done=error&msg=${encodeURIComponent(msg)}`);

function refresh() {
  revalidatePath("/");              // pricing on the public site
  revalidatePath("/book", "layout");
  revalidatePath("/admin/settings");
}

/** Edit a plan's name, price, order, on/off and freeze rules. Existing memberships and orders keep the price they were sold at. */
export async function savePlan(formData: FormData) {
  await requireRole(["admin"], LOGIN);
  const id = text(formData, "id");
  const name = text(formData, "name");
  const price = num(formData, "price_kes");
  const sort = num(formData, "sort_order");
  const active = formData.get("is_active") === "on";
  const freeze = formData.get("freeze_allowed") === "on";
  if (!isUuid(id)) fail("Plan not found.");
  if (name.length < 2 || name.length > 40) fail("Give the plan a name (2 to 40 letters).");
  if (!inRange(price, 0, 1000000)) fail("The price must be a whole number of shillings.");
  if (!inRange(sort, 0, 1000)) fail("The order must be a whole number from 0 to 1000.");

  let rules = { freeze_allowed: false, freeze_min_days: 0, freeze_max_single_days: 0, freeze_max_total_days: 0, freeze_max_count: 0, freeze_fee_kes: 0 };
  if (freeze) {
    const min = num(formData, "freeze_min_days");
    const single = num(formData, "freeze_max_single_days");
    const total = num(formData, "freeze_max_total_days");
    const count = num(formData, "freeze_max_count");
    const fee = num(formData, "freeze_fee_kes");
    if (![min, single, total, count, fee].every(Number.isInteger)) fail("Fill in every freeze rule with whole numbers.");
    if (min < 1) fail("The shortest freeze must be at least 1 day.");
    if (count < 1) fail("Allow at least 1 freeze, or untick \"Freezing allowed\".");
    if (single < min) fail("The longest single freeze can't be shorter than the shortest freeze.");
    if (total < single) fail("The total frozen days can't be less than the longest single freeze.");
    if (fee < 0 || fee > 100000) fail("The freeze fee must be between 0 and 100000.");
    rules = { freeze_allowed: true, freeze_min_days: min, freeze_max_single_days: single, freeze_max_total_days: total, freeze_max_count: count, freeze_fee_kes: fee };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plans")
    .update({ name, price_kes: price, sort_order: sort, is_active: active, ...rules })
    .eq("id", id)
    .select("id");
  if (error || !data || data.length === 0) fail("Couldn't save that plan. Please try again.");
  refresh();
  redirect(`${BACK}?done=plan_saved`);
}

/** Add a new plan. The code and length can't be changed afterwards (other records depend on them). */
export async function addPlan(formData: FormData) {
  await requireRole(["admin"], LOGIN);
  const code = text(formData, "code").toLowerCase();
  const name = text(formData, "name");
  const price = num(formData, "price_kes");
  const days = num(formData, "duration_days");
  if (!/^[a-z][a-z_]{1,29}$/.test(code)) fail("The code must be 2 to 30 lowercase letters or underscores, like \"two_month\".");
  if (name.length < 2 || name.length > 40) fail("Give the plan a name (2 to 40 letters).");
  if (!inRange(price, 0, 1000000)) fail("The price must be a whole number of shillings.");
  if (!inRange(days, 1, 1000)) fail("The length must be 1 to 1000 days.");

  const supabase = await createClient();
  const { data: last } = await supabase.from("plans").select("sort_order").order("sort_order", { ascending: false }).limit(1);
  const next = ((last as unknown as { sort_order: number }[] | null)?.[0]?.sort_order ?? 0) + 10;
  const { error } = await supabase.from("plans").insert({ code, name, price_kes: price, duration_days: days, sort_order: next, is_active: false });
  if (error) fail(error.code === "23505" ? "That code is already used by another plan." : "Couldn't add the plan. Please try again.");
  refresh();
  redirect(`${BACK}?done=plan_added`);
}

/** Paybill details, visitor booking limits and the freeze / cancellation rules. */
export async function saveSettings(formData: FormData) {
  await requireRole(["admin"], LOGIN);
  const paybill = text(formData, "paybill_number");
  const account = text(formData, "paybill_account");
  const spots = num(formData, "visitor_spots_per_class");
  const hold = num(formData, "visitor_hold_minutes");
  const notice = num(formData, "freeze_min_notice_days");
  const age = num(formData, "freeze_min_membership_age_days");
  const remaining = num(formData, "freeze_min_days_remaining");
  const ceiling = num(formData, "freeze_hard_ceiling_pct");
  const cutoff = num(formData, "booking_cancel_cutoff_hours");

  if (!/^\d{4,10}$/.test(paybill)) fail("The Paybill number should be 4 to 10 digits.");
  if (!/^[A-Za-z0-9 _.\-]{1,30}$/.test(account)) fail("The account number can use letters, numbers, spaces, dots, dashes (up to 30 characters).");
  if (!inRange(spots, 0, 100)) fail("Visitor spots must be 0 to 100.");
  if (!inRange(hold, 15, 1440)) fail("The visitor hold time must be 15 to 1440 minutes.");
  if (!inRange(notice, 0, 90)) fail("Freeze notice must be 0 to 90 days.");
  if (!inRange(age, 0, 365)) fail("Freeze membership age must be 0 to 365 days.");
  if (!inRange(remaining, 0, 365)) fail("Freeze days remaining must be 0 to 365.");
  if (!inRange(ceiling, 1, 100)) fail("The freeze ceiling must be 1 to 100 percent.");
  if (!inRange(cutoff, 0, 72)) fail("The cancellation cut-off must be 0 to 72 hours.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gym_settings")
    .update({
      paybill_number: paybill, paybill_account: account,
      visitor_spots_per_class: spots, visitor_hold_minutes: hold,
      freeze_min_notice_days: notice, freeze_min_membership_age_days: age, freeze_min_days_remaining: remaining,
      freeze_hard_ceiling_pct: ceiling, booking_cancel_cutoff_hours: cutoff,
    })
    .eq("id", true)
    .select("id");
  if (error || !data || data.length === 0) fail("Couldn't save the settings. Please try again.");
  refresh();
  redirect(`${BACK}?done=settings_saved`);
}
