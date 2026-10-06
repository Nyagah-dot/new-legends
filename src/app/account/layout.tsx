import PortalShell from "@/components/auth/PortalShell";
import { requireRole } from "@/lib/auth/session";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole(["member", "staff", "admin"], "/login");
  return <PortalShell profile={profile} area="account">{children}</PortalShell>;
}
