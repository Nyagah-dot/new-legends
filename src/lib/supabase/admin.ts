import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client with the SECRET key: it bypasses row-level security.
 * SERVER ONLY. Import it from server actions / route handlers, never from a component with "use client".
 */
const secretKey = () => process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

export const hasAdminEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && secretKey());

export function createAdminClient() {
  const key = secretKey();
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY.");
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}