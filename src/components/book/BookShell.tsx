import "@/components/auth/auth.css";
import "./book.css";
import Link from "next/link";
import Brand from "@/components/Brand";

/** Same header as the login pages, with a wider page body for the class list. */
export default function BookShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-page">
      <header className="auth-top">
        <Link href="/" className="logo" style={{ textDecoration: "none", color: "inherit" }}>
          <Brand />
        </Link>
        <Link href="/" className="btn btn-ghost" style={{ padding: "10px 18px", fontSize: ".72rem" }}>&larr; Home</Link>
      </header>
      <main className="bk-main">{children}</main>
    </div>
  );
}
