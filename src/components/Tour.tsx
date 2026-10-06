import Link from "next/link";
import { TIMETABLE_HREF } from "@/lib/site";

export default function Tour() {
  return (
    <section id="tour" className="wrap">
      <div className="shead">
        <span className="eyebrow">Quick look around</span>
        <h2>Everything you need. <span className="serif i">Nothing you don&rsquo;t.</span></h2>
      </div>
      <div className="gal">
        <div className="ph big"><span className="tag">IMG</span>The floor</div>
        <div className="ph">Free weights</div>
        <div className="ph">Cardio</div>
        <div className="ph">Rig / racks</div>
        <div className="ph big"><span className="tag">IMG</span>Turf / class area</div>
        <div className="ph">Changing rooms</div>
        <div className="ph">Showers</div>
      </div>
      <div style={{ marginTop: 28 }}>
        <Link href={TIMETABLE_HREF} className="btn btn-ghost">
          Come see the real thing <span className="arrow">&rarr;</span>
        </Link>
      </div>
    </section>
  );
}
