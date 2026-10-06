import type { Metadata } from "next";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import ResetForm from "@/components/auth/ResetForm";
import { getAuthUserId } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Choose a new password — THE LEGENDS FITNESS" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string }>;
}) {
  const { token_hash: tokenHash } = await searchParams;
  const signedIn = Boolean(await getAuthUserId());

  // Opening this page does NOT use up the link: that only happens when the person presses Save.
  if (!tokenHash && !signedIn) {
    return (
      <AuthShell title="Reset your password">
        <p className="auth-error" role="alert">
          This page needs the link from your reset email. Request a new one and open it from your inbox.
        </p>
        <div className="auth-links"><Link href="/forgot-password">Send me a reset link</Link></div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Choose a new password"
      subtitle={
        tokenHash
          ? "Enter a new password below and press Save. You'll then sign in with it."
          : "Enter a new password for your account and press Save."
      }
    >
      <ResetForm tokenHash={tokenHash} />
    </AuthShell>
  );
}
