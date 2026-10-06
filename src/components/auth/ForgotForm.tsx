"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset } from "@/app/auth/actions";
import SubmitButton from "./SubmitButton";

export default function ForgotForm() {
  const [state, action] = useActionState(requestPasswordReset, undefined);
  return (
    <form action={action} className="auth-form">
      <label>
        Email
        <input name="email" type="email" autoComplete="email" required />
      </label>
      {state?.error && <p className="auth-error" role="alert">{state.error}</p>}
      {state?.message && <p className="auth-ok" role="status">{state.message}</p>}
      <SubmitButton>Send reset link</SubmitButton>
      <div className="auth-links">
        <Link href="/login">Back to sign in</Link>
      </div>
    </form>
  );
}
