import "@/components/desk/desk.css";
import PortalShell from "@/components/auth/PortalShell";
import DeskNav from "@/components/desk/DeskNav";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { nairobiToday } from "@/lib/timetable";

export default async function DeskLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole(["staff", "admin"], "/desk/login");
  const supabase = await createClient();
  const { count } = await supabase
    .from("membership_freezes")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  // Visitors booked for today's classes who haven't been checked in yet.
  const { data: vis } = await supabase.from("visitor_bookings").select("session_id").eq("status", "confirmed");
  const sessionIds = [...new Set(((vis ?? []) as unknown as { session_id: string }[]).map((v) => v.session_id))];
  let visitorsToday = 0;
  if (sessionIds.length > 0) {
    const { data: todays } = await supabase.from("class_sessions").select("id").in("id", sessionIds).eq("session_date", nairobiToday());
    const ids = new Set(((todays ?? []) as unknown as { id: string }[]).map((s) => s.id));
    visitorsToday = ((vis ?? []) as unknown as { session_id: string }[]).filter((v) => ids.has(v.session_id)).length;
  }
  return (
    <PortalShell profile={profile} area="desk">
      <DeskNav pendingFreezes={count ?? 0} visitorsToday={visitorsToday} />
      {children}
    </PortalShell>
  );
}
