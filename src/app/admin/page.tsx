import Link from "next/link";
import { requireRole } from "@/lib/auth/session";

export default async function AdminPage() {
  await requireRole(["admin"], "/desk/login?as=admin");
  return (
    <>
      <h1>Admin</h1>
      <p className="lead">Run the gym from here.</p>
      <div className="adm-cards">
        <Link href="/admin/payments">
          <h2>Payments</h2>
          <p>Accept M-Pesa payments so members&rsquo; memberships become active.</p>
        </Link>
        <Link href="/desk/members">
          <h2>Members</h2>
          <p>Search everyone, see who is expiring, and open a member&rsquo;s history.</p>
        </Link>
        <Link href="/admin/classes">
          <h2>Classes</h2>
          <p>Add, edit or remove the weekly classes that make up the timetable.</p>
        </Link>
        <Link href="/admin/sessions">
          <h2>Dates</h2>
          <p>Cancel or restore a single day, and create the coming weeks&rsquo; dates.</p>
        </Link>
      </div>
      <section className="portal-card portal-soon" style={{ marginTop: 20 }}>
        <h2>Coming next</h2>
        <p>Members and expiry list, plans and prices, roles and email lists arrive in later patches.</p>
      </section>
    </>
  );
}
