import { createPublicClient } from "@/lib/supabase/public";
import FinalCtaShell from "./FinalCtaShell";
import SectionHeader from "./SectionHeader";
import RectCta from "./RectCta";
import "./FinalCta.css";

/** Lowest active plan price (the day pass, normally) for "Begin your journey from …". */
async function loadFromPrice(): Promise<number | null> {
  const supabase = createPublicClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("plans")
    .select("price_kes")
    .eq("is_active", true)
    .order("price_kes", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data as { price_kes: number } | null)?.price_kes ?? null;
}

export default async function FinalCta() {
  const from = await loadFromPrice();

  return (
    <FinalCtaShell>
      <div className="lfc__bg" aria-hidden="true">
        <img src="/images/cta/bg.webp" alt="" loading="lazy" decoding="async" />
      </div>

      <div className="lfc__card">
        <SectionHeader
          tone="light"
          size="clamp(2.8rem, 5.4vw, 4.4rem)"
          eyebrow="Your next step"
          lines={[{ text: "Join the" }, { text: "Legends.", accent: true }]}
          start="top 92%"
          delay={0.3}
        />
        <p className="lfc__text" data-fade>
          Begin your journey
          {from !== null && (
            <>
              {" "}from <strong>KES {from.toLocaleString("en-KE")}</strong>
            </>
          )}{" "}
          &mdash; or try a single class first. No lock-in.
        </p>
        <div className="lfc__actions" data-fade>
          <RectCta href="/#plans" label="Join now" tone="red" appear="none" />
          <RectCta href="/book" label="Try a class" tone="ink" appear="none" />
        </div>
      </div>
    </FinalCtaShell>
  );
}
