import type { StatusRow } from "@/lib/desk";

export type AudienceRow = { email: string; profile_id: string | null; full_name: string | null; source: string | null; consented_at: string };
export const FILTERS = [
  { value: "all", label: "Everyone" },
  { value: "active", label: "Active members" },
  { value: "expired", label: "Expired members" },
  { value: "none", label: "Never a member" },
] as const;

/** Adds a membership label to each person and keeps only those matching the filter. */
export function audienceFilter(rows: AudienceRow[], st: Map<string, StatusRow>, filter: string) {
  const out = rows.map((r) => {
    const s = r.profile_id ? st.get(r.profile_id) : undefined;
    const state = s?.state ?? "none";
    const group = state === "active" || state === "frozen" || state === "upcoming" ? "active" : state === "expired" || state === "cancelled" ? "expired" : "none";
    return { ...r, group, label: s ? `${s.plan_name} (${state})` : "No membership" };
  });
  return filter === "active" || filter === "expired" || filter === "none" ? out.filter((r) => r.group === filter) : out;
}
