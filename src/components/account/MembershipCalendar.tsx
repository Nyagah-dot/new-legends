import { addDays, nairobiToday } from "@/lib/timetable";
import type { CalDay } from "@/lib/account";

const DOW = ["M", "T", "W", "T", "F", "S", "S"];

function Month({ label, days, last }: { label: string; days: CalDay[]; last: string }) {
  const lead = (new Date(`${days[0].day}T00:00:00Z`).getUTCDay() + 6) % 7; // Monday first
  return (
    <div className="cal-month">
      <h3>{label}</h3>
      <div className="cal-grid">
        {DOW.map((d, i) => <div key={i} className="cal-dow">{d}</div>)}
        {Array.from({ length: lead }, (_, i) => <div key={`p${i}`} className="cal-pad" />)}
        {days.map((d) => {
          const cls = ["cal-day"];
          if (d.is_frozen) cls.push("frozen");
          else if (d.attended) cls.push("att");
          else if (d.is_past) cls.push("past");
          if (d.is_today) cls.push("today");
          if (d.day === last) cls.push("last");
          return <div key={d.day} className={cls.join(" ")} title={d.day}>{Number(d.day.slice(8))}</div>;
        })}
      </div>
    </div>
  );
}

/** Past days crossed off, visits ticked, frozen days hatched, today ringed, last day underlined in red. */
export default function MembershipCalendar({ days }: { days: CalDay[] }) {
  if (days.length === 0) return null;
  const today = nairobiToday();
  const from = addDays(today, -31);
  const to = addDays(today, 62);
  const last = days[days.length - 1].day;

  const months = new Map<string, CalDay[]>();
  for (const d of days) months.set(d.day.slice(0, 7), [...(months.get(d.day.slice(0, 7)) ?? []), d]);
  const entries = [...months.entries()].map(([key, list]) => ({
    key,
    list,
    label: new Date(`${key}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }),
    near: list.some((d) => d.day >= from && d.day <= to),
  }));
  const shown = entries.filter((e) => e.near);
  const hidden = entries.filter((e) => !e.near);

  return (
    <div>
      <div className="cal-legend">
        <span><i style={{ background: "var(--paper)", borderColor: "#c9c6bf" }} /> Day gone</span>
        <span><i style={{ background: "#e3f4e8", borderColor: "#1a8a3a" }} /> You trained</span>
        <span><i style={{ background: "repeating-linear-gradient(45deg,#e8eef7,#e8eef7 3px,#fff 3px,#fff 6px)", borderColor: "#4a6fa5" }} /> Frozen</span>
        <span><i style={{ background: "#fff", outline: "2px solid var(--red)" }} /> Today</span>
      </div>
      {shown.map((m) => <Month key={m.key} label={m.label} days={m.list} last={last} />)}
      {hidden.length > 0 && (
        <details className="cal-more">
          <summary>Show the other months ({hidden.length})</summary>
          {hidden.map((m) => <Month key={m.key} label={m.label} days={m.list} last={last} />)}
        </details>
      )}
    </div>
  );
}
