// Captioned video frames: node scripts/frames.mjs <list> <outdir> <prefix>
import sharp from "sharp"; import { readFileSync } from "node:fs";
const [list, out, pre] = process.argv.slice(2);
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
let i = 0;
for (const line of readFileSync(list, "utf8").trim().split("\n")) {
  const [img, cap] = line.split("|"); i++;
  const shot = await sharp("../docs/" + img).resize(390, 844).toBuffer();
  const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="420" height="960"><rect width="420" height="960" fill="#1b2140"/>
<text x="210" y="905" font-family="Helvetica, Arial" font-weight="700" font-size="18" fill="#fff" text-anchor="middle">${esc(cap)}</text></svg>`);
  await sharp(bg).composite([{ input: shot, left: 15, top: 16 }]).png().toFile(`${out}/${pre}-${i}.png`);
}
console.log(pre, i, "frames");
