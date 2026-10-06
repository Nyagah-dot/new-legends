import Link from "next/link";
import { TIMETABLE_HREF } from "@/lib/site";

export default function FinalCta() {
  return (
    <section className="final">
      <div className="wrap">
        <span className="eyebrow">One step</span>
        <h2>Start where you are. <span className="serif i">Get to work.</span></h2>
        <p className="lead">
          Pick a session that fits and book it. No lock-in. Come see the floor and meet a coach.
        </p>
        <div className="hero-cta">
          <Link href={TIMETABLE_HREF} className="btn btn-light">
            Book a session <span className="arrow">&rarr;</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
