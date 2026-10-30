"use client";

import "./payments.css";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/payments", label: "Payments", badge: true },
  { href: "/admin/visitors", label: "Single classes", visitors: true },
  { href: "/admin/one-to-one", label: "1-to-1", pt: true },
  { href: "/admin/schedule", label: "Schedule" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/classes", label: "Classes" },
  { href: "/admin/trainers", label: "Coaches" },
  { href: "/admin/sessions", label: "Dates" },
  { href: "/admin/people", label: "People" },
  { href: "/admin/emails", label: "Emails" },
  { href: "/admin/settings", label: "Settings" },
];

export default function AdminNav({ pending = 0, visitorsPending = 0, ptPending = 0 }: { pending?: number; visitorsPending?: number; ptPending?: number }) {
  const path = usePathname();
  return (
    <nav className="adm-tabs" aria-label="Admin sections">
      {TABS.map((t) => {
        const on = t.exact ? path === t.href : path === t.href || path.startsWith(t.href + "/");
        return (
          <Link key={t.href} href={t.href} className={on ? "on" : undefined} aria-current={on ? "page" : undefined}>
            {t.label}
            {t.badge && pending > 0 && <span className="adm-badge">{pending}</span>}
            {t.visitors && visitorsPending > 0 && <span className="adm-badge">{visitorsPending}</span>}
            {t.pt && ptPending > 0 && <span className="adm-badge">{ptPending}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
