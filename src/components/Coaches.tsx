import CoachesHero from "./CoachesHero";
import CoachesStatement from "./CoachesStatement";
import CoachesGrid from "./CoachesGrid";

/** Video header + side card  ->  reading statement  ->  coach grid. */
export default function Coaches() {
  return (
    <>
      <CoachesHero />
      <CoachesStatement />
      <CoachesGrid />
    </>
  );
}
