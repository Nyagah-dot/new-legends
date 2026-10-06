import Link from "next/link";
import { TIMETABLE_HREF } from "@/lib/site";

export default function Hero() {
  return (
    <section className="hero">
      {/* Full-bleed media layer: wireframe placeholder underneath, video on top. */}
      <div className="hero-media" aria-hidden="true">
        <div className="ph dark">
          <span className="tag">VIDEO — public/videos/hero.mp4</span>
        </div>
        <video autoPlay muted loop playsInline preload="metadata">
          <source src="/videos/hero.webm" type="video/webm" />
          <source src="/videos/hero.mp4" type="video/mp4" />
        </video>
      </div>

      <div className="wrap">
        <div className="hero-copy">
          <h1>
            Show up.<br />
            <span className="serif i">Get to work.</span><br />
            Leave tougher.
          </h1>
          <p className="lead">
            Real coaching and real weight for people who want to get genuinely
            stronger &mdash; with a proper on-ramp if you&rsquo;ve never trained a day in your life.
          </p>
          <div className="hero-cta">
            <Link href={TIMETABLE_HREF} className="btn btn-primary">
              Book a session <span className="arrow">&rarr;</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
