import "@/components/admin/admin.css";
import PortalShell from "@/components/auth/PortalShell";
import AdminNav from "@/components/admin/AdminNav";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole(["admin"], "/desk/login?as=admin");
  const supabase = await createClient();
  const { count } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("status", "payment_claimed");

  const { count: visitorCount } = await supabase
    .from("visitor_bookings")
    .select("id", { count: "exact", head: true })
    .eq("status", "payment_claimed");

  return (
    <PortalShell profile={profile} area="admin">
      <AdminNav pending={count ?? 0} visitorsPending={visitorCount ?? 0} />
      {children}
    </PortalShell>
  );
}
