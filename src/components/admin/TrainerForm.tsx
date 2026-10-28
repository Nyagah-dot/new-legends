"use client";

import "./trainers.css";
import Link from "next/link";
import { useActionState } from "react";
import { saveTrainer } from "@/app/admin/trainers/actions";
import SubmitButton from "@/components/auth/SubmitButton";
import { COACH_IMG_DIR, SLOT_CHOICES, type TrainerRow } from "@/lib/trainers";

export default function TrainerForm({ initial }: { initial?: TrainerRow }) {
  const [state, action] = useActionState(saveTrainer, undefined);

  return (
    <form action={action} className="adm-form" style={{ marginBottom: 24 }}>
      {initial && <input type="hidden" name="id" value={initial.id} />}

      <div className="adm-grid2">
        <label className="f">
          Name
          <input name="full_name" type="text" defaultValue={initial?.full_name ?? ""} maxLength={60} required />
        </label>
        <label className="f">
          Title (optional)
          <input name="title" type="text" defaultValue={initial?.title ?? ""} placeholder="e.g. Personal Trainer" maxLength={60} />
        </label>
      </div>

      <div className="adm-grid2">
        <label className="f">
          Price per 1-to-1 session (KES)
          <input name="session_price_kes" type="number" min={0} max={1000000} defaultValue={initial?.session_price_kes ?? ""} required />
        </label>
        <label className="f">
          Session length
          <select name="slot_minutes" defaultValue={String(initial?.slot_minutes ?? 60)}>
            {SLOT_CHOICES.map((m) => (
              <option key={m} value={m}>{m} minutes</option>
            ))}
          </select>
        </label>
      </div>

      <label className="f">
        Areas of expertise (optional)
        <input name="expertise" type="text" defaultValue={initial?.expertise?.join(", ") ?? ""} placeholder="e.g. Strength training, Weight loss, Mobility" />
        <span className="hint">Separate with commas. Up to 8.</span>
      </label>

      <label className="f">
        Short bio (optional)
        <textarea name="bio" rows={3} defaultValue={initial?.bio ?? ""} maxLength={400} />
      </label>

      <div className="adm-grid2">
        <label className="f">
          Photo file name (optional)
          <input name="photo" type="text" defaultValue={initial?.photo ?? ""} placeholder="e.g. male3.webp" />
          <span className="hint">A file already inside public/images/coaches. Photos are added to the project, not uploaded here.</span>
        </label>
        <label className="f">
          Order on the website
          <input name="sort_order" type="number" min={0} max={1000} defaultValue={initial?.sort_order ?? 0} />
          <span className="hint">Smallest number comes first.</span>
        </label>
      </div>

      {initial?.photo && (
        <div className="tr-photo-row">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="tr-photo" src={`${COACH_IMG_DIR}${initial.photo}`} alt="" />
          <span className="hint" style={{ color: "var(--steel)", fontSize: ".85rem" }}>
            Photo preview. If it is blank, the file name doesn&rsquo;t exist in public/images/coaches.
          </span>
        </div>
      )}

      <div className="adm-checks">
        <label className="adm-check">
          <input type="checkbox" name="is_active" defaultChecked={initial?.is_active ?? true} />
          <span>Active<small>Untick to hide this trainer from clients without deleting them.</small></span>
        </label>
      </div>

      {state?.error && <p className="auth-error" role="alert">{state.error}</p>}

      <div className="adm-actions">
        <SubmitButton>{initial ? "Save changes" : "Add trainer"}</SubmitButton>
        <Link href="/admin/trainers" className="btn btn-ghost">Cancel</Link>
      </div>
    </form>
  );
}
