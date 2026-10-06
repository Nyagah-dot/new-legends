import PortalShell from "@/components/auth/PortalShell";
import { requireRole } from "@/lib/auth/session";

export default async function DeskLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole(["staff", "admin"], "/desk/login");
  return <PortalShell profile={profile} area="desk">{children}</PortalShell>;
}
