"use client";

import Link from "next/link";
import { useActionState } from "react";
import { updatePassword } from "@/app/auth/actions";
import SubmitButton from "./SubmitButton";

export default function ResetForm({ tokenHash }: { tokenHash?: string }) {
  const [state, action] = useActionState(updatePassword, undefined);

  if (state?.expired) {
    return (
      <div className="auth-form">
        <p className="auth-error" role="alert">{state.error}</p>
        <div className="auth-links"><Link href="/forgot-password">Request a new link</Link></div>
      </div>
    );
  }

  return (
    <form action={action} className="auth-form">
      {/* Once the link has been used, retries rely on the verified session instead. */}
      <input type="hidden" name="token_hash" value={state?.keepSession ? "" : (tokenHash ?? "")} />
      <label>
        New password
        <input name="password" type="password" autoComplete="new-password" minLength={8} required />
        <span className="auth-hint">At least 8 characters.</span>
      </label>
      <label>
        Confirm new password
        <input name="confirm" type="password" autoComplete="new-password" minLength={8} required />
      </label>
      {state?.error && <p className="auth-error" role="alert">{state.error}</p>}
      <SubmitButton>Save new password</SubmitButton>
    </form>
  );
}
