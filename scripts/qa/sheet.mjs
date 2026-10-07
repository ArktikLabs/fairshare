// Contact sheet of screenshots for quick visual review:
//   node scripts/qa/sheet.mjs <dir> <out.png> [filter-regex] [cols]
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
const [dir, out, filter = ".", colsArg] = process.argv.slice(2);
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".png") && new RegExp(filter).test(f)).sort();
const W = Number(process.env.TILE_W || 420), H = Number(process.env.TILE_H || 560), cols = Number(colsArg || 4), rows = Math.ceil(files.length / cols);
const tiles = await Promise.all(
  files.map(async (f, i) => {
    // Full width, top of the page (long pages are cut at the bottom)
    const scaled = await sharp(path.join(dir, f)).resize({ width: W }).toBuffer();
    const meta = await sharp(scaled).metadata();
    const img = await sharp(scaled).extract({ left: 0, top: 0, width: W, height: Math.min(H, meta.height) }).toBuffer();
    const label = Buffer.from(`<svg width="${W}" height="22"><rect width="100%" height="100%" fill="#111"/><text x="4" y="16" font-size="14" fill="#fff" font-family="sans-serif">${f}</text></svg>`);
    return [
      { input: img, left: (i % cols) * W, top: Math.floor(i / cols) * (H + 22) + 22 },
      { input: label, left: (i % cols) * W, top: Math.floor(i / cols) * (H + 22) },
    ];
  })
);
await sharp({ create: { width: cols * W, height: rows * (H + 22), channels: 3, background: "#ccc" } })
  .composite(tiles.flat())
  .png()
  .toFile(out);
console.log(out, files.length);
