"use client";

import { useRef, useState, type FormEvent } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import CircleCta from "./CircleCta";
import { MAPS_URL, WHATSAPP_URL } from "@/lib/site";
import "./Directions.css";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const BG_SRC = "/images/directions/bg.webp";
const INLINE_SRC = "/images/directions/inline.webp";

const FORM_TITLE = ["Book a", "visit"];
const FORM_LEAD = "Tell us when you’re coming and we’ll meet you at the door.";

const ADDRESS = ["The Legends Fitness", "Links Road, Nyali", "Mombasa, Kenya"];
const PARKING = "Secure on-site parking.";

const HOURS = [
  { day: "Mon – Fri", time: "5:00 – 22:00" },
  { day: "Saturday", time: "6:00 – 20:00" },
  { day: "Sunday", time: "7:00 – 18:00" },
] as const;

const DAYS = ["Today", "Tomorrow", "This weekend", "Next week"] as const;

/** Google's keyless embed  */
const MAP_EMBED = "https://www.google.com/maps?q=The+Legends+Fitness+Links+Road+Nyali+Mombasa&output=embed";

export type VisitRequest = { name: string; phone: string; when: string };

type Props = {
  /** Replace to post the visit request somewhere else (API route, server action…). */
  onSubmit?: (data: VisitRequest) => string | void | Promise<string | void>;
};

/**  pre-written message. */
function sendViaWhatsApp({ name, phone, when }: VisitRequest): string {
  const base = WHATSAPP_URL as string;
  if (!base || base === "#") {
    return "WhatsApp isn’t connected yet — set WHATSAPP_URL in lib/site.ts.";
  }
  const text = `Hi, I'm ${name} (${phone}). I'd like to visit The Legends Fitness — ${when.toLowerCase()}.`;
  const url = `${base}${base.includes("?") ? "&" : "?"}text=${encodeURIComponent(text)}`;
  window.open(url, "_blank", "noopener,noreferrer");
  return `Thanks ${name.split(" ")[0]} — finish the message in WhatsApp.`;
}

/** A word that rises out of a mask. */
function Word({ children, className = "" }: { children: string; className?: string }) {
  return (
    <span className={`ldir__mask ${className}`.trim()}>
      <span className="ldir__word" data-word>{children}</span>
    </span>
  );
}

