"use client";

import Link from "next/link";
import { useActionState } from "react";
import { confirmEmail } from "@/app/auth/actions";
import SubmitButton from "./SubmitButton";

export default function ConfirmForm({ tokenHash, next }: { tokenHash: string; next: string }) {
  const [state, action] = useActionState(confirmEmail, undefined);

  if (state?.expired) {
    return (
      <div className="auth-form">
        <p className="auth-error" role="alert">{state.error}</p>
        <div className="auth-links">
          <Link href="/login">Sign in</Link>
          <Link href="/signup">Create account again</Link>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="auth-form">
      <input type="hidden" name="token_hash" value={tokenHash} />
      <input type="hidden" name="next" value={next} />
      <SubmitButton>Confirm my email <span className="arrow">&rarr;</span></SubmitButton>
    </form>
  );
}
