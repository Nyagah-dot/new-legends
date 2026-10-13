import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient, hasAdminEnv } from "@/lib/supabase/admin";
import { sendDueReminders } from "@/lib/reminders";

export const dynamic = "force-dynamic";

/**
 * The daily job. Creates the coming weeks' class dates and sends expiry reminders.
 * Call it once a day with the secret: GET /api/cron/reminders?key=YOUR_CRON_SECRET
 * (or send the header "Authorization: Bearer YOUR_CRON_SECRET").
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return NextResponse.json({ ok: false, error: "CRON_SECRET is not set." }, { status: 503 });
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? req.nextUrl.searchParams.get("key") ?? "";
  if (given !== secret) return NextResponse.json({ ok: false, error: "Not allowed." }, { status: 401 });
  if (!hasAdminEnv) return NextResponse.json({ ok: false, error: "Server keys missing." }, { status: 503 });

  const db = createAdminClient();
  const gen = await db.rpc("cron_generate_sessions", { p_days_ahead: 28 });
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;
  const reminders = await sendDueReminders(db, siteUrl);
  return NextResponse.json({
    ok: !gen.error && !reminders.error,
    sessionsCreated: gen.error ? null : gen.data,
    sessionsError: gen.error?.message ?? null,
    reminders,
  });
}
