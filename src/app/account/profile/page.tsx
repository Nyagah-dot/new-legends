import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { MarketingForm, ProfileForm } from "@/components/account/ProfileForms";

type P = { full_name: string; phone: string | null; email: string | null; emergency_contact_name: string | null; emergency_contact_phone: string | null };

export default async function ProfilePage() {
  const me = await requireRole(["member", "staff", "admin"], "/login");
  const supabase = await createClient();
  const [pRes, cRes] = await Promise.all([
    supabase.from("profiles").select("full_name, phone, email, emergency_contact_name, emergency_contact_phone").eq("id", me.id).maybeSingle(),
    supabase.from("marketing_consents").select("granted").eq("profile_id", me.id).order("created_at", { ascending: false }).limit(1),
  ]);
  const p = pRes.data as unknown as P | null;
  const granted = ((cRes.data ?? []) as unknown as { granted: boolean }[])[0]?.granted ?? false;

  return (
    <>
      <h1>Profile</h1>
      <section className="ac-card">
        <h2>Your details</h2>
        <p className="ac-sub" style={{ marginBottom: 12 }}>Email: {p?.email ?? me.email} (to change it, ask at the front desk)</p>
        <ProfileForm initial={{ fullName: p?.full_name ?? "", phone: p?.phone ?? "", ecName: p?.emergency_contact_name ?? "", ecPhone: p?.emergency_contact_phone ?? "" }} />
      </section>
      <section className="ac-card">
        <h2>Emails</h2>
        {p?.email ? <MarketingForm granted={granted} /> : <p>Add an email at the front desk to receive updates.</p>}
      </section>
    </>
  );
}
