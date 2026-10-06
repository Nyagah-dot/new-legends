import type { Metadata } from "next";
import Link from "next/link";
import "@/components/pay/pay.css";
import AuthShell from "@/components/auth/AuthShell";
import SubmitButton from "@/components/auth/SubmitButton";
import { startOrder } from "@/app/orders/actions";
import { getCurrentProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { kes } from "@/lib/orders";

export const metadata: Metadata = { title: "Join — THE LEGENDS FITNESS" };

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ plan?: string; error?: string }> }) {
  const sp = await searchParams;
  const code = (sp.plan ?? "").toLowerCase();
  const joinPath = `/join?plan=${encodeURIComponent(code)}`;

  const supabase = await createClient();
  const { data: plan } = /^[a-z_]{2,30}$/.test(code)
    ? await supabase.from("plans").select("code, name, price_kes, duration_days").eq("code", code).eq("is_active", true).maybeSingle()
    : { data: null };

  if (!plan) {
    return (
      <AuthShell title="Choose a plan">
        <p className="lead">We couldn&rsquo;t find that plan.</p>
        <Link href="/#pricing" className="btn btn-primary">See pricing <span className="arrow">&rarr;</span></Link>
      </AuthShell>
    );
  }

  const profile = await getCurrentProfile();
  const isDay = plan.duration_days === 1;

  return (
    <AuthShell title={`Join: ${plan.name}`} subtitle="Takes about two minutes.">
      <dl className="pay-sum">
        <div><dt>Plan</dt><dd>{plan.name}</dd></div>
        <div><dt>Price</dt><dd>{kes(plan.price_kes)}</dd></div>
        <div><dt>Lasts</dt><dd>{isDay ? "1 day" : `${plan.duration_days} days`}</dd></div>
      </dl>

      {!profile ? (
        <>
          <p style={{ marginBottom: 16 }}>First, create an account or log in so we know who you are.</p>
          <div className="adm-actions" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href={`/signup?next=${encodeURIComponent(joinPath)}`} className="btn btn-primary">Create account</Link>
            <Link href={`/login?next=${encodeURIComponent(joinPath)}`} className="btn btn-ghost">Log in</Link>
          </div>
        </>
      ) : (
        <>
          <ol className="pay-steps">
            <li>Continue to see where to pay.</li>
            <li>Pay with M-Pesa.</li>
            <li>Come back and tap <strong>I&rsquo;ve paid</strong>.</li>
            <li>We confirm it and email you. {isDay ? "Your day pass is valid on the day we confirm." : "Your days start when we confirm."}</li>
          </ol>
          {sp.error && <p className="auth-error" role="alert">Something went wrong. Please try again.</p>}
          <form action={startOrder} className="auth-form">
            <input type="hidden" name="plan" value={plan.code} />
            <SubmitButton>Continue to payment <span className="arrow">&rarr;</span></SubmitButton>
          </form>
        </>
      )}
    </AuthShell>
  );
}
