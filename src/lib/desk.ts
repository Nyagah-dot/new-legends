import type { createClient } from "@/lib/supabase/server";

export type Db = Awaited<ReturnType<typeof createClient>>;

export type MemberRow = { id: string; member_no: number; full_name: string; email: string | null; phone: string | null; role: string };
export type StatusRow = {
  member_id: string; plan_name: string; state: string; ends_on: string; days_left: number; paid_until: string | null;
};

export const lfNo = (n: number) => `LF-${String(n).padStart(4, "0")}`;

/** green = fine to train, amber = look closer, red = not valid, grey = no membership */
export type Tone = "ok" | "warn" | "bad" | "none";

export function toneFor(state?: string | null, daysLeft?: number | null): Tone {
  if (!state) return "none";
  if (state === "active") return (daysLeft ?? 99) <= 7 ? "warn" : "ok";
  if (state === "frozen" || state === "upcoming") return "warn";
  return "bad"; // expired, cancelled
}

export function labelFor(state?: string | null, daysLeft?: number | null): string {
  if (!state) return "No membership";
  if (state === "active") return `Active · ${daysLeft ?? 0}d left`;
  if (state === "frozen") return "Frozen";
  if (state === "upcoming") return "Starts soon";
  if (state === "expired") return "Expired";
  return "Cancelled";
}

/** Payment methods the desk can record. M-Pesa/card/bank need a reference (the transaction code). */
export const METHODS = [
  { value: "cash", label: "Cash", needsRef: false },
  { value: "mpesa_paybill", label: "M-Pesa", needsRef: true },
  { value: "card", label: "Card", needsRef: true },
  { value: "bank_transfer", label: "Bank transfer", needsRef: true },
  { value: "other", label: "Other", needsRef: false },
] as const;

/** Makes a search term safe to put inside a PostgREST filter. */
export function cleanQuery(q: string): string {
  return q.replace(/[,()%*\\"'`:;]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
}

export function fmtClock(ts: string | null): string {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString("en-GB", { timeZone: "Africa/Nairobi", hour: "2-digit", minute: "2-digit" });
}

export async function searchMembers(supabase: Db, q: string): Promise<MemberRow[]> {
  const term = cleanQuery(q);
  if (!term) return [];
  const conds = [`full_name.ilike.%${term}%`, `email.ilike.%${term}%`, `phone.ilike.%${term}%`];
  const digits = term.replace(/\D/g, "");
  if (digits.length >= 4) conds.push(`phone.ilike.%${digits}%`);
  const m = term.match(/^(?:lf-?)?(\d{1,6})$/i);
  if (m) conds.push(`member_no.eq.${Number(m[1])}`);
  const { data } = await supabase
    .from("profiles")
    .select("id, member_no, full_name, email, phone, role")
    .or(conds.join(","))
    .order("full_name")
    .limit(25);
  return (data ?? []) as unknown as MemberRow[];
}

export async function statusMap(supabase: Db, ids: string[]): Promise<Map<string, StatusRow>> {
  const map = new Map<string, StatusRow>();
  if (ids.length === 0) return map;
  const { data } = await supabase
    .from("member_status")
    .select("member_id, plan_name, state, ends_on, days_left, paid_until")
    .in("member_id", ids);
  for (const r of (data ?? []) as unknown as StatusRow[]) map.set(r.member_id, r);
  return map;
}
