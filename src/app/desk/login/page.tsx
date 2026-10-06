import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import LoginForm from "@/components/auth/LoginForm";
import { getCurrentProfile } from "@/lib/auth/session";
import { homeFor, safeNext } from "@/lib/auth/paths";

export const metadata: Metadata = { title: "Staff log in — THE LEGENDS FITNESS" };

/** /desk/login = Front desk tab.  /desk/login?as=admin = Admin tab. */
export default async function DeskLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; as?: string }>;
}) {
  const sp = await searchParams;
  const door = sp.as === "admin" ? "admin" : "desk";

  const profile = await getCurrentProfile();
  if (profile) {
    if (door === "admin" && profile.role === "admin") redirect(safeNext(sp.next, homeFor(profile.role)));
    if (door === "desk" && profile.role !== "member") redirect(safeNext(sp.next, homeFor(profile.role)));
    // Otherwise (wrong role for this door) fall through so they can sign in with a different account.
  }

  return (
    <AuthShell
      tabs={door}
      title={door === "admin" ? "Admin log in" : "Front desk log in"}
      subtitle={door === "admin" ? "Administrators only." : "Check-ins, sales and freezes. Staff only."}
    >
      <LoginForm variant={door} next={safeNext(sp.next, "")} />
    </AuthShell>
  );
}
