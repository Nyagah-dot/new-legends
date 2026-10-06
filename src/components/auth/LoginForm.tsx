"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn } from "@/app/auth/actions";
import SubmitButton from "./SubmitButton";

export default function LoginForm({ variant, next }: { variant: "member" | "desk" | "admin"; next: string }) {
  const [state, action] = useActionState(signIn, undefined);

  return (
    <form action={action} className="auth-form">
      <input type="hidden" name="variant" value={variant} />
      <input type="hidden" name="next" value={next} />

      <label>
        Email
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label>
        Password
        <input name="password" type="password" autoComplete="current-password" required />
      </label>

      {state?.error && <p className="auth-error" role="alert">{state.error}</p>}

      <SubmitButton>Sign in <span className="arrow">&rarr;</span></SubmitButton>

      <div className="auth-links">
        <Link href="/forgot-password">Forgot your password?</Link>
        {variant === "member" && (
          <span>
            New here? <Link href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}>Create an account</Link>
          </span>
        )}
      </div>
    </form>
  );
}
