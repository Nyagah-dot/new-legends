import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseEnv } from "./env";
import { isUnder } from "@/lib/auth/paths";

/**
 * Runs on every request (see src/proxy.ts):
 *  1. refreshes the login session so it doesn't expire mid-visit
 *  2. sends signed-out visitors away from /account, /desk and /admin
 * This is only the first, quick check. Each protected page re-checks the user's
 * role on the server, and the database enforces access again with row-level security.
 */
export async function updateSession(request: NextRequest) {
  if (!hasSupabaseEnv) return NextResponse.next({ request }); // Supabase not set up yet: public site still works

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options?: CookieOptions }[],
          headers?: Record<string, string>
        ) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          if (headers) Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    }
  );

  // Do not add code between createServerClient and getClaims().
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);

  const path = request.nextUrl.pathname;
  const isStaffArea = (isUnder(path, "/desk") && path !== "/desk/login") || isUnder(path, "/admin");
  const isMemberArea = isUnder(path, "/account");

  if (!signedIn && (isStaffArea || isMemberArea)) {
    const url = request.nextUrl.clone();
    url.pathname = isStaffArea ? "/desk/login" : "/login";
    url.search = "";
    url.searchParams.set("next", path + request.nextUrl.search);
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c)); // keep any refreshed cookies
    return redirect;
  }

  return response;
}
