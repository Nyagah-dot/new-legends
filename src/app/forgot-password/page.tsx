import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import ForgotForm from "@/components/auth/ForgotForm";

export const metadata: Metadata = { title: "Reset password — THE LEGENDS FITNESS" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Reset your password" subtitle="We'll email you a link to choose a new one.">
      <ForgotForm />
    </AuthShell>
  );
}
