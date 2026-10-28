import { requireRole } from "@/lib/auth/session";
import TrainerForm from "@/components/admin/TrainerForm";

export default async function NewTrainerPage() {
  await requireRole(["admin"], "/desk/login?as=admin");
  return (
    <>
      <h1>Add a trainer</h1>
      <p className="lead">After you save, you&rsquo;ll set their weekly hours.</p>
      <TrainerForm />
    </>
  );
}
