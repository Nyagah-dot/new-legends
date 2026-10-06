# The Legends Fitness — Next.js site

Next.js 16 (App Router) + React 19 + TypeScript. Plain CSS in `src/app/globals.css` (ported from the wireframe).

## Run

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
```

Requires Node 20.9+.

## Where things live

- `src/lib/site.ts` — timetable route (`TIMETABLE_HREF`), WhatsApp URL and socials (TODO), maps link
- `src/components/` — one component per section, `Nav` and `RevealObserver` are client components
- `public/videos/` — drop `hero.mp4` (and optionally `hero.webm`) here for the hero background

## Notes

- All "Book a session" CTAs route to `/#classes` (the timetable section).
- Fonts load via `next/font/google` (Manrope, Instrument Serif, Space Mono) and need internet on first build.
