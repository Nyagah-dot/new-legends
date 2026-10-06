import "./auth.css";
import Link from "next/link";
import Brand from "@/components/Brand";
import SignOutButton from "./SignOutButton";
import { portalLinks } from "@/lib/auth/paths";
import type { Profile } from "@/lib/auth/session";

export default function PortalShell({
  profile,
  area,
  children,
}: {
  profile: Profile;
  area: "account" | "desk" | "admin";
  children: React.ReactNode;
}) {

  return (
    <div className="portal">
      <header className="portal-bar">
        <Link href="/" className="logo" style={{ textDecoration: "none", color: "inherit" }}>
          <Brand />
        </Link>
        <nav className="portal-nav" aria-label="Portal">
          <Link href="/">Home</Link>
          {portalLinks(profile.role).map((l) => (
            <Link key={l.key} href={l.href} className={area === l.key ? "on" : undefined}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="portal-user">
          <span>{profile.fullName || profile.email}</span>
          <em className={`badge badge-${profile.role}`}>{profile.role}</em>
          <SignOutButton />
        </div>
      </header>
      <main className="portal-main">{children}</main>
    </div>
  );
}
