import { createClient } from "@supabase/supabase-js";

/**
 * Cookie-free Supabase client for PUBLIC data only (timetable, prices). It never reads cookies and
 * never caches, so a change made in the admin area shows on the website on the very next page load.
 * Returns null if Supabase isn't configured yet.
 */
export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
}
