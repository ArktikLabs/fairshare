// Shared helpers for the Playwright QA scripts (see docs/TESTING.md).
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export const BASE = (process.env.BASE_URL || "http://localhost:3810").replace(/\/+$/, "");
export const OUT = path.resolve(process.env.OUT_DIR || "qa-shots");
export const WIDTH = Number(process.env.WIDTH || 1280);
export const PASSWORD = "Passw0rd!x";
export const RUN = process.env.RUN_ID || Date.now().toString(36);
// Reserved test domain: the mailer never sends to it (RFC 2606/6761)
export const DOMAIN = process.env.TEST_EMAIL_DOMAIN || "demo.test";
fs.mkdirSync(OUT, { recursive: true });

export const report = [];

/** Run SQL in the dev DB container (only for things the UI cannot show, e.g. reset tokens). */
export function sql(q) {
  const container = process.env.DB_CONTAINER || "fairshare-dev-db";
  return execFileSync(
    "docker",
    ["exec", container, "psql", "-U", process.env.DB_USER || "postgres", "-d", process.env.DB_NAME || "fairshare", "-tAc", q],
    { encoding: "utf8", env: { ...process.env, PATH: `/usr/bin:${process.env.PATH}` } }
  ).trim();
}

export async function launch() {
  return chromium.launch();
}

/** A browser context at the configured width with console/overflow tracking. */
export async function newPage(browser, { width = WIDTH } = {}) {
  const ctx = await browser.newContext({
    viewport: { width, height: width < 500 ? 844 : 900 },
    deviceScaleFactor: 1,
    isMobile: width < 500,
    hasTouch: width < 500,
    timezoneId: "Asia/Jakarta",
    permissions: ["clipboard-read", "clipboard-write"],
  });
  ctx.setDefaultTimeout(Number(process.env.STEP_TIMEOUT || 12000));
  ctx.setDefaultNavigationTimeout(30000);
  const page = await ctx.newPage();
  page.errs = [];
  page.on("console", (m) => {
    const t = m.text();
    if ((m.type() === "error" || /hydrat/i.test(t)) && !page.expectErrors) page.errs.push(`${page.url().replace(BASE, "")} :: ${t.slice(0, 220)}`);
  });
  page.on("pageerror", (e) => page.errs.push(`pageerror ${page.url().replace(BASE, "")} :: ${e.message.slice(0, 220)}`));
  page.on("dialog", (d) => {
    page.errs.push(`native dialog (${d.type()}): ${d.message().slice(0, 120)}`);
    d.accept();
  });
  return { ctx, page };
}

let counter = Number(process.env.START_AT || 1);
/** Screenshot + overflow check. Name pattern NN-flow-step-WIDTH.png. */
export async function snap(page, flow, step, { full = true } = {}) {
  await page.waitForTimeout(350);
  const n = String(counter++).padStart(2, "0");
  let overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  const file = `${n}-${flow}-${step}-${page.viewportSize().width}.png`;
  const png = await page.screenshot({ path: path.join(OUT, file), fullPage: full });
  // scrollWidth can miss content that only widens during the full-page capture; the PNG can't.
  overflow = Math.max(overflow, png.readUInt32BE(16) - page.viewportSize().width);
  const errs = page.errs.splice(0);
  report.push({ file, overflow, errs });
  const bad = overflow > 0 || errs.length;
  console.log(`${bad ? "FAIL" : "ok  "} ${file}${overflow > 0 ? ` overflow=${overflow}` : ""}${errs.length ? " errs: " + errs.join(" | ") : ""}`);
  return file;
}

/** Run a step; failures are recorded instead of aborting the whole run. */
export async function step(name, fn) {
  try {
    await fn();
  } catch (e) {
    report.push({ file: `STEP ${name}`, overflow: 0, errs: [String(e.message || e).split("\n")[0].slice(0, 300)] });
    console.log(`FAIL step ${name}: ${String(e.message || e).split("\n")[0].slice(0, 300)}`);
  }
}

export async function api(ctx, method, p, data) {
  const r = await ctx.request.fetch(BASE + p, { method, data, headers: { Origin: BASE } });
  let j = null;
  try {
    j = await r.json();
  } catch {}
  if (!r.ok()) console.log("API", method, p, r.status(), JSON.stringify(j)?.slice(0, 200));
  return j;
}

export async function apiLogin(ctx, email, password = PASSWORD) {
  const { csrfToken } = await api(ctx, "GET", "/api/auth/csrf");
  await ctx.request.post(BASE + "/api/auth/callback/credentials", { form: { email, password, csrfToken, json: "true" }, headers: { Origin: BASE } });
}

export async function apiUser(browser, tag, name) {
  const ctx = await browser.newContext();
  const email = `${tag}${RUN}@${DOMAIN}`;
  await api(ctx, "POST", "/api/auth/register", { email, password: PASSWORD, name, timezone: "Asia/Jakarta" });
  await apiLogin(ctx, email);
  const s = await api(ctx, "GET", "/api/auth/session");
  return { ctx, email, id: s.user.id, name };
}

/** Sign in through the real form. */
export async function uiLogin(page, email, password = PASSWORD, callbackUrl = "/dashboard") {
  await page.goto(`${BASE}/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click("form button[type=submit]");
  await page.waitForURL((u) => !u.pathname.startsWith("/auth/signin"), { timeout: 30000 });
}

export function summary() {
  const bad = report.filter((r) => r.overflow > 0 || r.errs.length);
  console.log(`\n${report.length - bad.length}/${report.length} ok`);
  fs.writeFileSync(path.join(OUT, `report-${WIDTH}.json`), JSON.stringify(report, null, 2));
  return bad.length;
}
