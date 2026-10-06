"use client";

import "./payments.css";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/payments", label: "Payments", badge: true },
  { href: "/admin/classes", label: "Classes" },
  { href: "/admin/sessions", label: "Dates" },
];

export default function AdminNav({ pending = 0 }: { pending?: number }) {
  const path = usePathname();
  return (
    <nav className="adm-tabs" aria-label="Admin sections">
      {TABS.map((t) => {
        const on = t.exact ? path === t.href : path === t.href || path.startsWith(t.href + "/");
        return (
          <Link key={t.href} href={t.href} className={on ? "on" : undefined} aria-current={on ? "page" : undefined}>
            {t.label}
            {t.badge && pending > 0 && <span className="adm-badge">{pending}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
