"use client";

import "./desk.css";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/desk", label: "Check-in", exact: true },
  { href: "/desk/members", label: "Members" },
  { href: "/desk/new", label: "Add walk-in" },
];

export default function DeskNav() {
  const path = usePathname();
  return (
    <nav className="dk-tabs" aria-label="Front desk sections">
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
