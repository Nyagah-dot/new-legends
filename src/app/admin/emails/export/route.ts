import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { statusMap } from "@/lib/desk";
import { audienceFilter, type AudienceRow } from "../audience";

export const dynamic = "force-dynamic";

const q = (s: string | null | undefined) => `"${String(s ?? "").replace(/"/g, '""')}"`;

export async function GET(req: NextRequest) {
  const me = await getCurrentProfile();
  if (!me || me.role !== "admin") return new NextResponse("Not allowed", { status: 403 });
  const filter = req.nextUrl.searchParams.get("filter") ?? "all";
  const supabase = await createClient();
  const { data } = await supabase.from("marketing_audience").select("email, profile_id, full_name, source, consented_at").order("email");
  const rows = (data ?? []) as unknown as AudienceRow[];
  const st = await statusMap(supabase, rows.map((r) => r.profile_id).filter((x): x is string => Boolean(x)));
  const list = audienceFilter(rows, st, filter);
  const lines = ["email,name,membership,consented_on"].concat(
    list.map((r) => [q(r.email), q(r.full_name), q(r.label), q(r.consented_at?.slice(0, 10))].join(","))
  );
  return new NextResponse(lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="legends-marketing-list-${filter}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
