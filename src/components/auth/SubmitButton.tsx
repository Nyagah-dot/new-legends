"use client";

import { useFormStatus } from "react-dom";

export default function SubmitButton({
  children,
  className = "btn btn-primary",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} {...rest}>
      {pending ? "Please wait…" : children}
    </button>
  );
}
