const cells = [
  { n: "01", h: "Coached, not sold to.", p: "Certified strength coaches on the floor — not staff chasing commission.", cls: "cell fill span2" },
  { n: "02", h: "Real weight.", p: "Racks, bars and space to train hard. No apologising for intensity.", cls: "cell" },
  { n: "03", h: "No ego.", p: "No mirrors-and-attitude culture. Everyone’s here to get better.", cls: "cell" },
  { n: "04", h: "A real door in for beginners.", p: "Never trained? The On-Ramp teaches you the movements before you go it alone.", cls: "cell fill span2" },
];

export default function Why() {
  return (
    <section id="about" className="about">
      <div className="wrap">
        <div className="shead">
          <span className="eyebrow">Why The <span className="red">Legends</span></span>
          <h2>A gym that <span className="serif i">does the work</span> with you.</h2>
        </div>
        <div className="why">
          {cells.map((c) => (
            <div key={c.n} className={c.cls}>
              <span className="n">{c.n}</span>
              <div>
                <h3>{c.h}</h3>
                <p>{c.p}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
