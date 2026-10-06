export type Role = "member" | "staff" | "admin";

/** Where each role lands after signing in. */
export function homeFor(role: Role): string {
  return role === "admin" ? "/admin" : role === "staff" ? "/desk" : "/account";
}

/**
 * The only pages each role is shown links to:
 *  member -> their account | staff -> the front desk | admin -> the admin area, plus the front desk if they want it.
 * (This only controls what is SHOWN. The server and the database still enforce who may actually open each page.)
 */
export function portalLinks(role: Role): { key: "account" | "desk" | "admin"; href: string; label: string }[] {
  if (role === "admin") {
    return [
      { key: "admin", href: "/admin", label: "Admin" },
      { key: "desk", href: "/desk", label: "Front desk" },
    ];
  }
  if (role === "staff") return [{ key: "desk", href: "/desk", label: "Front desk" }];
  return [{ key: "account", href: "/account", label: "Member account" }];
}

/** True for `/desk` and `/desk/anything`, but not `/deskx`. */
export function isUnder(path: string, base: string): boolean {
  return path === base || path.startsWith(base + "/");
}

/**
 * Only allow redirects to paths on THIS site (blocks `//evil.com`, `https://evil.com`, backslash tricks).
 * Always use this on any `next` value that came from a URL or a form.
 */
export function safeNext(value: unknown, fallback: string): string {
  const v = typeof value === "string" ? value : "";
  return /^\/(?![/\\])\S*$/.test(v) ? v : fallback;
}
