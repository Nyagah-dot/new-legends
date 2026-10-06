import "./tabs.css";
import Link from "next/link";

const TABS = [
  { key: "member", label: "Member", href: "/login" },
  { key: "desk", label: "Front desk", href: "/desk/login" },
  { key: "admin", label: "Admin", href: "/desk/login?as=admin" },
] as const;

export type LoginTab = (typeof TABS)[number]["key"];

export default function LoginTabs({ active }: { active: LoginTab }) {
  return (
    <nav aria-label="Choose how to log in">
      <p className="login-tabs-label">Log in as</p>
      <div className="login-tabs">
        {TABS.map((t) => (
          <Link key={t.key} href={t.href} aria-current={t.key === active ? "page" : undefined}>
            {t.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
