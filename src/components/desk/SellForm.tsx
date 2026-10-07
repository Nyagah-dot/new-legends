"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { sellMembership } from "@/app/desk/actions";
import SubmitButton from "@/components/auth/SubmitButton";
import { METHODS } from "@/lib/desk";

type Plan = { code: string; name: string; price_kes: number };

export default function SellForm({ memberId, plans }: { memberId: string; plans: Plan[] }) {
  const [state, action] = useActionState(sellMembership, undefined);
  const [method, setMethod] = useState<string>("cash");
  const formRef = useRef<HTMLFormElement>(null);
  const needsRef = METHODS.find((m) => m.value === method)?.needsRef ?? false;

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form action={action} ref={formRef} className="dk-form">
      <input type="hidden" name="member_id" value={memberId} />
      <label>
        Plan
        <select name="plan" required defaultValue="">
          <option value="" disabled>Choose a plan</option>
          {plans.map((p) => (
            <option key={p.code} value={p.code}>{p.name} — KES {p.price_kes.toLocaleString("en-KE")}</option>
          ))}
        </select>
      </label>
      <label>
        Paid by
        <select name="method" value={method} onChange={(e) => setMethod(e.target.value)}>
          {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </label>
      <label>
        {needsRef ? "Transaction code (e.g. M-Pesa code)" : "Receipt / reference (optional)"}
        <input name="reference" type="text" required={needsRef} autoComplete="off" />
      </label>
      {state && (
        <p className={state.ok ? "dk-note" : "auth-error"} role="status">{state.message}</p>
      )}
      <SubmitButton>Sell membership</SubmitButton>
    </form>
  );
}
