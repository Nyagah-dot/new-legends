import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import ClassForm from "@/components/admin/ClassForm";
import { isUuid, type ClassRow } from "@/lib/timetable";
import type { TrainerOption } from "@/lib/trainers";

export default async function EditClassPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["admin"], "/desk/login?as=admin");
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const supabase = await createClient();
  const { data } = await supabase.from("classes").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const { data: tData } = await supabase.from("trainers").select("id, full_name, is_active").order("sort_order").order("full_name");

  return (
    <>
      <h1>Edit class</h1>
      <p className="lead">Saving rebuilds this class&rsquo;s upcoming dates. Dates you cancelled stay cancelled.</p>
      <ClassForm initial={data as ClassRow} trainers={(tData ?? []) as unknown as TrainerOption[]} />
    </>
  );
}
