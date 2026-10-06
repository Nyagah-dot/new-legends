"use client";

import "./AccountMenu.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { portalLinks, type Role } from "@/lib/auth/paths";

const LOGINS = [
  { href: "/login", title: "Member" },
  { href: "/desk/login", title: "Front desk" },
  { href: "/desk/login?as=admin", title: "Admin" },
];

/**
 * Nav dropdown.
 *  - signed out: "Log in" -> choose Member / Front desk / Admin
 *  - signed in:  shows only the pages for your role (member: Member account / staff: Front desk /
 *                admin: Admin + Front desk), then Sign out
 * Inside the mobile hamburger menu the panel expands inline instead of floating.
 * Display only: it never protects anything (the server and database do that).
 */
export default function AccountMenu({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const [signedIn, setSignedIn] = useState(false);
  const [role, setRole] = useState<Role | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return; // Supabase not configured yet
    const supabase = createClient();

    const apply = async (userId: string | null) => {
      if (!userId) {
        setSignedIn(false);
        setRole(null);
        return;
      }
      setSignedIn(true);
      const { data } = await supabase.from("profiles").select("role").eq("auth_user_id", userId).maybeSingle();
      setRole((data?.role as Role | undefined) ?? "member");
    };

    supabase.auth.getSession().then(({ data }) => apply(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      // Don't call Supabase inside this callback directly (can deadlock): defer it.
      setTimeout(() => apply(session?.user.id ?? null), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Close on outside click / tap and on Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const go = () => {
    setOpen(false);
    onNavigate?.(); // also closes the hamburger menu
  };

  // Sign out in the browser: clears the login cookies, updates this menu straight away, then goes home.
  async function handleSignOut() {
    if (busy) return;
    setBusy(true);
    const supabase = createClient();
    await supabase.auth.signOut({ scope: "local" });
    setSignedIn(false);
    setRole(null);
    setBusy(false);
    go();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="acct" ref={ref}>
      <button
        type="button"
        className="acct-btn"
        aria-expanded={open}
        aria-controls="acct-panel"
        onClick={() => setOpen((o) => !o)}
      >
        {signedIn ? (role ? portalLinks(role)[0].label : "Account") : "Log in"}
        <svg className="acct-chev" viewBox="0 0 10 10" aria-hidden="true">
          <path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      </button>

      {open && (
        <div id="acct-panel" className="acct-panel">
          {signedIn ? (
            <>
              {role &&
                portalLinks(role).map((l) => (
                  <Link key={l.key} href={l.href} onClick={go}>
                    <strong>{l.label}</strong>
                  </Link>
                ))}
              <hr className="acct-sep" />
              <button type="button" className="acct-out" onClick={handleSignOut} disabled={busy}>
                <strong>{busy ? "Signing out…" : "Sign out"}</strong>
              </button>
            </>
          ) : (
            <>
              <p className="acct-label">Log in as</p>
              {LOGINS.map((l) => (
                <Link key={l.href} href={l.href} onClick={go}>
                  <strong>{l.title}</strong>
                </Link>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
