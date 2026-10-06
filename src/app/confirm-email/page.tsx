import type { Metadata } from "next";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import ConfirmForm from "@/components/auth/ConfirmForm";
import { safeNext } from "@/lib/auth/paths";

export const metadata: Metadata = { title: "Confirm your email — THE LEGENDS FITNESS" };

export default async function ConfirmEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; next?: string }>;
}) {
  const sp = await searchParams;
  const tokenHash = sp.token_hash ?? "";

  if (!tokenHash) {
    return (
      <AuthShell title="Confirm your email">
        <p className="auth-error" role="alert">
          This page needs the link from your confirmation email. Open it from your inbox, or create your account again to get a new one.
        </p>
        <div className="auth-links"><Link href="/signup">Create account</Link><Link href="/login">Sign in</Link></div>
      </AuthShell>
    );
  }

  // Opening this page does NOT use up the link: that only happens when the person presses the button.
  return (
    <AuthShell title="Confirm your email" subtitle="One last step. Press the button to finish creating your account.">
      <ConfirmForm tokenHash={tokenHash} next={safeNext(sp.next, "/account")} />
    </AuthShell>
  );
}
