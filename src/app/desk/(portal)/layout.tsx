import "@/components/desk/desk.css";
import PortalShell from "@/components/auth/PortalShell";
import DeskNav from "@/components/desk/DeskNav";
import { requireRole } from "@/lib/auth/session";

export default async function DeskLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole(["staff", "admin"], "/desk/login");
  return (
    <PortalShell profile={profile} area="desk">
      <DeskNav />
      {children}
    </PortalShell>
  );
}
