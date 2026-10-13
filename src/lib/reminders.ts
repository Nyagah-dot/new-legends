import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/send";
import { membershipExpiringEmail } from "@/lib/email/templates";

export type DueReminder = {
  membership_id: string; member_id: string; full_name: string; email: string; plan_name: string;
  ends_on: string; kind: "7d" | "1d"; already_sent: boolean;
};

export type ReminderRun = { sent: number; failed: number; stoppedForCredits: boolean; remaining: number; error?: string };

/**
 * Sends every reminder that is due and not yet sent. Each one is "claimed" in the database first, so two runs at the
 * same moment (button + daily job) can never email the same person twice. If the email fails, the claim is released
 * so the next run tries again. A run sends at most `cap` emails.
 */
export async function sendDueReminders(db: SupabaseClient, siteUrl: string, cap = 40): Promise<ReminderRun> {
  const { data, error } = await db.rpc("due_expiry_reminders");
  if (error) return { sent: 0, failed: 0, stoppedForCredits: false, remaining: 0, error: error.message };
  const todo = ((data ?? []) as unknown as DueReminder[]).filter((d) => !d.already_sent);

  let sent = 0, failed = 0, stoppedForCredits = false, i = 0;
  for (; i < todo.length && sent + failed < cap; i++) {
    const d = todo[i];
    const claim = await db.rpc("claim_expiry_reminder", { p_membership_id: d.membership_id, p_kind: d.kind, p_email: d.email });
    if (claim.error || claim.data !== true) continue; // someone else already took it
    const mail = membershipExpiringEmail({
      name: d.full_name, planName: d.plan_name, endsOn: d.ends_on, daysLeft: d.kind === "7d" ? 7 : 1,
      renewUrl: `${siteUrl.replace(/\/+$/, "")}/account`,
    });
    const res = await sendEmail({ to: d.email, ...mail });
    if (res.ok) {
      sent++;
    } else {
      failed++;
      await db.rpc("release_expiry_reminder", { p_membership_id: d.membership_id, p_kind: d.kind });
      if (res.code === "insufficient_credits") { stoppedForCredits = true; i++; break; }
    }
  }
  return { sent, failed, stoppedForCredits, remaining: Math.max(0, todo.length - i) };
}
