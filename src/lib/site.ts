// Central place for links and contact details.

/** Every "Book a session" CTA (and other CTAs) routes here. */
export const TIMETABLE_HREF = "/#classes";

/** TODO: wire the real WhatsApp link, e.g. https://wa.me/254XXXXXXXXX */
export const WHATSAPP_URL: string = "#";

/** TODO: wire real socials later. */
export const SOCIALS: { label: string; href: string }[] = [];

export const MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=The+Legends+Fitness+Links+Road+Nyali+Mombasa";

/**
 * Can clients book a 1-to-1 session online yet? Keep this false until the member booking page
 * exists (patch 26 turns it on). While false, the "Available this week" section tells visitors
 * to ask at the front desk instead of showing a button to a page that isn't there.
 */
export const ONE_TO_ONE_ONLINE = true;

/** Where the "book a 1-to-1" button goes once online booking is on. */
export const ONE_TO_ONE_HREF = "/login?next=%2Faccount%2Ftrainers";
