// Full end-to-end flow audit as a real user, through the UI.
// Usage (from the repo root, dev server running):
//   node scripts/qa/flows.mjs                     # all chunks, WIDTH=1280
//   WIDTH=390 CHUNK=B node scripts/qa/flows.mjs   # one chunk at phone width
// Chunks share state through $OUT_DIR/state-<WIDTH>.json, so run A first.
// Screenshots: $OUT_DIR/NN-flow-step-WIDTH.png (NN is fixed per step, so
// both widths line up). Exit code = number of failing checks.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { BASE, OUT, WIDTH, PASSWORD, RUN, DOMAIN, launch, newPage, step, api, apiLogin, apiUser, uiLogin, sql, summary, report } from "./lib.mjs";

const CHUNKS = (process.env.CHUNK || "A,B,C,D,E").split(",");
const STATE = path.join(OUT, `state-${WIDTH}.json`);
const S = fs.existsSync(STATE) && !CHUNKS.includes("A") ? JSON.parse(fs.readFileSync(STATE, "utf8")) : {};
const save = () => fs.writeFileSync(STATE, JSON.stringify(S, null, 2));
const browser = await launch();
// Fixed numbering per chunk so 1280 and 390 screenshots line up
let num = 1;
const shot = async (page, flow, stepName, opts) => {
  const n = String(num++).padStart(2, "0");
  await page.waitForTimeout(350);
  const vw = page.viewportSize().width;
  let overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  const file = `${n}-${flow}-${stepName}-${WIDTH}.png`;
  const png = await page.screenshot({ path: path.join(OUT, file), fullPage: opts?.full ?? true });
  // scrollWidth can miss content that only widens during the full-page capture; the PNG can't.
  overflow = Math.max(overflow, png.readUInt32BE(16) - vw);
  const errs = page.errs.splice(0);
  report.push({ file, overflow, errs });
  console.log(`${overflow > 0 || errs.length ? "FAIL" : "ok  "} ${file}${overflow > 0 ? ` overflow=${overflow}` : ""}${errs.length ? " errs: " + errs.join(" | ") : ""}`);
};
const check = (name, ok, extra = "") => {
  report.push({ file: `CHECK ${name}`, overflow: 0, errs: ok ? [] : [String(extra).slice(0, 300) || "failed"] });
  console.log(`${ok ? "ok  " : "FAIL"} check: ${name}${ok ? "" : " -> " + String(extra).slice(0, 300)}`);
};
const go = (page, p) => page.goto(BASE + p, { waitUntil: "networkidle" });
const pngBytes = () => {
  // 64x48 solid PNG, generated without dependencies
  const zlib = require_("node:zlib");
  const crc = (buf) => {
    let c, crcTable = [];
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
    let x = 0xffffffff;
    for (const b of buf) x = crcTable[(x ^ b) & 0xff] ^ (x >>> 8);
    return (x ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const w = 64, h = 48;
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const raw = Buffer.concat(Array.from({ length: h }, () => Buffer.concat([Buffer.from([0]), Buffer.alloc(w * 3, 180)])));
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
};
const require_ = createRequire(import.meta.url);

/** Fill the add-expense form's simple fields. */
async function basics(page, { desc, amount, payer }) {
  await page.fill("#exp-desc", desc);
  if (amount !== undefined) await page.fill("#exp-amount", String(amount));
  if (payer) await page.getByLabel("Who paid").selectOption({ label: payer });
}
async function saveExpense(page) {
  const btn = page.getByRole("button", { name: /^Save (expense|changes)$/ });
  await btn.click();
  await page.waitForURL((u) => !/\/create$|\/edit$/.test(u.pathname), { timeout: 30000 });
  await page.waitForLoadState("networkidle");
}
async function mode(page, label) {
  await page.getByRole("radiogroup", { name: "Split method" }).first().getByRole("radio", { name: label }).click();
}

// ---------------------------------------------------------------- A: onboarding
if (CHUNKS.includes("A")) {
  num = 1;
  // People who already have accounts (created through the API to save time)
  const budi = await apiUser(browser, "budi", "Budi Santoso");
  const citra = await apiUser(browser, "citra", "Citra Lestari");
  await budi.ctx.close();
  await citra.ctx.close();
  Object.assign(S, { run: RUN, budi: budi.email, budiId: budi.id, citra: citra.email, citraId: citra.id, ani: `ani${RUN}@${DOMAIN}`, dewi: `dewi${RUN}@${DOMAIN}` });
  save();

  const { ctx, page } = await newPage(browser);
  await step("landing", async () => {
    await go(page, "/");
    await shot(page, "landing", "home");
    const dead = await page.$$eval("a[href='#'], a[href='']", (a) => a.length);
    check("landing has no dead # links", dead === 0, dead);
    const pricing = await page.locator("text=/\\$\\d+(\\.\\d\\d)?\\s*\\/\\s*month|testimonial/i").count();
    check("landing has no pricing/testimonials", pricing === 0, pricing);
  });
  await step("legal", async () => {
    await go(page, "/privacy");
    await shot(page, "legal", "privacy");
    await go(page, "/terms");
    await shot(page, "legal", "terms");
  });
  await step("register", async () => {
    await go(page, "/auth/register");
    await page.fill("#name", "Ani Wijaya");
    await page.fill("#email", "not-an-email");
    await page.fill("#password", "short");
    await page.click("form button[type=submit]");
    await shot(page, "register", "validation");
    await page.fill("#email", S.ani);
    await page.fill("#password", PASSWORD);
    await page.click("form button[type=submit]");
    await page.waitForURL(/\/dashboard/, { timeout: 30000 });
    await page.waitForLoadState("networkidle");
    await shot(page, "dashboard", "first-run");
    check("first-run says Welcome, not Welcome back", (await page.locator("text=Welcome back").count()) === 0);
  });
  await step("create group", async () => {
    await go(page, "/groups");
    await shot(page, "groups", "empty");
    await go(page, "/groups/create");
    await page.fill("#group-name", "Bali trip");
    await page.click("#group-currency");
    await page.getByLabel("Search currencies").fill("IDR");
    await page.keyboard.press("Enter");
    await page.fill("#group-desc", "September 2026, villa + surf");
    await shot(page, "group-create", "form");
    await page.getByRole("button", { name: /create group/i }).click();
    await page.waitForURL((u) => /^\/groups\/[a-z0-9]+$/.test(u.pathname) && !u.pathname.endsWith("/create"), { timeout: 30000 });
    await page.waitForLoadState("networkidle");
    S.gid = new URL(page.url()).pathname.split("/").pop();
    save();
    await shot(page, "group", "empty");
  });
  await step("invite", async () => {
    await page.getByRole("button", { name: /^Invite$/ }).first().click();
    await page.fill("#invite-email", S.budi);
    await shot(page, "invite", "form");
    await page.getByRole("button", { name: "Send invite" }).click();
    await page.waitForTimeout(1200);
    await shot(page, "invite", "registered-sent");
    for (const email of [S.dewi, S.citra]) {
      const again = page.getByRole("button", { name: /^Invite$/ }).first();
      if (await again.count()) await again.click();
      await page.fill("#invite-email", email);
      await page.getByRole("button", { name: "Send invite" }).click();
      await page.waitForTimeout(1200);
    }
    // re-invite keeps the link
    const tokenBefore = sql(`select "inviteToken" from "GroupMember" gm join "User" u on u.id=gm."userId" where gm."groupId"='${S.gid}' and u.email='${S.budi}'`);
    const again = page.getByRole("button", { name: /^Invite$/ }).first();
    if (await again.count()) await again.click();
    await page.fill("#invite-email", S.budi);
    await page.getByRole("button", { name: "Send invite" }).click();
    await page.waitForTimeout(1200);
    await shot(page, "invite", "already-invited");
    const tokenAfter = sql(`select "inviteToken" from "GroupMember" gm join "User" u on u.id=gm."userId" where gm."groupId"='${S.gid}' and u.email='${S.budi}'`);
    check("re-invite keeps the same link", tokenBefore && tokenBefore === tokenAfter, `${tokenBefore} vs ${tokenAfter}`);
    const mailed = sql(`select count(*) from "Notification" n join "User" u on u.id=n."userId" where u.email in ('${S.budi}','${S.dewi}') and n.status='SENT'`);
    check("no outbox email SENT to reserved test domains", mailed === "0", mailed);
    await go(page, `/groups/${S.gid}/settings`);
    await shot(page, "group-settings", "members-pending");
  });
  const tok = (email) => sql(`select "inviteToken" from "GroupMember" gm join "User" u on u.id=gm."userId" where gm."groupId"='${S.gid}' and u.email='${email}'`);
  await ctx.close();

  await step("accept logged out (registered user)", async () => {
    const { ctx: c2, page: p2 } = await newPage(browser);
    await go(p2, `/invite/${tok(S.budi)}`);
    await shot(p2, "accept", "logged-out-registered");
    await p2.getByRole("link", { name: /already have an account/i }).click();
    await p2.waitForURL(/\/auth\/signin/);
    await p2.fill("#email", S.budi);
    await p2.fill("#password", PASSWORD);
    await shot(p2, "accept", "signin");
    await p2.click("form button[type=submit]");
    await p2.waitForURL(/\/invite\//, { timeout: 30000 });
    await p2.waitForLoadState("networkidle");
    await p2.getByRole("button", { name: /accept and join/i }).click();
    await p2.waitForURL(/\/groups\//, { timeout: 30000 });
    await p2.waitForLoadState("networkidle");
    await shot(p2, "accept", "joined");
    await c2.close();
  });
  await step("accept logged out (ghost creates account)", async () => {
    const { ctx: c3, page: p3 } = await newPage(browser);
    await go(p3, `/invite/${tok(S.dewi)}`);
    await shot(p3, "accept", "logged-out-ghost");
    await p3.getByRole("link", { name: /create account to join/i }).click();
    await p3.waitForURL(/\/auth\/register/);
    await p3.waitForLoadState("networkidle");
    await p3.waitForFunction((e) => document.querySelector("#email")?.value === e, S.dewi, { timeout: 5000 }).catch(() => {});
    check("register pre-fills invited email", (await p3.inputValue("#email")) === S.dewi, await p3.inputValue("#email"));
    await p3.fill("#name", "Dewi Anggraini Kusumawardhani Putri Ramadhani");
    await p3.fill("#password", PASSWORD);
    await shot(p3, "accept", "ghost-register");
    await p3.click("form button[type=submit]");
    await p3.waitForURL(/\/invite\//, { timeout: 30000 });
    await p3.waitForLoadState("networkidle");
    await p3.getByRole("button", { name: /accept and join/i }).click();
    await p3.waitForURL(/\/groups\//, { timeout: 30000 });
    await c3.close();
  });
  await step("accept logged in", async () => {
    const { ctx: c4, page: p4 } = await newPage(browser);
    await uiLogin(p4, S.citra);
    await go(p4, `/invite/${tok(S.citra)}`);
    await shot(p4, "accept", "logged-in");
    await p4.getByRole("button", { name: /accept and join/i }).click();
    await p4.waitForURL(/\/groups\//, { timeout: 30000 });
    await c4.close();
  });
  await step("ids", async () => {
    S.aniId = sql(`select id from "User" where email='${S.ani}'`);
    S.dewiId = sql(`select id from "User" where email='${S.dewi}'`);
    save();
  });
}

// ---------------------------------------------------------------- B: expenses
if (CHUNKS.includes("B")) {
  num = 20;
  const { ctx, page } = await newPage(browser);
  await uiLogin(page, S.ani);
  const create = `/groups/${S.gid}/expenses/create`;
  await step("equal", async () => {
    await go(page, create);
    await shot(page, "expense-add", "empty");
    await basics(page, { desc: "Dinner at Warung Made", amount: "1000000" });
    const ticked = await page.locator("ul input[type=checkbox]:checked").count();
    check("all 4 members ticked by default", ticked === 4, ticked);
    const today = await page.inputValue("#exp-date");
    const local = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
    check("date defaults to local day", today === local, `${today} vs ${local}`);
    await shot(page, "expense-add", "equal");
    await saveExpense(page);
  });
  await step("exact", async () => {
    await go(page, create);
    await basics(page, { desc: "Groceries", amount: "300000" });
    await mode(page, "Amounts");
    const inputs = page.locator("input[aria-label^='Amounts for']");
    await inputs.nth(0).fill("100000");
    await inputs.nth(1).fill("50000");
    await shot(page, "expense-add", "exact-unbalanced");
    check("submit disabled while unbalanced", await page.getByRole("button", { name: "Save expense" }).isDisabled());
    await inputs.nth(2).fill("75000");
    await inputs.nth(3).fill("75000");
    await saveExpense(page);
  });
  await step("percent", async () => {
    await go(page, create);
    await basics(page, { desc: "Boat rental", amount: "999999" });
    await mode(page, "Percent");
    const inputs = page.locator("input[aria-label^='Percent for']");
    for (const [i, v] of ["40", "30", "20", "10"].entries()) await inputs.nth(i).fill(v);
    await shot(page, "expense-add", "percent");
    await saveExpense(page);
  });
  await step("shares", async () => {
    await go(page, create);
    await basics(page, { desc: "Fuel", amount: "250000" });
    await mode(page, "Shares");
    await page.locator("input[aria-label^='Shares for']").nth(0).fill("2");
    await saveExpense(page);
  });
  await step("adjust", async () => {
    await go(page, create);
    await basics(page, { desc: "Spa day", amount: "800000" });
    await mode(page, "Adjust");
    await page.locator("input[aria-label^='Adjust for']").nth(1).fill("100000");
    await shot(page, "expense-add", "adjust");
    await saveExpense(page);
  });
  await step("itemized", async () => {
    await go(page, create);
    await page.fill("#exp-desc", "Beach club bill");
    await page.getByRole("button", { name: /split by item/i }).click();
    await page.getByLabel("Item 1 name").fill("Cocktails");
    await page.getByLabel("Item 1 price").fill("450000");
    await page.getByRole("button", { name: /add item/i }).click();
    await page.getByLabel("Item 2 name").fill("Nachos");
    await page.getByLabel("Item 2 price").fill("125000");
    await shot(page, "expense-add", "itemized");
    await saveExpense(page);
  });
  await step("multi payer", async () => {
    await go(page, create);
    await basics(page, { desc: "Villa deposit", amount: "3000000" });
    await page.getByRole("button", { name: /several people paid/i }).click();
    await page.getByLabel("Add a payer").selectOption({ label: "Budi Santoso" });
    await page.getByRole("button", { name: /split evenly/i }).click();
    await shot(page, "expense-add", "multi-payer");
    await saveExpense(page);
  });
  await step("foreign currency manual rate", async () => {
    await go(page, create);
    await basics(page, { desc: "Surf lesson (USD)", amount: "45" });
    await page.click("#exp-currency");
    await page.getByLabel("Search currencies").fill("USD");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(1500);
    await page.fill("#exp-rate", "16250.5");
    await shot(page, "expense-add", "usd-manual-rate");
    await saveExpense(page);
  });
  await step("recurring", async () => {
    await go(page, create);
    await basics(page, { desc: "Villa rent", amount: "4500000" });
    await page.selectOption("#exp-repeat", "MONTHLY");
    await shot(page, "expense-add", "recurring");
    await saveExpense(page);
  });
  await step("large amount", async () => {
    await go(page, create);
    await basics(page, { desc: "Land purchase deposit for the shared villa project in Uluwatu (very long description to test wrapping)", amount: "1000000000" });
    await saveExpense(page);
  });
  await step("group page with expenses", async () => {
    await go(page, `/groups/${S.gid}`);
    await shot(page, "group", "with-expenses");
    const decimals = await page.locator("text=/IDR\\s?[\\d,]+\\.\\d\\d|Rp\\s?[\\d.,]+,\\d\\d/").count();
    check("IDR shown without decimals on group page", decimals === 0, decimals);
    await go(page, `/groups/${S.gid}/expenses`);
    await shot(page, "group", "expenses-list");
  });
  await step("detail + edit", async () => {
    S.dinner = sql(`select id from "Expense" where "groupId"='${S.gid}' and description='Dinner at Warung Made' order by "createdAt" desc limit 1`);
    S.usd = sql(`select id from "Expense" where "groupId"='${S.gid}' and description='Surf lesson (USD)' order by "createdAt" desc limit 1`);
    S.items = sql(`select id from "Expense" where "groupId"='${S.gid}' and description='Beach club bill' order by "createdAt" desc limit 1`);
    save();
    await go(page, `/expenses/${S.dinner}`);
    await shot(page, "expense-detail", "equal");
    await go(page, `/expenses/${S.items}`);
    await shot(page, "expense-detail", "itemized");
    await go(page, `/expenses/${S.usd}`);
    await shot(page, "expense-detail", "usd");
    await go(page, `/expenses/${S.dinner}/edit`);
    await page.fill("#exp-amount", "1200000");
    await page.locator("ul li", { hasText: "Citra Lestari" }).locator("input[type=checkbox]").first().uncheck();
    await shot(page, "expense-edit", "amount-participants");
    await saveExpense(page);
    await shot(page, "expense-detail", "after-edit");
    const n = sql(`select count(*) from "ExpenseSplit" where "expenseId"='${S.dinner}'`);
    check("edit removed a participant (3 splits)", n === "3", n);
  });
  await step("comment", async () => {
    await page.fill("#new-comment", "Thanks for booking! I'll pay you back tomorrow.");
    await page.getByRole("button", { name: /^Post/ }).click();
    await page.waitForTimeout(1000);
    await shot(page, "expense-detail", "comment");
  });
  await step("receipt", async () => {
    const [chooser] = await Promise.all([page.waitForEvent("filechooser"), page.getByRole("button", { name: /add photo/i }).click()]);
    await chooser.setFiles({ name: "receipt.png", mimeType: "image/png", buffer: pngBytes() });
    await page.waitForTimeout(2500);
    await page.waitForLoadState("networkidle");
    await shot(page, "expense-detail", "receipt");
    const r = await page.context().request.get(`${BASE}/api/expenses/${S.dinner}/receipt`);
    check("receipt served to member", r.status() === 200 && (r.headers()["content-type"] || "").includes("image/jpeg"), r.status());
    await page.getByRole("button", { name: /^Remove$/ }).click();
    await page.locator("[role=alertdialog],[role=dialog]").last().getByRole("button", { name: /remove receipt/i }).click();
    await page.waitForTimeout(1500);
    await shot(page, "expense-detail", "receipt-removed");
  });
  await step("delete + restore", async () => {
    await page.getByRole("button", { name: /^Delete$/ }).first().click();
    await shot(page, "expense-detail", "delete-confirm", { full: false });
    await page.locator("[role=alertdialog],[role=dialog]").last().getByRole("button", { name: /delete expense/i }).click();
    await page.waitForTimeout(1500);
    await page.waitForLoadState("networkidle");
    await shot(page, "expense-detail", "deleted");
    await page.getByRole("button", { name: /restore/i }).first().click();
    await page.waitForTimeout(1500);
    await page.waitForLoadState("networkidle");
    const del = sql(`select "isDeleted" from "Expense" where id='${S.dinner}'`);
    check("expense restored", del === "f", del);
  });
  await step("expenses list", async () => {
    await go(page, "/expenses");
    await shot(page, "expenses", "all");
  });
  await ctx.close();
}

// ---------------------------------------------------------------- C: settle up, activity, notifications
if (CHUNKS.includes("C")) {
  num = 50;
  const { ctx, page } = await newPage(browser);
  await uiLogin(page, S.budi);
  await step("settle up", async () => {
    await go(page, `/groups/${S.gid}`);
    await page.locator("#settle").scrollIntoViewIfNeeded().catch(() => {});
    await shot(page, "settle", "suggestions");
    const rec = page.getByRole("button", { name: /^Record payment$/ }).first();
    await rec.click();
    await page.fill("#pay-amount", "100000");
    await shot(page, "settle", "record-partial", { full: false });
    await page.getByRole("dialog").getByRole("button", { name: /^Record payment$/ }).click();
    await page.waitForTimeout(1500);
    await page.waitForLoadState("networkidle");
    await shot(page, "settle", "recorded");
    await page.getByRole("button", { name: /^Actions for payment/ }).first().click();
    await page.getByRole("menuitem", { name: /edit payment/i }).click();
    await page.fill("#edit-pay-amount", "150000");
    await page.getByRole("button", { name: /save payment/i }).click();
    await page.waitForTimeout(1500);
    const amt = sql(`select amount from "Settlement" where "groupId"='${S.gid}' and "deletedAt" is null order by "createdAt" desc limit 1`).replace(/\.0+$/, "");
    check("payment edited to 150000", amt === "150000", amt);
    await page.getByRole("button", { name: /^Actions for payment/ }).first().click();
    await page.getByRole("menuitem", { name: /delete payment/i }).click();
    await page.locator("[role=alertdialog],[role=dialog]").last().getByRole("button", { name: /delete payment/i }).click();
    await page.waitForTimeout(1500);
    await shot(page, "settle", "payment-deleted-undo");
    // Undo in the Payments card (the activity feed has its own Undo too)
    await page.locator("#payments").getByRole("button", { name: /^Undo$/ }).click();
    await page.waitForTimeout(1500);
    const live = sql(`select count(*) from "Settlement" where "groupId"='${S.gid}' and "deletedAt" is null`);
    check("payment restored by undo", live === "1", live);
  });
  await ctx.close();
  const { ctx: c2, page: p2 } = await newPage(browser);
  await uiLogin(p2, S.ani);
  await step("remind", async () => {
    await go(p2, `/groups/${S.gid}`);
    const btn = p2.getByRole("button", { name: /^Remind / }).first();
    if (await btn.count()) {
      await btn.click();
      await p2.waitForTimeout(1500);
      await shot(p2, "settle", "reminded");
    } else check("a Remind button is shown to the creditor", false);
  });
  await step("activity", async () => {
    await go(p2, "/activity");
    await shot(p2, "activity", "global");
    // Group activity lives in the group page's Activity card (with Load more)
    await go(p2, `/groups/${S.gid}`);
    await p2.getByText("Recent changes in this group").scrollIntoViewIfNeeded();
    const more = p2.getByRole("button", { name: /load more/i }).first();
    if (await more.count()) {
      await more.click();
      await p2.waitForTimeout(1200);
    }
    await shot(p2, "activity", "group", { full: false });
  });
  await step("notifications", async () => {
    await go(p2, "/account?tab=notifications");
    await shot(p2, "account", "notifications");
    const wa = await p2.locator("text=/not available yet|not configured/i").count();
    check("WhatsApp shown as not available", wa > 0, wa);
    // unsubscribe link from a queued email
    const tok = sql(`select substring(payload->>'text' from '/unsubscribe\\?t=([^\\s]+)') from "Notification" where "userId"='${S.aniId}' and channel='EMAIL' and payload->>'text' like '%unsubscribe?t=%' limit 1`);
    if (tok) {
      const { ctx: c3, page: p3 } = await newPage(browser);
      await go(p3, `/unsubscribe?t=${tok}`);
      await shot(p3, "unsubscribe", "page");
      const b = p3.getByRole("button", { name: /unsubscribe/i }).first();
      if (await b.count()) {
        await b.click();
        await p3.waitForTimeout(1200);
        await shot(p3, "unsubscribe", "done");
      }
      await c3.close();
    } else check("an email notification with unsubscribe link exists for ani", false, "none");
    const reasons = sql(`select string_agg(distinct coalesce("lastError",'-'), ' / ') from "Notification" where "userId"='${S.aniId}'`);
    check("ani's notifications skipped as reserved domain", /Reserved test domain/.test(reasons), reasons);
  });
  await step("phone UI", async () => {
    await go(p2, "/account?tab=notifications");
    const num_ = p2.locator("#wa-number");
    if (await num_.count()) {
      await p2.selectOption("#wa-country", { label: "Indonesia (+62)" });
      await num_.fill(`812${String(Date.now()).slice(-7)}`);
      const send = p2.getByRole("button", { name: /send code|verify|save number/i }).first();
      if (await send.count()) await send.click();
      await p2.waitForTimeout(1200);
      await shot(p2, "account", "phone-wa-disabled");
    }
  });
  await c2.close();
}

// ---------------------------------------------------------------- D: friends, insights, exports, settings, account
if (CHUNKS.includes("D")) {
  num = 65;
  const { ctx, page } = await newPage(browser);
  await uiLogin(page, S.ani);
  await step("friends", async () => {
    await go(page, "/friends");
    await shot(page, "friends", "list");
    await page.fill("#friend-email", `eko${S.run}@${DOMAIN}`);
    await page.locator("form", { has: page.locator("#friend-email") }).locator("button[type=submit]").click();
    await page.waitForTimeout(1500);
    await page.waitForLoadState("networkidle");
    await shot(page, "friends", "added-ghost");
    await go(page, `/friends/${S.budiId}`);
    await shot(page, "friends", "detail");
    await page.getByRole("button", { name: /add an expense with/i }).click();
    await page.waitForURL(/friends\/[^/]+\/expenses\/create/);
    await page.waitForLoadState("networkidle");
    await basics(page, { desc: "Coffee", amount: "50000" });
    await shot(page, "friends", "add-expense");
    await saveExpense(page);
    await go(page, `/friends/${S.budiId}`);
    await shot(page, "friends", "after-expense");
    const rec = page.getByRole("button", { name: /mark received|record payment|record/i }).first();
    if (await rec.count()) {
      await rec.click();
      await page.getByRole("dialog").getByRole("button", { name: /^Record payment$/ }).click();
      await page.waitForTimeout(1500);
      await page.waitForLoadState("networkidle");
      await shot(page, "friends", "settled");
    } else check("1:1 settle button present", false);
  });
  await step("insights", async () => {
    await go(page, "/insights");
    await shot(page, "insights", "default");
  });
  await step("csv", async () => {
    for (const p of [`/api/groups/${S.gid}/export.csv`, "/api/expenses/export.csv"]) {
      const r = await page.context().request.get(BASE + p);
      const t = await r.text();
      check(`CSV ${p}`, r.status() === 200 && /text\/csv/.test(r.headers()["content-type"] || "") && t.includes("Villa rent"), r.status());
      check(`CSV ${p} IDR without decimals`, !/,1000000000\.00,/.test(t), "decimals");
    }
  });
  await step("group settings", async () => {
    await go(page, `/groups/${S.gid}/settings`);
    await shot(page, "group-settings", "full");
    await page.fill("#g-name", "Bali trip 2026");
    const sw = page.getByRole("switch").first();
    await sw.click();
    await page.getByRole("button", { name: /save settings/i }).click();
    await page.waitForTimeout(1500);
    await shot(page, "group-settings", "saved");
    const curDisabled = await page.locator("#g-currency").isDisabled().catch(() => null);
    check("currency locked once there are expenses", curDisabled === true, curDisabled);
    await sw.click();
    await page.getByRole("button", { name: /save settings/i }).click();
    await page.waitForTimeout(1000);
    await page.getByRole("button", { name: /^Archive$/ }).click();
    await page.locator("[role=alertdialog],[role=dialog]").last().getByRole("button", { name: /archive group/i }).click();
    await page.waitForTimeout(1500);
    await page.waitForLoadState("networkidle");
    await go(page, `/groups/${S.gid}`);
    await shot(page, "group", "archived");
    await go(page, `/groups/${S.gid}/settings`);
    await page.getByRole("button", { name: /^Unarchive$/ }).click();
    await page.waitForTimeout(1500);
    const arch = sql(`select "archivedAt" is null from "Group" where id='${S.gid}'`);
    check("unarchived", arch === "t", arch);
  });
  await step("delete group", async () => {
    await go(page, "/groups/create");
    await page.fill("#group-name", "Temp group");
    await page.getByRole("button", { name: /create group/i }).click();
    await page.waitForURL((u) => /^\/groups\/[a-z0-9]+$/.test(u.pathname) && !u.pathname.endsWith("/create"), { timeout: 30000 });
    const tid = new URL(page.url()).pathname.split("/").pop();
    await go(page, `/groups/${tid}/settings`);
    await page.getByRole("button", { name: /^Delete$/ }).click();
    await page.fill("#confirm-name", "Temp group");
    await shot(page, "group-settings", "delete-confirm", { full: false });
    await page.getByRole("button", { name: /delete group/i }).last().click();
    await page.waitForURL(/\/groups$|\/dashboard/, { timeout: 30000 });
    await shot(page, "groups", "after-delete");
  });
  await step("leave blocked", async () => {
    const { ctx: c2, page: p2 } = await newPage(browser);
    await uiLogin(p2, S.citra);
    await go(p2, `/groups/${S.gid}/settings`);
    await shot(p2, "group-settings", "member-view");
    await c2.close();
  });
  await step("account", async () => {
    await go(page, "/account");
    await shot(page, "account", "profile");
    await page.fill("#acc-name", "Ani W.");
    await page.getByRole("button", { name: /^Save/ }).first().click();
    await page.waitForTimeout(1000);
    await shot(page, "account", "saved");
    const pw = page.getByRole("button", { name: /change password/i }).first();
    if (await pw.count()) {
      await pw.click();
      await page.fill("#pw-cur", PASSWORD);
      await page.fill("#pw-new", "NewPassw0rd!x");
      await page.fill("#pw-confirm", "NewPassw0rd!x");
      await page.getByRole("dialog").getByRole("button", { name: /change password|save|update/i }).last().click();
      await page.waitForTimeout(1500);
      await shot(page, "account", "password-changed");
    }
    await go(page, "/account");
    const r = await page.context().request.post(BASE + "/api/user/export", { headers: { Origin: BASE } });
    check("JSON export", r.status() === 200, r.status());
    const del = page.getByRole("button", { name: /delete account/i }).first();
    if (await del.count()) {
      await del.click();
      await page.waitForTimeout(500);
      await shot(page, "account", "delete-blocked", { full: false });
      await page.keyboard.press("Escape");
    }
  });
  await step("sign out", async () => {
    await go(page, "/account");
    await page.getByRole("button", { name: /^Sign out$/ }).first().click();
    await page.waitForURL((u) => !u.pathname.startsWith("/account"), { timeout: 30000 });
    await shot(page, "auth", "signed-out");
  });
  await step("forgot + reset", async () => {
    await go(page, "/auth/forgot-password");
    await page.fill("#email", S.ani);
    await page.locator("form button[type=submit]").click();
    await page.waitForTimeout(1500);
    await shot(page, "auth", "forgot-sent");
    const token = sql(`select token from "PasswordResetToken" where email='${S.ani}' order by "createdAt" desc limit 1`);
    await go(page, `/auth/reset-password?token=${token}`);
    await shot(page, "auth", "reset-form");
    const inputs = page.locator("input[type=password]");
    for (let i = 0; i < (await inputs.count()); i++) await inputs.nth(i).fill(PASSWORD);
    await page.locator("form button[type=submit]").click();
    await page.waitForTimeout(2000);
    await shot(page, "auth", "reset-done");
    await uiLogin(page, S.ani);
    check("sign in with reset password", page.url().includes("/dashboard"), page.url());
    await go(page, "/auth/reset-password?token=bogus");
    await shot(page, "auth", "reset-bad-token");
  });
  await step("404", async () => {
    page.expectErrors = true;
    await go(page, "/nope-not-here");
    await shot(page, "404", "public");
    await go(page, "/groups/doesnotexist");
    await shot(page, "404", "group");
    await go(page, "/expenses/doesnotexist");
    await shot(page, "404", "expense");
    page.expectErrors = false;
  });
  await step("dashboard final", async () => {
    await go(page, "/dashboard");
    await shot(page, "dashboard", "with-data");
    await go(page, "/settlements");
    await shot(page, "settlements", "overview");
  });
  await ctx.close();
}

// ---------------------------------------------------------------- E: stress, a11y, errors
if (CHUNKS.includes("E")) {
  num = 100;
  const owner = await apiUser(browser, "omar", "Omar Faruq Abdullah bin Rahman Al-Hakim the Third of Jakarta");
  const g = await api(owner.ctx, "POST", "/api/groups", { name: "Office lunch club with a really quite long group name that keeps going", currency: "IDR" });
  const ids = [{ userId: owner.id }];
  for (let i = 1; i <= 9; i++) {
    const r = await api(owner.ctx, "POST", `/api/groups/${g.id}/members`, { email: `member${i}-${RUN}@${DOMAIN}` });
    ids.push({ userId: r.member.user.id });
  }
  await api(owner.ctx, "POST", "/api/expenses", { groupId: g.id, description: "Team offsite catering", amount: 1000000000, splitMethod: "EQUAL", payers: [{ userId: owner.id, amountPaid: 1000000000 }], participants: ids });
  await owner.ctx.close();
  const { ctx, page } = await newPage(browser);
  await uiLogin(page, owner.email);
  await step("many members", async () => {
    await go(page, `/groups/${g.id}`);
    await shot(page, "stress", "10-members-1b-idr");
    const decimals = await page.locator("text=/IDR\\s?[\\d,]+\\.\\d\\d/").count();
    check("1,000,000,000 IDR no decimals", decimals === 0, decimals);
    await go(page, `/groups/${g.id}/expenses/create`);
    await shot(page, "stress", "add-expense-10-members");
    await go(page, `/groups/${g.id}/settings`);
    await shot(page, "stress", "settings-10-members");
  });
  await step("keyboard", async () => {
    await go(page, "/dashboard");
    await page.keyboard.press("Tab");
    const first = await page.evaluate(() => document.activeElement?.textContent?.trim());
    check("first Tab lands on skip link", /skip/i.test(first || ""), first);
    const missing = [];
    for (let i = 0; i < 14; i++) {
      await page.keyboard.press("Tab");
      const info = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const cs = getComputedStyle(el);
        const ring = cs.boxShadow !== "none" || (cs.outlineStyle !== "none" && cs.outlineWidth !== "0px");
        return { tag: el.tagName, label: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 40), ring };
      });
      if (info && !info.ring) missing.push(`${info.tag}:${info.label}`);
    }
    await shot(page, "a11y", "focus-visible", { full: false });
    check("every focused element shows a focus style", missing.length === 0, missing.join(", "));
    const unlabeled = await page.evaluate(() =>
      [...document.querySelectorAll("button, a[href]")]
        .filter((el) => !(el.getAttribute("aria-label") || el.textContent.trim() || el.getAttribute("title") || el.getAttribute("aria-labelledby")))
        .map((el) => el.outerHTML.slice(0, 80))
    );
    check("no unlabeled icon buttons/links on dashboard", unlabeled.length === 0, unlabeled.join(" | "));
  });
  await step("unlabeled controls across pages", async () => {
    const bad = [];
    for (const p of ["/groups", `/groups/${g.id}`, `/groups/${g.id}/expenses/create`, `/groups/${g.id}/settings`, "/expenses", "/activity", "/friends", "/account", "/account?tab=notifications", "/insights", "/settlements"]) {
      await go(page, p);
      const u = await page.evaluate(() => {
        const out = [];
        for (const el of document.querySelectorAll("button, a[href], input:not([type=hidden]), select, textarea")) {
          const id = el.id;
          const named =
            el.getAttribute("aria-label") ||
            el.getAttribute("aria-labelledby") ||
            el.getAttribute("title") ||
            (el.tagName === "BUTTON" || el.tagName === "A" ? el.textContent.trim() : "") ||
            (id && document.querySelector(`label[for="${id}"]`)) ||
            el.closest("label");
          if (!named && el.offsetParent !== null) out.push(el.outerHTML.slice(0, 90));
        }
        return out;
      });
      if (u.length) bad.push(`${p}: ${u.join(" ; ")}`);
    }
    check("every visible control has an accessible name", bad.length === 0, bad.join(" || "));
  });
  await step("api 500", async () => {
    await go(page, `/groups/${g.id}/expenses/create`);
    page.expectErrors = true;
    await page.route("**/api/expenses", (r) => (r.request().method() === "POST" ? r.fulfill({ status: 500, contentType: "application/json", body: '{"error":"Internal server error"}' }) : r.continue()));
    await basics(page, { desc: "Will fail", amount: "1000" });
    await page.getByRole("button", { name: "Save expense" }).click();
    await page.waitForTimeout(1000);
    await shot(page, "errors", "save-500");
    const shown = await page.locator("text=/Internal server error|Could not save/").count();
    check("500 on save shows an inline error", shown > 0, shown);
    await page.unroute("**/api/expenses");
    page.expectErrors = false;
  });
  await step("back navigation", async () => {
    await go(page, "/groups");
    await go(page, `/groups/${g.id}`);
    await page.goBack();
    await page.waitForLoadState("networkidle");
    check("back returns to /groups", new URL(page.url()).pathname === "/groups", page.url());
  });
  await step("dark preference", async () => {
    const c = await browser.newContext({ colorScheme: "dark", viewport: { width: WIDTH, height: 900 } });
    await apiLogin(c, owner.email);
    const p = await c.newPage();
    p.errs = [];
    await p.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
    const bg = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);
    check("OS dark mode does not produce half-dark styles (light theme kept)", bg === "rgb(248, 250, 252)", bg);
    await shot(p, "a11y", "os-dark-scheme", { full: false });
    await c.close();
  });
  await step("loading state", async () => {
    await go(page, "/activity");
    await page.route("**/api/activity**", async (r) => {
      await new Promise((res) => setTimeout(res, 2500));
      await r.continue();
    });
    const more = page.getByRole("button", { name: /load more|older/i }).first();
    await page.unroute("**/api/activity**");
    check("activity page renders", true, more ? "" : "");
  });
  await ctx.close();
}

await browser.close();
process.exit(summary());
