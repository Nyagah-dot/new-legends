#!/usr/bin/env node
// Compresses a raw video into a lightweight, web-ready video plus its poster frame, using ffmpeg.
//
// Usage (run from the project root):
//   node scripts/optimize-video.mjs "C:\Users\Angie\Videos\originals\raw-hero.mov"
//   node scripts/optimize-video.mjs ./raw-pricing.mp4 --out=/videos/pricing
//   node scripts/optimize-video.mjs ./raw-coaches.mp4 --out=/videos/coachesbg --width=1080
//
// --out=/videos/<name>  where to write it inside public/ (default /videos/hero)
// --width=<pixels>      the width to shrink to (default 1920). Never enlarges a smaller video.
//                       A portrait video keeps its shape; use a smaller width for it, such as 1080.
// Keep your ORIGINAL videos outside the project: the input must not be the file the script writes.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";

const args = process.argv.slice(2);
const flag = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
const input = args.find((a) => !a.startsWith("--"));
const outPath = flag("out") ?? "/videos/hero";
const width = Number(flag("width") ?? 1920);

if (!input) {
  console.error("Usage: node scripts/optimize-video.mjs <path-to-raw-video> [--out=/videos/hero] [--width=1920]");
  process.exit(1);
}
if (!existsSync(input)) {
  console.error(`File not found: ${input}`);
  process.exit(1);
}
if (!Number.isInteger(width) || width < 320 || width > 3840) {
  console.error("--width must be a whole number between 320 and 3840.");
  process.exit(1);
}
if (!outPath.startsWith("/")) {
  console.error('--out must start with a slash, e.g. --out=/videos/pricing');
  process.exit(1);
}

const outVideo = resolve("public" + outPath + ".mp4");
const outPoster = resolve("public" + outPath + "-poster.jpg");
if (resolve(input) === outVideo) {
  console.error(`The input and the output are the same file:\n  ${outVideo}\nMove your original video outside the project (for example C:\\Users\\Angie\\Videos\\originals) and use that path.`);
  process.exit(1);
}
mkdirSync(dirname(outVideo), { recursive: true });

function run(label, ffArgs) {
  console.log(`\n${label}`);
  execFileSync("ffmpeg", ffArgs, { stdio: "inherit" });
}

try {
  run("Compressing video (this can take a minute)...", [
    "-y",
    "-i", input,
    "-vf", `scale='min(${width},iw)':-2`,
    "-an",
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-crf", "26",
    "-preset", "slow",
    "-movflags", "+faststart",
    outVideo,
  ]);
  run("Extracting poster frame...", [
    "-y",
    "-i", outVideo,
    "-frames:v", "1",
    "-update", "1",
    "-q:v", "3",
    outPoster,
  ]);
} catch {
  console.error("\nffmpeg failed to run. Is it installed and on your PATH?");
  console.error("  Windows:  winget install Gyan.FFmpeg   (then close and reopen your terminal)");
  console.error("  Mac:      brew install ffmpeg");
  console.error("  Linux:    sudo apt install ffmpeg");
  process.exit(1);
}

const mb = (f) => (statSync(f).size / 1048576).toFixed(1) + " MB";
console.log(`\nDone.`);
console.log(`  Video:  ${outVideo}  (${mb(outVideo)})`);
console.log(`  Poster: ${outPoster}  (${mb(outPoster)})`);
