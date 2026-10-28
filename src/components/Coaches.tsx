import CoachesHero from "./CoachesHero";
import CoachesStatement from "./CoachesStatement";
import CoachesGrid from "./CoachesGrid";
import CoachAvailability from "./CoachAvailability";
import { COACHES } from "@/lib/coaches";
import { loadOpenSlots, loadPublicCoaches, toGridCoach } from "@/lib/publicCoaches";

/**
 * Video header + side card  ->  reading statement  ->  coach grid  ->  "Available this week".
 * Coaches come from Admin -> Coaches. If none are set up yet (or the database can't be reached),
 * the grid falls back to the placeholder list in src/lib/coaches.ts and the availability section is hidden.
 */
export default async function Coaches() {
  const live = await loadPublicCoaches();
  const slots = live.length > 0 ? await loadOpenSlots(7) : [];

  return (
    <>
      <CoachesHero />
      <CoachesStatement />
      <CoachesGrid coaches={live.length > 0 ? live.map(toGridCoach) : COACHES} />
      {live.length > 0 && <CoachAvailability coaches={live} slots={slots} />}
    </>
  );
}
