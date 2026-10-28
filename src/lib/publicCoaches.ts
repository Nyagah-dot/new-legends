import { createPublicClient } from "@/lib/supabase/public";
import { COACH_IMG_DIR } from "@/lib/trainers";
import type { Coach } from "@/lib/coaches";

/** What the database lets the public see about a coach (never login links or private notes). */
export type PublicCoach = {
  id: string;
  full_name: string;
  title: string | null;
  bio: string | null;
  photo: string | null;
  expertise: string[];
  session_price_kes: number;
  slot_minutes: number;
};

/** One open 1-to-1 start time. `starts_at` looks like "06:00:00". */
export type OpenSlot = { trainer_id: string; slot_date: string; starts_at: string; ends_at: string };

/** Active coaches, in the order set in Admin. Empty if the database is unreachable or the patch 25 SQL hasn't been run. */
export async function loadPublicCoaches(): Promise<PublicCoach[]> {
  const supabase = createPublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("public_coaches");
  if (error) {
    console.error("[public coaches]", error.message);
    return [];
  }
  return (data ?? []) as unknown as PublicCoach[];
}

/** Open times over the next `days` days (1 to 14), Nairobi time. */
export async function loadOpenSlots(days = 7): Promise<OpenSlot[]> {
  const supabase = createPublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("coach_open_slots", { p_days: days });
  if (error) {
    console.error("[open slots]", error.message);
    return [];
  }
  return (data ?? []) as unknown as OpenSlot[];
}

/** Shapes a database coach for the existing coaches grid. An empty image means "show initials". */
export function toGridCoach(c: PublicCoach): Coach {
  return {
    id: c.id,
    name: c.full_name,
    role: c.title?.trim() || "Coach",
    image: c.photo ? `${COACH_IMG_DIR}${c.photo}` : "",
    alt: `Portrait of ${c.full_name}`,
    blurb: c.bio ?? "",
    expertise: c.expertise ?? [],
    style: [],
  };
}
