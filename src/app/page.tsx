import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import PostHero from "@/components/PostHero";
import PostHeroGrid from "@/components/PostHeroGrid";
import Why from "@/components/Why";
import Timetable from "@/components/Timetable";
import Steps from "@/components/Steps";
import Tour from "@/components/Tour";
import Coaches from "@/components/Coaches";
import Testimonials from "@/components/Testimonials";
import Pricing from "@/components/Pricing";
import Location from "@/components/Location";
import FinalCta from "@/components/FinalCta";
import Footer from "@/components/Footer";
import PageWipe from "@/components/PageWipe";
import SmoothScroll from "@/components/SmoothScroll";
import Improv from "@/components/Improv";



// The timetable comes from the database and is read fresh on every visit,
// so changes made in Admin -> Classes appear straight away.
export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <>
      <PageWipe />
      <SmoothScroll />
      <a href="#main" className="skip">Skip to content</a>
      <Nav />
      <main id="main">
        <Hero />
        <PostHero />
        <PostHeroGrid />
        <Why />
        <Improv />      
        {/* <Timetable /> */}
        {/* <Steps /> */}
        <Tour />
        <Coaches />
        {/* <Testimonials /> */}
        <Timetable /> 
        <Pricing />
        <Location />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}