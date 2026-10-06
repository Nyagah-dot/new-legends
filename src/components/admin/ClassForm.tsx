"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveClass } from "@/app/admin/classes/actions";
import SubmitButton from "@/components/auth/SubmitButton";
import { DAY_SHORT, inputTime, type ClassRow } from "@/lib/timetable";

export default function ClassForm({ initial }: { initial?: ClassRow }) {
  const [state, action] = useActionState(saveClass, undefined);
  const days = initial?.weekdays ?? [];

  return (
    <form action={action} className="adm-form">
      {initial && <input type="hidden" name="id" value={initial.id} />}

      <label className="f">
        Class name
        <input name="name" type="text" defaultValue={initial?.name ?? ""} placeholder="e.g. Strength" required />
      </label>

      <fieldset style={{ border: 0 }}>
        <legend className="f" style={{ fontFamily: "var(--font-mono)", fontSize: ".72rem", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 8 }}>
          Days
        </legend>
        <div className="adm-days">
          {DAY_SHORT.map((label, i) => (
            <label key={label} className="adm-day">
              <input type="checkbox" name="days" value={i + 1} defaultChecked={days.includes(i + 1)} />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="adm-grid2">
        <label className="f">
          Starts
          <input name="starts_at" type="time" defaultValue={initial ? inputTime(initial.starts_at) : "06:00"} required />
        </label>
        <label className="f">
          Ends
          <input name="ends_at" type="time" defaultValue={initial ? inputTime(initial.ends_at) : "07:00"} required />
        </label>
      </div>

      <div className="adm-grid2">
        <label className="f">
          Coach (optional)
          <input name="coach_name" type="text" defaultValue={initial?.coach_name ?? ""} />
        </label>
        <label className="f">
          Spaces (optional)
          <input name="capacity" type="number" min={1} max={500} defaultValue={initial?.capacity ?? ""} />
          <span className="hint">Leave empty for no limit.</span>
        </label>
      </div>

      <label className="f">
        Short description (optional)
        <textarea name="description" rows={2} defaultValue={initial?.description ?? ""} />
      </label>

      <div className="adm-checks">
        <label className="adm-check">
          <input type="checkbox" name="bookable" defaultChecked={initial?.bookable ?? true} />
          <span>Members book a space<small>Untick for sessions where people just turn up.</small></span>
        </label>
        <label className="adm-check">
          <input type="checkbox" name="ladies_only" defaultChecked={initial?.ladies_only ?? false} />
          <span>Ladies only<small>Shown in red on the public timetable.</small></span>
        </label>
        <label className="adm-check">
          <input type="checkbox" name="is_active" defaultChecked={initial?.is_active ?? true} />
          <span>Show on the timetable<small>Untick to hide it without deleting.</small></span>
        </label>
      </div>

      {state?.error && <p className="auth-error" role="alert">{state.error}</p>}

      <div className="adm-actions">
        <SubmitButton>{initial ? "Save changes" : "Add class"}</SubmitButton>
        <Link href="/admin/classes" className="btn btn-ghost">Cancel</Link>
      </div>
    </form>
  );
}
