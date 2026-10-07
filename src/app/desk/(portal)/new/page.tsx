import { requireRole } from "@/lib/auth/session";
import WalkInForm from "@/components/desk/WalkInForm";

export default async function NewWalkInPage() {
  await requireRole(["staff", "admin"], "/desk/login");
  return (
    <>
      <h1>Add a walk-in</h1>
      <p className="lead">
        For someone who pays at the desk. Take an email if you can: if they later sign up online with it, their account joins this record automatically.
      </p>
      <div className="dk-card">
        <WalkInForm />
      </div>
    </>
  );
}
