"use client";

import Link from "next/link";
import { useState } from "react";
import Brand from "./Brand";
import AccountMenu from "./AccountMenu";
import { TIMETABLE_HREF } from "@/lib/site";

const links = [
  { href: "/#beginners", label: "Beginners" },
  { href: "/#classes", label: "Classes" },
  { href: "/#coaches", label: "Coaches" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#location", label: "Location" },
];

export default function Nav() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className="nav">
      <div className="nav-inner">
        <Link href="/" className="logo" style={{ textDecoration: "none", color: "inherit" }}>
          <Brand />
        </Link>
        <nav aria-label="Primary">
          <ul className={`nav-links${open ? " open" : ""}`} id="navlinks">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={close}>{l.label}</Link>
              </li>
            ))}
            <li>
              <AccountMenu onNavigate={close} />
            </li>
            <li>
              <Link href={TIMETABLE_HREF} className="navbtn" onClick={close}>
                Book a session
              </Link>
            </li>
          </ul>
        </nav>
        <button
          className="nav-toggle"
          aria-label="Menu"
          aria-expanded={open}
          aria-controls="navlinks"
          onClick={() => setOpen((o) => !o)}
        >
          <span /><span /><span />
        </button>
      </div>
    </header>
  );
}
