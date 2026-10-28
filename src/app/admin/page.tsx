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
        <Link href="/admin/visitors">
          <h2>Single classes</h2>
          <p>Accept payments from visitors who booked one class, and cancel a booking if needed.</p>
        </Link>
        <Link href="/admin/classes">
          <h2>Classes</h2>
          <p>Add, edit or remove the weekly classes that make up the timetable.</p>
        </Link>
        <Link href="/admin/trainers">
          <h2>Trainers</h2>
          <p>Add trainers, set their weekly hours and time off, and link each class to the trainer who leads it.</p>
        </Link>
        <Link href="/admin/sessions">
          <h2>Dates</h2>
          <p>Cancel or restore a single day, and create the coming weeks&rsquo; dates.</p>
        </Link>
        <Link href="/admin/people">
          <h2>People and roles</h2>
          <p>Make someone front desk staff or an admin.</p>
        </Link>
        <Link href="/admin/emails">
          <h2>Emails</h2>
          <p>Send expiry reminders, and download the list of people who agreed to marketing emails.</p>
        </Link>
        <Link href="/admin/settings">
          <h2>Settings</h2>
          <p>Plans and prices, the M-Pesa Paybill details, visitor spots and the freeze rules.</p>
        </Link>
      </div>
      <p style={{ marginTop: 20, fontSize: ".9rem", color: "var(--steel)" }}>To cancel or refund a membership, open the member (Members) and use the admin box on their page.</p>
    </>
  );
}
