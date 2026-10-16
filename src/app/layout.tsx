import type { Metadata } from "next";
import { Manrope, Instrument_Serif, Space_Mono, League_Gothic } from "next/font/google";
import "./globals.css";

const sans = Manrope({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});
const mono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-mono",
  display: "swap",
});

// Ultra-condensed display face for the hero headline (and the page-wipe wordmark).
const condensed = League_Gothic({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-condensed",
  display: "swap",
});

export const metadata: Metadata = {
  title: "THE LEGENDS FITNESS — Nyali, Mombasa",
  description:
    "Serious strength & conditioning in Nyali, Mombasa — with a real path in for beginners.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} ${mono.variable} ${condensed.variable}`}>
      <body>{children}</body>
    </html>
  );
}
