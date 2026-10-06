"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp } from "@/app/auth/actions";
import SubmitButton from "./SubmitButton";

export default function SignupForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signUp, undefined);

  if (state?.message) {
    return (
      <div className="auth-form">
        <p className="auth-ok" role="status">{state.message}</p>
        <div className="auth-links">
          <Link href="/login">Back to sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="auth-form">
      <input type="hidden" name="next" value={next ?? ""} />
      <label>
        Full name
        <input name="full_name" type="text" autoComplete="name" required />
      </label>
      <label>
        Phone
        <input name="phone" type="tel" autoComplete="tel" placeholder="07XX XXX XXX" required />
      </label>
      <label>
        Email
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label>
        Password
        <input name="password" type="password" autoComplete="new-password" minLength={8} required />
        <span className="auth-hint">At least 8 characters.</span>
      </label>

      <label className="auth-check">
        <input name="marketing" type="checkbox" />
        <span>
          Send me offers and updates from The Legends Fitness. Optional, and you can opt out any time.
          (We&rsquo;ll still email you receipts and membership reminders.)
        </span>
      </label>

      {state?.error && <p className="auth-error" role="alert">{state.error}</p>}

      <SubmitButton>Create account <span className="arrow">&rarr;</span></SubmitButton>

      <div className="auth-links">
        <span>
          Already a member? <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}>Sign in</Link>
        </span>
      </div>
    </form>
  );
}
