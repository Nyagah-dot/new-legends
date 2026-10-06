import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import LoginForm from "@/components/auth/LoginForm";
import { signInWithGoogle } from "@/app/auth/actions";
import { getCurrentProfile } from "@/lib/auth/session";
import { homeFor, safeNext } from "@/lib/auth/paths";

export const metadata: Metadata = { title: "Log in — THE LEGENDS FITNESS" };

const ERRORS: Record<string, string> = {
  link: "That link is invalid or has expired. Please request a new one.",
  oauth: "Google sign-in didn't complete. Please try again.",
};
const NOTICES: Record<string, string> = {
  password_updated: "Your password has been updated. Sign in with your new password.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; notice?: string }>;
}) {
  const sp = await searchParams;
  const profile = await getCurrentProfile();
  if (profile) redirect(safeNext(sp.next, homeFor(profile.role)));

  const next = safeNext(sp.next, "");
  const showGoogle = process.env.NEXT_PUBLIC_ENABLE_GOOGLE === "true";

  return (
    <AuthShell tabs="member" title="Member log in" subtitle="See your membership, days left and bookings.">
      {sp.notice && NOTICES[sp.notice] && <p className="auth-ok" role="status">{NOTICES[sp.notice]}</p>}
      {sp.error && ERRORS[sp.error] && <p className="auth-error" role="alert">{ERRORS[sp.error]}</p>}
      <LoginForm variant="member" next={next} />
      {showGoogle && (
        <form action={signInWithGoogle} className="auth-google">
          <input type="hidden" name="next" value={next} />
          <button type="submit" className="btn btn-ghost">Continue with Google</button>
        </form>
      )}
    </AuthShell>
  );
}
