"use client";

import { useActionState } from "react";
import { checkIn } from "@/app/desk/actions";
import SubmitButton from "@/components/auth/SubmitButton";

export default function CheckInButton({ memberId }: { memberId: string }) {
  const [state, action] = useActionState(checkIn, undefined);
  return (
    <form action={action}>
      <input type="hidden" name="member_id" value={memberId} />
      <SubmitButton className="btn btn-primary ci-btn">CHECK IN</SubmitButton>
      {state && (
        <div className={`ci-result ${state.ok ? "ok" : "bad"}`} role="status">
          {state.message}
          {state.warning && <small>{state.warning}</small>}
        </div>
      )}
    </form>
  );
}
