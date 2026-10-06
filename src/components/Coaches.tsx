const coaches = [
  "Head Strength Coach",
  "On-Ramp Lead",
  "Conditioning Coach",
  "Personal Trainer",
];

export default function Coaches() {
  return (
    <section id="coaches" className="people">
      <div className="wrap">
        <div className="shead">
          <span className="eyebrow">Who&rsquo;s in your corner</span>
          <h2>Coached by <span className="serif i">actual coaches.</span></h2>
        </div>
        <div className="grid g4" style={{ borderTop: "2px solid var(--ink)", borderLeft: "2px solid var(--ink)" }}>
          {coaches.map((role) => (
            <div key={role} className="coach">
              <div className="ph"><span className="tag">PHOTO</span>Coach</div>
              <div className="body">
                <h3>[ Coach name ]</h3>
                <div className="role">{role}</div>
                <p>[ Certification · specialism ]</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
