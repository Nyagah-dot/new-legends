import "@/components/account/account.css";
import PortalShell from "@/components/auth/PortalShell";
import AccountNav from "@/components/account/AccountNav";
import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole(["member", "staff", "admin"], "/login");
  // Google sign-ups arrive without a phone number; ask for it so the gym can reach them.
  let needsPhone = false;
  if (profile.role === "member") {
    const supabase = await createClient();
    const { data } = await supabase.from("profiles").select("phone").eq("id", profile.id).maybeSingle();
    needsPhone = !((data as unknown as { phone: string | null } | null)?.phone ?? "").trim();
  }
  return (
    <PortalShell profile={profile} area="account">
      <AccountNav />
      {needsPhone && (
        <div className="ac-banner" role="status">
          <strong>Complete your profile</strong>
          Add a phone number so the front desk can reach you about your membership.{" "}
          <Link href="/account/profile">Add it now</Link>
        </div>
      )}
      {children}
    </PortalShell>
  );
}
