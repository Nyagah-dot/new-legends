"use client";

import { useActionState } from "react";
import { setMarketing, updateProfile } from "@/app/account/actions";
import SubmitButton from "@/components/auth/SubmitButton";

type P = { fullName: string; phone: string; ecName: string; ecPhone: string };

export function ProfileForm({ initial }: { initial: P }) {
  const [state, action] = useActionState(updateProfile, undefined);
  return (
    <form action={action} className="ac-form">
      <label>
        Full name
        <input name="full_name" type="text" defaultValue={initial.fullName} required autoComplete="name" />
      </label>
      <label>
        Phone
        <input name="phone" type="tel" defaultValue={initial.phone} required autoComplete="tel" placeholder="07XX XXX XXX" />
      </label>
      <label>
        Emergency contact name (optional)
        <input name="ec_name" type="text" defaultValue={initial.ecName} />
      </label>
      <label>
        Emergency contact phone (optional)
        <input name="ec_phone" type="tel" defaultValue={initial.ecPhone} />
      </label>
      {state && <p className={state.ok ? "ac-ok" : "auth-error"} role="status">{state.message}</p>}
      <SubmitButton>Save profile</SubmitButton>
    </form>
  );
}

export function MarketingForm({ granted }: { granted: boolean }) {
  const [state, action] = useActionState(setMarketing, undefined);
  return (
    <form action={action} className="ac-form">
      <label className="chk">
        <input name="granted" type="checkbox" defaultChecked={granted} />
        <span>Send me offers and updates by email. We&rsquo;ll always send receipts and membership reminders.</span>
      </label>
      {state && <p className={state.ok ? "ac-ok" : "auth-error"} role="status">{state.message}</p>}
      <SubmitButton>Save preference</SubmitButton>
    </form>
  );
}
