"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { requestFreeze } from "@/app/account/actions";
import SubmitButton from "@/components/auth/SubmitButton";

export default function FreezeForm({
  membershipId, minStart, minDays, maxDays,
}: { membershipId: string; minStart: string; minDays: number; maxDays: number }) {
  const [state, action] = useActionState(requestFreeze, undefined);
  const [medical, setMedical] = useState(false);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  return (
    <form action={action} ref={ref} className="ac-form">
      <input type="hidden" name="membership_id" value={membershipId} />
      <label>
        First day of the freeze
        <input name="starts_on" type="date" min={minStart} required />
      </label>
      <label>
        How many days?
        <input name="days" type="number" min={Math.max(minDays, 1)} max={Math.max(maxDays, 1)} defaultValue={Math.max(minDays, 7)} required />
        <span className="hint">You&rsquo;re active again on the day after the freeze ends. Your end date moves by the same number of days.</span>
      </label>
      <label className="chk">
        <input name="medical" type="checkbox" checked={medical} onChange={(e) => setMedical(e.target.checked)} />
        <span>This is a medical freeze (an admin reviews it, and no fee applies).</span>
      </label>
      {medical && (
        <label>
          Short note
          <input name="medical_note" type="text" placeholder="e.g. doctor's note available" required />
          <span className="hint">Please don&rsquo;t write a diagnosis.</span>
        </label>
      )}
      {state && <p className={state.ok ? "ac-ok" : "auth-error"} role="status">{state.message}</p>}
      <SubmitButton>Request freeze</SubmitButton>
    </form>
  );
}
