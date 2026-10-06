import Link from "next/link";
import Brand from "./Brand";
import { TIMETABLE_HREF, WHATSAPP_URL } from "@/lib/site";

export default function Footer() {
  return (
    <footer>
      <div className="wrap">
        <div className="foot-grid">
          <div>
            <div className="logo" style={{ fontSize: "1.1rem", marginBottom: 14 }}><Brand /></div>
            <p>Serious strength &amp; conditioning in Nyali, Mombasa — with a real path in for beginners.</p>
          </div>
          <div>
            <h4>Train</h4>
            <Link href="/#beginners">Beginners</Link>
            <Link href="/#classes">Classes</Link>
            <Link href="/#pricing">Pricing</Link>
          </div>
          <div>
            <h4>Gym</h4>
            <Link href="/#coaches">Coaches</Link>
            <Link href="/#tour">Facilities</Link>
            <Link href="/#location">Location</Link>
          </div>
          <div>
            <h4>Start</h4>
            <Link href={TIMETABLE_HREF}>Book a session</Link>
            <Link href="/login">Member login</Link>
            <a href={WHATSAPP_URL}>WhatsApp</a>
          </div>
        </div>
        <div className="foot-bottom">
          <span>&copy; 2026 <Brand /> — Links Road, Nyali, Mombasa</span>
          <span><Link href="/desk/login">Staff login</Link></span>
        </div>
      </div>
    </footer>
  );
}
