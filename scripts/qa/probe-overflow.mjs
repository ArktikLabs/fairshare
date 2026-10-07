// List elements that stick out past the viewport.
// Usage: WIDTH=390 node scripts/qa/probe-overflow.mjs <email> <path>
import { chromium } from "playwright";
import { BASE, apiLogin } from "./lib.mjs";
const [email, p] = process.argv.slice(2);
const W = Number(process.env.WIDTH || 390);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: W, height: 844 } });
await apiLogin(ctx, email);
const page = await ctx.newPage();
await page.goto(BASE + p, { waitUntil: "networkidle" });
const out = await page.evaluate((W) => {
  const rows = [];
  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect();
    if (r.right > W + 1 && r.width > 0) {
      const parentOk = el.parentElement && el.parentElement.getBoundingClientRect().right <= W + 1;
      if (parentOk) rows.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 90)} right=${Math.round(r.right)} w=${Math.round(r.width)}`);
    }
  }
  return { sw: document.documentElement.scrollWidth, rows: rows.slice(0, 15) };
}, W);
console.log(JSON.stringify(out, null, 1));
await b.close();
