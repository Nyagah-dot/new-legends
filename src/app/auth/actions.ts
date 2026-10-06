"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasAdminEnv } from "@/lib/supabase/admin";
import { hasEmailEnv, sendEmail } from "@/lib/email/send";
import { alreadyMemberEmail, confirmSignupEmail, resetPasswordEmail } from "@/lib/email/templates";
import { homeFor, safeNext, type Role } from "@/lib/auth/paths";

export type FormState =
  | { error?: string; message?: string; expired?: boolean; keepSession?: boolean }
  | undefined;

const text = (f: FormData, key: string) => String(f.get(key) ?? "").trim();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+()\-\s]{7,20}$/;

async function siteOrigin() {
  const h = await headers();
  return h.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

/**
 * Email + password sign-in. `variant` is the door that was used and decides WHO may use it:
 *   member = anyone, desk = staff or admin, admin = admins only.
 * Everyone then lands on their own home: member -> /account, staff -> /desk, admin -> /admin.
 */
export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = text(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const raw = text(formData, "variant");
  const variant: "member" | "desk" | "admin" = raw === "desk" || raw === "admin" ? raw : "member";
  // Only set when a protected page sent the person here; otherwise we send them to their own home.
  const requested = safeNext(text(formData, "next"), "");

  if (!EMAIL_RE.test(email) || !password) return { error: "Enter your email and password." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    if (error?.code === "email_not_confirmed") {
      return { error: "Please confirm your email first. Check your inbox for the link." };
    }
    return { error: "That email and password don't match." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("auth_user_id", data.user.id)
    .maybeSingle();

  if (!profile) {
    await supabase.auth.signOut({ scope: "local" });
    return { error: "Your profile isn't ready yet. Please speak to the front desk." };
  }
  const role = profile.role as Role;
  if (variant === "desk" && role === "member") {
    await supabase.auth.signOut({ scope: "local" });
    return { error: "This sign-in is for staff. Members sign in from the Member tab." };
  }
  if (variant === "admin" && role !== "admin") {
    await supabase.auth.signOut({ scope: "local" });
    return { error: "This sign-in is for administrators only." };
  }

  redirect(requested || homeFor(role));
}

/** Stops anyone from draining the email credits: asks the database whether this email may be sent right now. */
async function allowedToSend(admin: ReturnType<typeof createAdminClient>, kind: string, email: string) {
  const { data, error } = await admin.rpc("can_send_email", { p_kind: kind, p_email: email });
  if (error) {
    console.error("[email guard] run the email_guard SQL migration:", error.message);
    return true; // keep working if the migration hasn't been run yet
  }
  return data === true;
}

const RESET_MESSAGE =
  "If that email has an account, we've sent a reset link. It can take a minute to arrive: check your spam folder too.";

const SIGNUP_MESSAGE =
  "Check your email for a confirmation link. It can take a minute to arrive: check your spam folder too. If you already have an account with us, sign in instead.";

/**
 * New member account. We create the (unconfirmed) account ourselves and email the confirmation link through
 * Bosonware, so sign-ups don't depend on Supabase's built-in sender (which is slow and capped at a few per hour).
 * The name, phone and marketing choice ride along as metadata; a database trigger builds the profile once the email is confirmed.
 * The answer is the same whether or not the email already has an account, so nobody can probe who is a member.
 */
export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const fullName = text(formData, "full_name");
  const phone = text(formData, "phone");
  const email = text(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const marketing = formData.get("marketing") === "on"; // unticked by default: opt-in only

  if (fullName.length < 2) return { error: "Please enter your full name." };
  if (!PHONE_RE.test(phone)) return { error: "Enter a phone number we can reach you on." };
  if (!EMAIL_RE.test(email)) return { error: "Enter a valid email address." };
  if (password.length < 8) return { error: "Use a password of at least 8 characters." };
  if (!hasAdminEnv || !hasEmailEnv) {
    console.error("[signup] Missing SUPABASE_SECRET_KEY or BOSON_MAIL_API_KEY in .env.local");
    return { error: "Sign-up isn't set up on this server yet. Please speak to the front desk." };
  }

  const next = safeNext(text(formData, "next"), "/account");
  const origin = await siteOrigin();
  const admin = createAdminClient();

  // Does this email already have an account?
  const { data: status } = await admin.rpc("auth_email_status", { p_email: email });

  if (status?.exists && status.confirmed) {
    if (await allowedToSend(admin, "already_member", email)) {
      const mail = alreadyMemberEmail({ name: fullName, signInLink: `${origin}/login`, resetLink: `${origin}/forgot-password` });
      const sent = await sendEmail({ to: email, ...mail });
      if (!sent.ok) console.error("[signup] already-member email failed:", sent.error);
    }
    return { message: SIGNUP_MESSAGE };
  }

  if (!(await allowedToSend(admin, "signup", email))) return { message: SIGNUP_MESSAGE };

  // An earlier sign-up that was never confirmed: replace it, so the person can retry with a fresh link.
  if (status?.exists && !status.confirmed && status.id) await admin.auth.admin.deleteUser(status.id);

  const { data, error } = await admin.auth.admin.generateLink({
    type: "signup",
    email,
    password,
    options: { data: { full_name: fullName, phone, marketing_opt_in: marketing } },
  });
  if (error || !data?.properties?.hashed_token) {
    if (error?.code === "weak_password") return { error: "That password is too easy to guess. Try a longer one." };
    if (error?.code === "email_exists") return { message: SIGNUP_MESSAGE };
    console.error("[signup] generateLink failed:", error?.message);
    return { error: "We couldn't create your account. Please try again." };
  }

  const link = `${origin}/confirm-email?token_hash=${encodeURIComponent(data.properties.hashed_token)}&next=${encodeURIComponent(next)}`;
  const sent = await sendEmail({ to: email, ...confirmSignupEmail({ link, name: fullName }) });
  if (!sent.ok) {
    console.error("[signup] confirmation email failed:", sent.error, sent.code ?? "");
    await admin.rpc("release_email_slot", { p_kind: "signup", p_email: email });
    return { error: "We couldn't send your confirmation email just now. Please try again in a few minutes." };
  }
  return { message: SIGNUP_MESSAGE };
}

/** The page behind the confirmation email. Pressing the button (not just opening the page) uses the link up. */
export async function confirmEmail(_prev: FormState, formData: FormData): Promise<FormState> {
  const tokenHash = text(formData, "token_hash");
  const next = safeNext(text(formData, "next"), "/account");
  const EXPIRED =
    "This link has expired or was already used. If you've already confirmed, just sign in. Otherwise create your account again to get a new link.";
  if (!tokenHash) return { error: EXPIRED, expired: true };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type: "signup", token_hash: tokenHash });
  if (error) return { error: EXPIRED, expired: true };
  redirect(next);
}

/**
 * Step 1 of a reset. We ask Supabase for a one-time token, then email our OWN link to it
 * (through the Bosonware mail API). The link opens /reset-password directly, so it works on any device and
 * never depends on Supabase's redirect settings.
 * The answer is the same whether or not the email has an account, so nobody can probe who is a member.
 */
export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = text(formData, "email").toLowerCase();
  if (!EMAIL_RE.test(email)) return { error: "Enter a valid email address." };
  if (!hasAdminEnv || !hasEmailEnv) {
    console.error("[reset] Missing SUPABASE_SECRET_KEY or BOSON_MAIL_API_KEY in .env.local");
    return { error: "Password reset isn't set up on this server yet. Please speak to the front desk." };
  }

  const origin = await siteOrigin();
  const admin = createAdminClient();
  if (!(await allowedToSend(admin, "reset", email))) return { message: RESET_MESSAGE };
  const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email });

  if (!error && data?.properties?.hashed_token) {
    const link = `${origin}/reset-password?token_hash=${encodeURIComponent(data.properties.hashed_token)}`;
    const name = (data.user?.user_metadata?.full_name as string | undefined) ?? undefined;
    const mail = resetPasswordEmail({ link, name });
    const sent = await sendEmail({ to: email, ...mail });
    if (!sent.ok) {
      console.error("[reset] email failed:", sent.error);
      await admin.rpc("release_email_slot", { p_kind: "reset", p_email: email });
      return { error: "We couldn't send the email right now. Please try again in a few minutes." };
    }
  }
  return { message: RESET_MESSAGE };
}

