/**
 * The public address of the site, for building redirects (e.g. after Google sign-in).
 * Behind Railway's proxy, the address Next.js sees can be an internal one such as localhost:8080,
 * so we don't trust it. Order: NEXT_PUBLIC_SITE_URL (if set) -> the proxy's forwarded host -> the Host header -> the request URL.
 */
export function publicOrigin(request: Request): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (site) return site.replace(/\/+$/, "");

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (host) {
    const local = /^(localhost|127\.|0\.0\.0\.0|192\.168\.)/.test(host);
    const proto = request.headers.get("x-forwarded-proto")?.split(",")[0].trim() ?? (local ? "http" : "https");
    return `${proto}://${host}`;
  }
  return new URL(request.url).origin;
}
