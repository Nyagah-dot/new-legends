const steps = [
  { n: "01", ph: "Assessment", h: "Start", p: "We meet you where you are. First lifts, zero judgement." },
  { n: "02", ph: "Training", h: "Train", p: "Learn the movements. Show up. Add load as you’re ready." },
  { n: "03", ph: "Progression", h: "Adapt", p: "Movements get easier, numbers climb, energy returns." },
  { n: "04", ph: "Result", h: "Change", p: "The work shows — in how you feel, perform and look." },
];

export default function Steps() {
  return (
    <section id="beginners" className="wrap">
      <div className="shead">
        <span className="eyebrow">How training actually works</span>
        <h2>Your body changes <span className="serif i">in stages.</span></h2>
        <p className="lead">
          You don&rsquo;t need to be fit before you start &mdash; that&rsquo;s the whole point of starting.
        </p>
      </div>
      <div className="steps">
        {steps.map((s) => (
          <div key={s.n} className="step reveal">
            <div className="ph"><span className="tag">PHOTO</span>{s.ph}</div>
            <div className="body">
              <div className="n">{s.n}</div>
              <h3>{s.h}</h3>
              <p>{s.p}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
