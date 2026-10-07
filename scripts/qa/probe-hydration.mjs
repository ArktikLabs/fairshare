// Load a page (optionally N times) and report page errors, console errors and
// failed requests with their URLs. Usage:
//   node scripts/qa/probe-hydration.mjs <email> <path> [times]
import { chromium } from "playwright";
import { BASE, PASSWORD, apiLogin } from "./lib.mjs";
const [email, p, times = "1"] = process.argv.slice(2);
const b = await chromium.launch();
// BROWSER_TZ: run the browser in another zone than the server to catch zone-dependent renders.
const ctx = await b.newContext({ viewport: { width: Number(process.env.WIDTH || 1280), height: 900 }, timezoneId: process.env.BROWSER_TZ || "Asia/Jakarta" });
await apiLogin(ctx, email, PASSWORD);
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push("pageerror: " + e.message.slice(0, 200)));
page.on("console", (m) => m.type() === "error" && errs.push("console: " + m.text().slice(0, 300)));
page.on("response", (r) => r.status() >= 400 && errs.push(`HTTP ${r.status()} ${r.request().method()} ${r.url()}`));
for (let i = 0; i < Number(times); i++) {
  await page.goto(BASE + p, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
}
console.log(errs.length ? errs.join("\n") : "clean");
await b.close();
