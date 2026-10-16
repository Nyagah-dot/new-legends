/**
 * Coach data — one place to edit.
 * PLACEHOLDERS: names, blurbs, expertise and style tags are role-based stand-ins.
 * Replace them with the real people. Image files live in public/images/coaches/.
 */
export type Coach = {
  id: string;
  name: string;
  role: string;
  image: string;
  alt: string;
  blurb: string;
  expertise: string[];
  style: string[];
};

export const COACHES: Coach[] = [
  {
    id: "head-strength",
    name: "[ Coach name ]",
    role: "Head Strength Coach",
    image: "/images/coaches/male1.webp",
    alt: "Portrait of our head strength coach",
    blurb: "Builds programmes on progressive overload and clean technique.",
    expertise: ["Strength training", "Powerlifting", "Olympic lifting", "Programming"],
    style: ["Detail oriented", "Direct"],
  },
  {
    id: "on-ramp",
    name: "[ Coach name ]",
    role: "On-Ramp Lead",
    image: "/images/coaches/female.webp",
    alt: "Portrait of our on-ramp lead",
    blurb: "Takes complete beginners from nervous to confident in their first weeks.",
    expertise: ["Beginner onboarding", "Lifting technique", "Mobility", "Confidence building"],
    style: ["Supportive", "Patient"],
  },
  {
    id: "conditioning",
    name: "[ Coach name ]",
    role: "Conditioning Coach",
    image: "/images/coaches/male2.webp",
    alt: "Portrait of our conditioning coach",
    blurb: "Turns hard sessions into measurable fitness gains.",
    expertise: ["HIIT", "Endurance", "Fat loss", "Group conditioning"],
    style: ["High energy", "Results oriented"],
  },
  {
    id: "personal-trainer",
    name: "[ Coach name ]",
    role: "Personal Trainer",
    image: "/images/coaches/male3.webp",
    alt: "Portrait of our personal trainer",
    blurb: "One-to-one coaching built around your goal and your schedule.",
    expertise: ["1-to-1 coaching", "Muscle gain", "Weight loss", "Accountability"],
    style: ["Motivating", "Even keeled"],
  },
];
