/**
 * Colour-codes class names in the timetable.
 * Palette is built from the site theme: tomato red, amber, cream and a calm sage
 * (the one cool tone, so neighbouring classes stay easy to tell apart on dark).
 *
 * Class names come from the database (Admin -> Classes), so we match by keyword
 * first, then fall back to a stable hash so the same name ALWAYS gets the same colour.
 */
export const TONE = {
  red: "#F04438",
  amber: "#F7B43A",
  cream: "#F1EFEA",
  sage: "#7BD3B8",
} as const;

const PALETTE = [TONE.red, TONE.amber, TONE.cream, TONE.sage];

const RULES: [RegExp, string][] = [
  [/crossfit|strength|lift|power|barbell|hyrox|weights?|squat|deadlift/i, TONE.red],
  [/hiit|cardio|conditioning|box|fight|mma|kick|spin|cycle|run|circuit|burn|bootcamp/i, TONE.amber],
  [/yoga|pilates|mobility|stretch|core|recover|flow|barre|stability/i, TONE.sage],
  [/open|gym floor|free|fitness/i, TONE.cream],
];

export function classTone(name: string): string {
  for (const [re, colour] of RULES) if (re.test(name)) return colour;
  let h = 0;
  for (const ch of name.toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
