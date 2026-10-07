import { labelFor, toneFor } from "@/lib/desk";

export default function StatusPill({ state, daysLeft }: { state?: string | null; daysLeft?: number | null }) {
  return <span className={`pill pill-${toneFor(state, daysLeft)}`}>{labelFor(state, daysLeft)}</span>;
}