/**
 * Step 2. The reset page posts the new password plus the one-time token from the email link.
 * The token is only used up here, when the person presses Save (not when the page opens), so
 * email scanners that pre-open links can't burn it.
 * With no token, a signed-in person can use the same page to change their own password.
 */
export async function updatePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const tokenHash = text(formData, "token_hash");
  const EXPIRED = "This reset link has expired or was already used. Please request a new one.";

  if (password.length < 8) return { error: "Use a password of at least 8 characters." };
  if (password !== confirm) return { error: "The two passwords don't match." };

  const supabase = await createClient();
  if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });
    if (error) return { error: EXPIRED, expired: true };
  } else {
    const { data } = await supabase.auth.getClaims();
    if (!data?.claims) return { error: EXPIRED, expired: true };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    // The link is now used up but the person is verified; keepSession lets them retry without it.
    if (error.code === "same_password") {
      return { error: "That's your current password. Choose a different one.", keepSession: true };
    }
    if (error.code === "weak_password") {
      return { error: "That password is too easy to guess. Try a longer one.", keepSession: true };
    }
    return { error: "We couldn't update your password. Please try again.", keepSession: true };
  }

  await supabase.auth.signOut({ scope: "local" });
  redirect("/login?notice=password_updated");
}

export async function signInWithGoogle(formData: FormData) {
  const next = safeNext(text(formData, "next"), "/account");
  const origin = await siteOrigin();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect("/login?error=oauth");
  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/");
}
