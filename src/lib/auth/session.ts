import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { homeFor, type Role } from "./paths";

export type Profile = {
  id: string;
  authUserId: string;
  fullName: string;
  email: string | null;
  role: Role;
  memberNo: number;
};

/** The signed-in user's verified auth id, or null. Uses getClaims(), which checks the token signature. */
export const getAuthUserId = cache(async (): Promise<string | null> => {
  if (!hasSupabaseEnv) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return (data?.claims?.sub as string | undefined) ?? null;
});

/** The signed-in user's profile row (RLS lets a user read only their own). Null if signed out or no profile yet. */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const uid = await getAuthUserId();
  if (!uid) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, member_no")
    .eq("auth_user_id", uid)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    authUserId: uid,
    fullName: data.full_name ?? "",
    email: data.email ?? null,
    role: data.role as Role,
    memberNo: data.member_no,
  };
});

/**
 * Call this at the top of every protected page, layout and server action.
 * Signed out -> loginPath. Wrong role -> that role's own home (never a loop).
 */
export async function requireRole(allowed: Role[], loginPath: string): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect(loginPath);
  if (!allowed.includes(profile.role)) redirect(homeFor(profile.role));
  return profile;
}
