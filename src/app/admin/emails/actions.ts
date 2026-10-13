"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { sendDueReminders } from "@/lib/reminders";

/** Sends all reminders that are due right now (the same thing the daily job does). */
export async function sendRemindersNow() {
  await requireRole(["admin"], "/desk/login?as=admin");
  const h = await headers();
  const origin = h.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const supabase = await createClient();
  const r = await sendDueReminders(supabase, origin);
  revalidatePath("/admin/emails");
  if (r.error) redirect(`/admin/emails?done=error&msg=${encodeURIComponent("Couldn't load the reminders.")}`);
  if (r.stoppedForCredits) {
    redirect(`/admin/emails?done=error&msg=${encodeURIComponent(`Sent ${r.sent}, then stopped: the email account is out of credits. Top up and press the button again.`)}`);
  }
  redirect(`/admin/emails?done=sent&n=${r.sent}&f=${r.failed}`);
}
