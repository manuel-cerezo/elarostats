/**
 * Generate PNG icons and OG image from the favicon SVG.
 * Uses Node.js canvas-free approach with sharp if available,
 * otherwise falls back to writing SVGs that can be converted manually.
 */
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");

// Apple touch icon SVG (180x180)
const appleTouchSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">
  <rect width="180" height="180" rx="40" fill="#f97316"/>
  <text x="90" y="118" text-anchor="middle" font-size="80" font-weight="bold" fill="white" font-family="system-ui, -apple-system, sans-serif">E</text>
</svg>`;

// 192x192 icon
const icon192Svg = `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192">
  <rect width="192" height="192" rx="40" fill="#f97316"/>
  <text x="96" y="126" text-anchor="middle" font-size="86" font-weight="bold" fill="white" font-family="system-ui, -apple-system, sans-serif">E</text>
</svg>`;

// 512x512 icon
const icon512Svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="100" fill="#f97316"/>
  <text x="256" y="330" text-anchor="middle" font-size="230" font-weight="bold" fill="white" font-family="system-ui, -apple-system, sans-serif">E</text>
</svg>`;

// OG image (1200x630)
const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#030712"/>
  <circle cx="300" cy="315" r="120" fill="#f97316"/>
  <text x="300" y="362" text-anchor="middle" font-size="120" font-weight="bold" fill="white" font-family="system-ui, -apple-system, sans-serif">E</text>
  <text x="520" y="290" font-size="72" font-weight="800" fill="white" font-family="system-ui, -apple-system, sans-serif">elaro<tspan fill="#f97316">stats</tspan></text>
  <text x="520" y="370" font-size="32" fill="#9ca3af" font-family="system-ui, -apple-system, sans-serif">NBA Stats &amp; Analytics</text>
  <text x="520" y="420" font-size="24" fill="#6b7280" font-family="system-ui, -apple-system, sans-serif">DPM · RAPM · Live Scores · Team Rosters</text>
</svg>`;

// Write SVG files as fallback (these work as OG images in many crawlers)
writeFileSync(join(publicDir, "apple-touch-icon.svg"), appleTouchSvg);
writeFileSync(join(publicDir, "icon-192.svg"), icon192Svg);
writeFileSync(join(publicDir, "icon-512.svg"), icon512Svg);
writeFileSync(join(publicDir, "og-default.svg"), ogSvg);

console.log("SVG icons generated in public/");
console.log("For PNG versions, convert with: npx @aspect-ratio/cli or use an online converter");

// Try using sharp to generate PNGs
try {
  const { default: sharp } = await import("sharp");

  await Promise.all([
    sharp(Buffer.from(appleTouchSvg))
      .resize(180, 180)
      .png()
      .toFile(join(publicDir, "apple-touch-icon.png")),
    sharp(Buffer.from(icon192Svg))
      .resize(192, 192)
      .png()
      .toFile(join(publicDir, "icon-192.png")),
    sharp(Buffer.from(icon512Svg))
      .resize(512, 512)
      .png()
      .toFile(join(publicDir, "icon-512.png")),
    sharp(Buffer.from(ogSvg))
      .resize(1200, 630)
      .png()
      .toFile(join(publicDir, "og-default.png")),
  ]);
  console.log("PNG icons generated successfully!");
} catch {
  console.log("sharp not available, using SVG files only");
  console.log("Install sharp for PNG generation: npm install sharp");
}
