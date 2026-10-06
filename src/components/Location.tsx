import { MAPS_URL } from "@/lib/site";

export default function Location() {
  return (
    <section id="location" className="wrap">
      <div className="loc-grid">
        <div className="loc-info">
          <span className="eyebrow">Find us</span>
          <h2>Links Road, <span className="serif i">Nyali.</span></h2>
          <p className="lead" style={{ marginTop: 16 }}>
            The <span className="red">Legends</span> Fitness, Links Road, Nyali &mdash; Mombasa, Kenya. Secure on-site parking.
          </p>
          <ul className="hours">
            <li><b>Mon – Fri</b><span>5:00 – 22:00</span></li>
            <li><b>Saturday</b><span>6:00 – 20:00</span></li>
            <li><b>Sunday</b><span>7:00 – 18:00</span></li>
            <li><b>WhatsApp</b><span>[ +254 ... ]</span></li>
          </ul>
          <div style={{ marginTop: 24 }}>
            <a href={MAPS_URL} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
              Get directions <span className="arrow">&rarr;</span>
            </a>
          </div>
        </div>
        <div className="ph loc-map"><span className="tag">MAP</span>Google Map — Nyali, Mombasa</div>
      </div>
    </section>
  );
}
