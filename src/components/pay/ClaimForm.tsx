"use client";

import { useActionState } from "react";
import { claimPayment } from "@/app/orders/actions";
import SubmitButton from "@/components/auth/SubmitButton";

export default function ClaimForm({ orderId, defaultName }: { orderId: string; defaultName: string }) {
  const [state, action] = useActionState(claimPayment, undefined);
  return (
    <form action={action} className="auth-form">
      <input type="hidden" name="order_id" value={orderId} />
      <label>
        Name that will show on the M-Pesa message
        <input name="mpesa_name" type="text" defaultValue={defaultName} autoComplete="name" required />
        <span className="auth-hint">It can be different from your account name (for example, if someone else pays for you).</span>
      </label>
      {state?.error && <p className="auth-error" role="alert">{state.error}</p>}
      <SubmitButton>I&rsquo;ve paid <span className="arrow">&rarr;</span></SubmitButton>
    </form>
  );
}
