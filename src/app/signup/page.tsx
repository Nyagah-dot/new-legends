import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import SignupForm from "@/components/auth/SignupForm";
import { getCurrentProfile } from "@/lib/auth/session";
import { homeFor, safeNext } from "@/lib/auth/paths";

export const metadata: Metadata = { title: "Create account — THE LEGENDS FITNESS" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next, "");
  const profile = await getCurrentProfile();
  if (profile) redirect(safeNext(sp.next, homeFor(profile.role)));

  return (
    <AuthShell title="Create your account" subtitle="One account for your membership, bookings and receipts.">
      <SignupForm next={next} />
    </AuthShell>
  );
}
