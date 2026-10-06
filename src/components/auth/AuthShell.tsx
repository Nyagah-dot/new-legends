import "./auth.css";
import Link from "next/link";
import Brand from "@/components/Brand";
import LoginTabs, { type LoginTab } from "./LoginTabs";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export default function AuthShell({
  title,
  subtitle,
  tabs,
  children,
}: {
  title: string;
  subtitle?: string;
  /** Pass the active tab on the three login pages to show the Member / Front desk / Admin switcher. */
  tabs?: LoginTab;
  children: React.ReactNode;
}) {
  return (
    <div className="auth-page">
      <header className="auth-top">
        <Link href="/" className="logo" style={{ textDecoration: "none", color: "inherit" }}>
          <Brand />
        </Link>
        <Link href="/" className="btn btn-ghost" style={{ padding: "10px 18px", fontSize: ".72rem" }}>&larr; Home</Link>
      </header>
      <main className="auth-card">
        {tabs && <LoginTabs active={tabs} />}
        <h1>{title}</h1>
        {subtitle && <p className="lead">{subtitle}</p>}
        {hasSupabaseEnv ? (
          children
        ) : (
          <p className="auth-error" role="alert">
            Login isn&rsquo;t configured yet. Copy <code>.env.example</code> to <code>.env.local</code>, add your
            Supabase URL and publishable key, then restart <code>npm run dev</code>.
          </p>
        )}
      </main>
    </div>
  );
}