export default function Directions({ onSubmit = sendViaWhatsApp }: Props) {
  const root = useRef<HTMLElement>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const $ = gsap.utils.selector(el);

      const stage = $(".ldir__stage")[0] as HTMLElement;
      const bgBox = $(".ldir__bg")[0] as HTMLElement;
      const bg = $(".ldir__bgimg")[0] as HTMLElement;
      const words = $("[data-word]");
      const pill = $("[data-pill]");
      const pillImg = $("[data-pill] img");
      const fades = $("[data-fade]");
      const lines = $("[data-line]");
      const rowA = $(".ldir__row--a");
      const rowB = $(".ldir__row--b");

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        /* hidden start states */
        gsap.set(bgBox, { clipPath: "inset(100% 0% 0% 0%)" });
        gsap.set(bg, { scale: 1.25 });
        gsap.set(words, { yPercent: 115 });
        gsap.set(pill, { clipPath: "inset(0% 100% 0% 0%)" });
        gsap.set(pillImg, { scale: 1.5 });
        gsap.set(fades, { autoAlpha: 0, y: 24 });
        gsap.set(lines, { scaleX: 0, transformOrigin: "0% 50%" });

        /* mount: bg wipes up → headline rises → pill opens → form builds */
        gsap
          .timeline({
            defaults: { ease: "expo.out" },
            scrollTrigger: { trigger: stage, start: "top 70%", once: true },
          })
          .to(bgBox, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.4, ease: "expo.inOut" }, 0)
          .to(bg, { scale: 1, duration: 2.2 }, 0.1)
          .to(words, { yPercent: 0, duration: 1.2, stagger: 0.09 }, 0.35)
          .to(pill, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.3, ease: "expo.inOut" }, 0.6)
          .to(pillImg, { scale: 1, duration: 1.8 }, 0.6)
          .to(fades, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.08 }, 0.9)
          .to(lines, { scaleX: 1, duration: 1.1, stagger: 0.1 }, 1.0);

        /* scrub: bg drifts slow, headline rows slide apart a touch */
        const scrub = (start: string) => ({ trigger: stage, start, end: "bottom top", scrub: 0.7 });
        gsap.fromTo(bg, { yPercent: -7 }, { yPercent: 7, ease: "none", scrollTrigger: scrub("top bottom") });
        gsap.to(rowA, { x: "-2.5vw", ease: "none", scrollTrigger: scrub("top 60%") });
        gsap.to(rowB, { x: "2.5vw", ease: "none", scrollTrigger: scrub("top 60%") });

        /* info strip: items stagger in as the batch enters */
        const info = gsap.utils.toArray<HTMLElement>("[data-info]", el);
        gsap.set(info, { autoAlpha: 0, y: 36 });
        ScrollTrigger.batch(info, {
          start: "top 90%",
          once: true,
          onEnter: (batch) =>
            gsap.to(batch, { autoAlpha: 1, y: 0, duration: 1, ease: "expo.out", stagger: 0.12, overwrite: true }),
        });
      });
    },
    { scope: root }
  );

  async function handle(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const data: VisitRequest = {
      name: String(f.get("name") ?? "").trim(),
      phone: String(f.get("phone") ?? "").trim(),
      when: String(f.get("when") ?? DAYS[0]),
    };
    if (!data.name || !data.phone) return;
    setBusy(true);
    try {
      const msg = await onSubmit(data);
      setStatus(typeof msg === "string" ? msg : "Thanks — we’ll see you soon.");
    } catch {
      setStatus("Something went wrong. Please try again, or message us on WhatsApp.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="location" className="ldir" ref={root} aria-labelledby="ldir-title">
      {/* ------------------------------------------------ stage: CTA band */}
      <div className="ldir__stage">
        <div className="ldir__bg" aria-hidden="true">
          <img className="ldir__bgimg" src={BG_SRC} alt="" loading="lazy" decoding="async" />
          <span className="ldir__shade" />
        </div>

        <div className="ldir__inner">
          <h2 className="ldir__title" id="ldir-title" aria-label="Find The Legends, Nyali, Mombasa">
            <span className="ldir__row ldir__row--a" aria-hidden="true">
              <span className="ldir__lead">
                <Word>Find</Word>
                <span className="ldir__pill" data-pill>
                  <img src={INLINE_SRC} alt="" width={640} height={240} loading="lazy" decoding="async" />
                </span>
              </span>
              <Word>The Legends</Word>
            </span>
            <span className="ldir__row ldir__row--b" aria-hidden="true">
              <Word>Nyali</Word>
              <Word>Mombasa</Word>
            </span>
          </h2>

          <form className="ldir__form" onSubmit={handle}>
            <p className="ldir__formtitle" data-fade>
              {FORM_TITLE.map((l) => (
                <span key={l}>{l}</span>
              ))}
            </p>
            <p className="ldir__formlead" data-fade>{FORM_LEAD}</p>

            <div className="ldir__field" data-fade>
              <label htmlFor="ldir-name" className="ldir__sr">Your name</label>
              <input id="ldir-name" name="name" type="text" placeholder="Name" autoComplete="name" required />
              <span className="ldir__line" data-line aria-hidden="true" />
            </div>
            <div className="ldir__field" data-fade>
              <label htmlFor="ldir-phone" className="ldir__sr">Phone number</label>
              <input id="ldir-phone" name="phone" type="tel" inputMode="tel" placeholder="Phone" autoComplete="tel" required />
              <span className="ldir__line" data-line aria-hidden="true" />
            </div>
            <div className="ldir__field ldir__field--select" data-fade>
              <label htmlFor="ldir-when" className="ldir__sr">When are you coming?</label>
              <select id="ldir-when" name="when" defaultValue={DAYS[0]}>
                {DAYS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <span className="ldir__line" data-line aria-hidden="true" />
            </div>

            <button type="submit" className="ldir__send" disabled={busy} data-fade>
              <span>{busy ? "Sending" : "Send request"}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" aria-hidden="true">
                <path d="M6 18L18 6M8 6h10v10" />
              </svg>
            </button>
            <p className="ldir__status" role="status" aria-live="polite">{status}</p>
          </form>
        </div>

        {/* circle CTA straddles the bottom edge, like the reference */}
        <div className="ldir__cta">
          <CircleCta href={MAPS_URL} label="Get directions" size="var(--ldir-cta)" appear="scroll" delay={0.3} />
        </div>
      </div>

      {/* ------------------------------------------- info: hours + map */}
      <div className="ldir__info">
        <div className="ldir__infogrid">
          <div className="ldir__col" data-info>
            <span className="ldir__k">Address</span>
            <address>
              {ADDRESS.map((l) => (
                <span key={l}>{l}</span>
              ))}
            </address>
            <p className="ldir__note">{PARKING}</p>
          </div>

          <div className="ldir__col" data-info>
            <span className="ldir__k">Opening hours</span>
            <ul className="ldir__hours">
              {HOURS.map((h) => (
                <li key={h.day}>
                  <b>{h.day}</b>
                  <span>{h.time}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="ldir__col" data-info>
            <span className="ldir__k">Contact</span>
            <a className="ldir__link" href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
              WhatsApp us <span aria-hidden="true">&rarr;</span>
            </a>
            <a className="ldir__link" href={MAPS_URL} target="_blank" rel="noopener noreferrer">
              Open in Google Maps <span aria-hidden="true">&rarr;</span>
            </a>
          </div>

          <div className="ldir__map" data-info>
            <iframe
              title="Map: The Legends Fitness, Links Road, Nyali"
              src={MAP_EMBED}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        </div>
      </div>
    </section>
  );
}
