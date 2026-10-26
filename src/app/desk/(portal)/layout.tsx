import "@/components/desk/desk.css";
import PortalShell from "@/components/auth/PortalShell";
import DeskNav from "@/components/desk/DeskNav";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function DeskLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole(["staff", "admin"], "/desk/login");
  const supabase = await createClient();
  const { count } = await supabase
    .from("membership_freezes")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  return (
    <PortalShell profile={profile} area="desk">
      <DeskNav pendingFreezes={count ?? 0} />
      {children}
    </PortalShell>
  );
}
