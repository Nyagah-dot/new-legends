import { requireRole } from "@/lib/auth/session";
import ClassForm from "@/components/admin/ClassForm";

export default async function NewClassPage() {
  await requireRole(["admin"], "/desk/login?as=admin");
  return (
    <>
      <h1>Add a class</h1>
      <p className="lead">It appears on the website and gets dates for the next four weeks.</p>
      <ClassForm />
    </>
  );
}
