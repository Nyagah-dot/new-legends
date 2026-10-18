"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import CircleCta from "./CircleCta";
import SectionHeader from "./SectionHeader";
import { MAPS_URL, WHATSAPP_URL } from "@/lib/site";
import "./Directions.css";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const BG_SRC = "/images/directions/bg.webp";
const INLINE_SRC = "/images/directions/inline.webp";

const FORM_TITLE = ["Book a", "visit"];
const FORM_LEAD = "Tell us when you’re coming and we’ll meet you at the door.";

const ADDRESS = ["The Legends Fitness", "Links Road, Nyali", "Mombasa, Kenya"];
const PARKING = "Secure on-site parking.";

/** days use JS numbering: 0 = Sunday … 6 = Saturday. Times are 24h, Nairobi. */
const HOURS = [
  { label: "Mon – Fri", days: [1, 2, 3, 4, 5], open: 5, close: 22 },
  { label: "Saturday", days: [6], open: 6, close: 20 },
  { label: "Sunday", days: [0], open: 7, close: 18 },
] as const;

const hoursText = (h: (typeof HOURS)[number]) => `${h.open}:00 – ${h.close}:00`;

/** Day + minutes since midnight, in Nairobi, whatever the visitor's timezone. */
function nairobiNow(): { day: number; mins: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { day, mins: Number(get("hour")) * 60 + Number(get("minute")) };
}

function openStatus(now: { day: number; mins: number }): { open: boolean; text: string } {
  const today = HOURS.find((h) => (h.days as readonly number[]).includes(now.day));
  if (today && now.mins >= today.open * 60 && now.mins < today.close * 60) {
    return { open: true, text: `Open now · until ${today.close}:00` };
  }
  if (today && now.mins < today.open * 60) return { open: false, text: `Opens today ${today.open}:00` };
  const next = HOURS.find((h) => (h.days as readonly number[]).includes((now.day + 1) % 7));
  return { open: false, text: next ? `Closed · opens tomorrow ${next.open}:00` : "Closed" };
}

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

const PinIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const Arrow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" aria-hidden="true">
    <path d="M6 18L18 6M8 6h10v10" />
  </svg>
);

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
  const [formMsg, setFormMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [mapOn, setMapOn] = useState(false);
  const [now, setNow] = useState<{ day: number; mins: number } | null>(null);

  // client-only (avoids a server/client mismatch); refreshed every minute
  useEffect(() => {
    const tick = () => setNow(nairobiNow());
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);
  const status = now ? openStatus(now) : null;
  const todayIdx = now ? HOURS.findIndex((h) => (h.days as readonly number[]).includes(now.day)) : -1;

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
      setFormMsg(typeof msg === "string" ? msg : "Thanks — we’ll see you soon.");
    } catch {
      setFormMsg("Something went wrong. Please try again, or message us on WhatsApp.");
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
            <p className="ldir__status" role="status" aria-live="polite">{formMsg}</p>
          </form>
        </div>

        {/* circle CTA straddles the bottom edge, like the reference */}
        <div className="ldir__cta">
          <CircleCta href={MAPS_URL} label="Get directions" size="var(--ldir-cta)" appear="scroll" delay={0.3} />
        </div>
      </div>

      {/* ------------------------------------------- info: address / hours / contact / map */}
      <div className="ldir__info">
        <div className="ldir__infowrap">
          <SectionHeader
            className="ldir__infohead"
            eyebrow="Visit us"
            lines={[{ text: "Where we are" }, { text: "and when we’re open.", accent: true }]}
            rule
          />

          <div className="ldir__infogrid">
            <article className="ldir__card ldir__card--addr" data-info>
              <span className="ldir__k">Address</span>
              <h3 className="ldir__big">{ADDRESS[0]}</h3>
              <address>
                {ADDRESS.slice(1).map((l) => (
                  <span key={l}>{l}</span>
                ))}
              </address>
              <p className="ldir__chip">
                <i aria-hidden="true">P</i>
                {PARKING}
              </p>
            </article>

            <article className="ldir__card ldir__card--hours" data-info>
              <div className="ldir__cardhead">
                <span className="ldir__k">Opening hours</span>
                <span className={`ldir__status${status?.open ? " is-open" : ""}`} aria-live="polite">
                  {status && (
                    <>
                      <i aria-hidden="true" />
                      {status.text}
                    </>
                  )}
                </span>
              </div>
              <ul className="ldir__hours">
                {HOURS.map((h, i) => (
                  <li key={h.label} className={i === todayIdx ? "is-today" : undefined}>
                    <b>
                      {h.label}
                      {i === todayIdx && <em>Today</em>}
                    </b>
                    <span>{hoursText(h)}</span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="ldir__card ldir__card--contact" data-info>
              <span className="ldir__k">Contact</span>
              <div className="ldir__rows">
                <a className="ldir__rowlink" href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                  <span className="ldir__ico"><WhatsAppIcon /></span>
                  <span className="ldir__lbl">WhatsApp us</span>
                  <i><Arrow /></i>
                </a>
                <a className="ldir__rowlink" href={MAPS_URL} target="_blank" rel="noopener noreferrer">
                  <span className="ldir__ico"><PinIcon /></span>
                  <span className="ldir__lbl">Open in Google Maps</span>
                  <i><Arrow /></i>
                </a>
              </div>
            </article>

            <div className="ldir__map" data-info onMouseLeave={() => setMapOn(false)}>
              <iframe
                className={mapOn ? "is-live" : undefined}
                title="Map: The Legends Fitness, Links Road, Nyali"
                src={MAP_EMBED}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
              <a className="ldir__maplink" href={MAPS_URL} target="_blank" rel="noopener noreferrer">
                Open in Maps <Arrow />
              </a>
              {mapOn ? (
                <button type="button" className="ldir__mapbtn ldir__mapbtn--done" onClick={() => setMapOn(false)}>
                  Done
                </button>
              ) : (
                <button type="button" className="ldir__mapgate" onClick={() => setMapOn(true)} aria-label="Activate map to pan and zoom">
                  <span className="ldir__mapbtn">Explore map</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
