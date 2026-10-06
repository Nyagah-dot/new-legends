import { requireRole } from "@/lib/auth/session";

export default async function DeskPage() {
  const profile = await requireRole(["staff", "admin"], "/desk/login");
  return (
    <>
      <h1>Front desk</h1>
      <p className="lead">Signed in as {profile.fullName || profile.email} ({profile.role}).</p>
      <section className="portal-card portal-soon">
        <h2>Coming next</h2>
        <p>Member search, sell a membership, check-in and freezes arrive in the desk patch.</p>
      </section>
    </>
  );
}
