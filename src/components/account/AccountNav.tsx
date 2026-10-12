"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/account", label: "Overview", exact: true },
  { href: "/account/timetable", label: "Timetable" },
  { href: "/account/payments", label: "Payments" },
  { href: "/account/freeze", label: "Freeze" },
  { href: "/account/profile", label: "Profile" },
];

export default function AccountNav() {
  const path = usePathname();
  return (
    <nav className="ac-tabs" aria-label="Your account">
      {TABS.map((t) => {
        const on = t.exact ? path === t.href : path === t.href || path.startsWith(t.href + "/");
        return (
          <Link key={t.href} href={t.href} className={on ? "on" : undefined} aria-current={on ? "page" : undefined}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
