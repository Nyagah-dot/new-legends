"use client";

import { useActionState } from "react";
import { createWalkIn } from "@/app/desk/actions";
import SubmitButton from "@/components/auth/SubmitButton";

export default function WalkInForm() {
  const [state, action] = useActionState(createWalkIn, undefined);
  return (
    <form action={action} className="dk-form">
      <label>
        Full name
        <input name="full_name" type="text" required autoComplete="off" />
      </label>
      <label>
        Phone
        <input name="phone" type="tel" required autoComplete="off" placeholder="07XX XXX XXX" />
      </label>
      <label>
        Email (recommended)
        <input name="email" type="email" autoComplete="off" />
      </label>
      <label className="chk">
        <input name="marketing" type="checkbox" />
        <span>They agree to receive offers and updates by email (only ask if you took their email).</span>
      </label>
      {state?.error && <p className="auth-error" role="alert">{state.error}</p>}
      <SubmitButton>Add member</SubmitButton>
    </form>
  );
}
