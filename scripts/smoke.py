#!/usr/bin/env python3
"""FairShare API smoke test (stdlib only).

Usage:
  python3 scripts/smoke.py                         # local dev server, full run (needs the dev DB)
  BASE_URL=http://localhost:3810 python3 scripts/smoke.py
  BASE_URL=https://fairshare.example.com python3 scripts/smoke.py --prod   # API-only checks, no DB access

Environment:
  BASE_URL        server to test (default http://localhost:3810)
  ENV_FILE        .env to read CRON_SECRET from (default: <repo>/.env); CRON_SECRET env wins
  DB_CONTAINER    docker container with Postgres for DB assertions (default fairshare-dev-db)
  DB_NAME/DB_USER database and user inside that container (default fairshare / postgres)
  DOCKER_HOST     forwarded to docker (rootless docker: unix:///run/user/1000/docker.sock)
  IDS_FILE        optional: write created ids as JSON here (used by the Playwright QA scripts)

Every account it creates uses a reserved test domain (@demo.test locally,
@smoke.invalid with --prod), which the mailer never sends to. Remove the data
afterwards with scripts/cleanup-smoke.sql.
"""
import json, os, re, sys, time, io, subprocess, urllib.request, urllib.parse, http.cookiejar, uuid

PROD = "--prod" in sys.argv
B = os.environ.get("BASE_URL", "http://localhost:3810").rstrip("/")
if not PROD and not re.match(r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$", B):
    sys.exit(f"Refusing to run the full (DB-touching, cron-driving) smoke test against {B}. Use --prod for the API-only subset.")
DOMAIN = "smoke.invalid" if PROD else "demo.test"
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IDS_FILE = os.environ.get("IDS_FILE")
RUN = str(int(time.time()))
results = []

def check(name, cond, extra=""):
    results.append((name, bool(cond)))
    print(("PASS " if cond else "FAIL ") + name + (f"  -> {extra}" if extra and not cond else ""))

class Client:
    def __init__(self):
        self.jar = http.cookiejar.CookieJar()
        self.op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))
        self.op.addheaders = [("Origin", B)]
    def req(self, method, path, body=None, form=None):
        data, headers = None, {}
        if body is not None:
            data = json.dumps(body).encode(); headers["Content-Type"] = "application/json"
        if form is not None:
            data = urllib.parse.urlencode(form).encode(); headers["Content-Type"] = "application/x-www-form-urlencoded"
        r = urllib.request.Request(B + path, data=data, method=method, headers=headers)
        try:
            resp = self.op.open(r, timeout=120); code = resp.status; txt = resp.read().decode()
        except urllib.error.HTTPError as e:
            code = e.code; txt = e.read().decode()
        try: j = json.loads(txt)
        except Exception: j = None
        return code, j, txt
    def upload(self, path, filename, content, ctype):
        bnd = uuid.uuid4().hex
        body = (f"--{bnd}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"{filename}\"\r\nContent-Type: {ctype}\r\n\r\n").encode() + content + f"\r\n--{bnd}--\r\n".encode()
        r = urllib.request.Request(B + path, data=body, method="POST", headers={"Content-Type": f"multipart/form-data; boundary={bnd}"})
        try:
            resp = self.op.open(r, timeout=120); return resp.status, resp.read()
        except urllib.error.HTTPError as e:
            return e.code, e.read()
    def raw(self, path):
        try:
            resp = self.op.open(urllib.request.Request(B + path), timeout=120); return resp.status, resp.headers, resp.read()
        except urllib.error.HTTPError as e:
            return e.code, e.headers, e.read()
    def login(self, email, password):
        _, j, _ = self.req("GET", "/api/auth/csrf")
        self.req("POST", "/api/auth/callback/credentials", form={"email": email, "password": password, "csrfToken": j["csrfToken"], "json": "true"})
        _, s, _ = self.req("GET", "/api/auth/session")
        return s or {}

def user(tag, pw="Passw0rd!x"):
    c = Client(); email = f"{tag}{RUN}@{DOMAIN}"
    code, j, t = c.req("POST", "/api/auth/register", {"email": email, "password": pw, "name": tag.capitalize()})
    check(f"register {tag}", code in (200, 201), t[:200])
    s = c.login(email, pw)
    check(f"login {tag}", s.get("user", {}).get("email") == email, s)
    return c, email, s.get("user", {}).get("id")

a, ae, aid = user("ani")
b, be, bid = user("budi")
x, xe, xid = user("xeno")

# passkey bypass: old magic password must not work any more
evil = Client()
s = evil.login(ae, "webauthn-verified")
check("magic 'webauthn-verified' password rejected", not s.get("user"), s)
_, j, _ = evil.req("GET", "/api/auth/csrf")
evil.req("POST", "/api/auth/callback/passkey", form={"email": ae, "ticket": "forged", "csrfToken": j["csrfToken"], "json": "true"})
_, s, _ = evil.req("GET", "/api/auth/session")
check("forged passkey ticket rejected", not (s or {}).get("user"), s)

code, g, t = a.req("POST", "/api/groups", {"name": f"Trip {RUN}", "currency": "IDR"})
check("create group", code in (200, 201), t[:200]); gid = g["id"]

# group currency defaults to the creator's preferred currency
code, j, t = x.req("PUT", "/api/user/preferences", {"currency": "EUR"})
check("set preferred currency", code == 200, t[:200])
code, j, t = x.req("PUT", "/api/user/preferences", {"currency": "ZZZ"})
check("unknown currency rejected", code == 400, code)
code, g2, t = x.req("POST", "/api/groups", {"name": f"Pref {RUN}"})
check("new group uses preferred currency", code in (200, 201) and (g2 or {}).get("currency") == "EUR", t[:200])
code, j, t = x.req("POST", "/api/groups", {"name": f"Bad {RUN}", "currency": "ZZZ"})
check("group with unknown currency rejected", code == 400, code)

code, j, t = a.req("POST", f"/api/groups/{gid}/members", {"email": be})
check("invite budi", code in (200, 201), t[:300])
ghost = f"ghost{RUN}@{DOMAIN}"
code, j, t = a.req("POST", f"/api/groups/{gid}/members", {"email": ghost})
check("invite ghost (no account)", code in (200, 201), t[:300])
link = (j or {}).get("member", {}).get("inviteLink") or ""
check("invite link returned", "/invite/" in link, j)

# budi accepts his invite
code, gm, t = a.req("GET", f"/api/groups/{gid}")
inv = [m for m in (gm or {}).get("members", []) if m["user"]["email"] == be]
token = None
tok_first = (a.req("GET", f"/api/groups/{gid}/invitations")[1] or [])
first_link = next((i.get("inviteLink") for i in tok_first if (i.get("user") or {}).get("email") == be or i.get("email") == be), None)
code2, j2, t2 = a.req("POST", f"/api/groups/{gid}/members", {"email": be})
tok_link = (j2 or {}).get("member", {}).get("inviteLink") or ""
check("re-invite says alreadyInvited", (j2 or {}).get("alreadyInvited") is True, t2[:300])
check("re-invite keeps the same link", first_link is not None and first_link == tok_link, (first_link, tok_link))
m = re.search(r"/invite/([^/?#]+)", tok_link)
if m: token = m.group(1)
if token:
    code, j, t = b.req("POST", f"/api/invite/{token}", {})
    check("budi accepts invite", code in (200, 201), t[:300])
else:
    code, j, t = b.req("POST", f"/api/groups/{gid}/join", {})
    check("budi joins group", code in (200, 201), t[:300])

# outsider cannot add expense / view
code, j, t = x.req("GET", f"/api/groups/{gid}")
check("non-member cannot read group", code in (403, 404), code)
code, j, t = x.req("GET", f"/api/expenses?groupId={gid}")
check("non-member cannot list group expenses", code in (403, 404) or j == [], t[:200])

# equal split 100.000 three ways, ani pays
code, e1, t = a.req("POST", "/api/expenses", {
    "groupId": gid, "description": "Dinner", "amount": 100000, "category": "FOOD_DRINK", "splitMethod": "EQUAL",
    "payers": [{"userId": aid, "amountPaid": 100000}],
    "participants": [{"userId": aid}, {"userId": bid}, {"email": ghost}]})
check("equal expense incl. ghost", code in (200, 201), t[:300])

# outsider cannot be put on an expense
code, j, t = a.req("POST", "/api/expenses", {
    "groupId": gid, "description": "Bad", "amount": 10, "splitMethod": "EQUAL",
    "payers": [{"userId": aid, "amountPaid": 10}], "participants": [{"userId": xid}]})
check("non-member participant rejected", code in (400, 403), code)

# payers mismatch rejected
code, j, t = a.req("POST", "/api/expenses", {
    "groupId": gid, "description": "Mismatch", "amount": 50, "splitMethod": "EQUAL",
    "payers": [{"userId": aid, "amountPaid": 40}], "participants": [{"userId": aid}, {"userId": bid}]})
check("payer total mismatch rejected", code == 400, code)

# itemized: budi pays 60k; item A 40k shared ani+budi, item B 20k budi only
code, e2, t = b.req("POST", "/api/expenses", {
    "groupId": gid, "description": "Groceries", "amount": 60000, "category": "SHOPPING",
    "payers": [{"userId": bid, "amountPaid": 60000}],
    "items": [
        {"name": "Snacks", "amount": 40000, "isShared": True, "splitMethod": "EQUAL", "participants": [{"userId": aid}, {"userId": bid}]},
        {"name": "Soap", "amount": 20000, "isShared": False, "splitMethod": "EQUAL", "participants": [{"userId": bid}]},
    ]})
check("itemized expense", code in (200, 201), t[:300])

code, st, t = a.req("GET", f"/api/groups/{gid}/settlements")
check("settlements GET", code == 200, t[:300])
bal = {x["userEmail"] if "userEmail" in x else x.get("userId"): x["netBalance"] for x in (st or {}).get("balances", [])}
nb = {b_["userId"]: b_["netBalance"] for b_ in st["balances"]}
# ani: paid 100000, share 33333.34 + 20000 -> +46666.66 ; budi: paid 60000, share 33333.33+20000+20000 -> -13333.33 ; ghost -33333.33
print("balances", nb)
check("balances sum to zero", abs(sum(nb.values())) < 0.005, nb)
check("ani net +46666 (itemized counted, whole rupiah)", abs(nb.get(aid, 0) - 46666) < 0.011, nb.get(aid))
check("budi net -13333", abs(nb.get(bid, 0) + 13333) < 0.011, nb.get(bid))

# budi records a payment to ani
code, j, t = b.req("POST", f"/api/groups/{gid}/settlements", {"toUserId": aid, "amount": 13333.33})
check("record payment", code in (200, 201), t[:300])
code, st2, t = a.req("GET", f"/api/groups/{gid}/settlements")
nb2 = {b_["userId"]: b_["netBalance"] for b_ in st2["balances"]}
check("budi settled after payment", abs(nb2.get(bid, 1)) < 0.005, nb2)
check("only ghost -> ani remains", len(st2["suggestedSettlements"]) == 1, st2["suggestedSettlements"])

# outsider cannot record payment / view expense by id
code, j, t = x.req("POST", f"/api/groups/{gid}/settlements", {"toUserId": aid, "amount": 1})
check("non-member cannot record payment", code in (403, 404), code)
eid = (e1 or {}).get("id") or (e1 or {}).get("expense", {}).get("id")
code, j, t = x.req("GET", f"/api/expenses/{eid}")
check("non-member cannot read expense by id", code in (403, 404), code)

# budi can't leave? he is settled -> can leave; ghost cannot be removed (on expense)
code, gm, t = a.req("GET", f"/api/groups/{gid}")
mem = {m_["user"]["email"]: m_["id"] for m_ in gm["members"]}
code, j, t = a.req("DELETE", f"/api/groups/{gid}/members/{mem[ghost]}")
check("cannot cancel invite of ghost on expenses", code == 400, t[:200])

# ghost registers -> merges into same user, sees balance
gc = Client()
code, j, t = gc.req("POST", "/api/auth/register", {"email": ghost, "password": "Passw0rd!x", "name": "Ghost"})
check("ghost registers (claims account)", code in (200, 201), t[:200])
s = gc.login(ghost, "Passw0rd!x")
check("ghost login", s.get("user", {}).get("email") == ghost, s)
gtok = re.search(r"/invite/([^/?#]+)", link).group(1)
code, j, t = gc.req("GET", "/api/balances")
check("pending invitee sees nothing before accepting", code == 200 and not any(g_["id"] == gid for g_ in j["groups"]), t[:200])
code, j, t = gc.req("POST", f"/api/invite/{gtok}", {})
check("ghost accepts invite link", code in (200, 201), t[:300])
code, bl, t = gc.req("GET", "/api/balances")
gnet = [g_ for g_ in (bl or {}).get("groups", []) if g_["id"] == gid]
check("ghost sees debt after sign-up", gnet and abs(gnet[0]["net"] + 33333) < 0.011, t[:300])

# delete expense by non-payer non-admin fails; by payer works
code, j, t = gc.req("DELETE", f"/api/expenses/{eid}")
check("non-payer cannot delete", code in (403, 404), code)

# expense list: pagination + filters + my share
code, pg, t = a.req("GET", f"/api/expenses?limit=1&groupId={gid}")
check("paged list shape", code == 200 and isinstance((pg or {}).get("items"), list) and len(pg["items"]) == 1 and pg.get("nextCursor"), t[:300])
code, pg2, t = a.req("GET", f"/api/expenses?limit=1&groupId={gid}&cursor={pg['nextCursor']}")
check("second page differs", code == 200 and pg2["items"] and pg2["items"][0]["id"] != pg["items"][0]["id"], t[:300])
code, f1, t = a.req("GET", f"/api/expenses?limit=20&category=SHOPPING&groupId={gid}")
check("category filter", code == 200 and [e["description"] for e in f1["items"]] == ["Groceries"], t[:300])
code, f2, t = a.req("GET", f"/api/expenses?limit=20&q=dinn")
check("search filter", code == 200 and any(e["description"] == "Dinner" for e in f2["items"]) and all("inn" in e["description"].lower() or "dinn" in (e.get("notes") or "").lower() for e in f2["items"]), t[:300])
code, f3, t = a.req("GET", "/api/expenses?limit=20&from=2000-01-01&to=2000-01-02")
check("date filter", code == 200 and f3["items"] == [], t[:200])
din = next((e for e in f2["items"] if e["description"] == "Dinner"), {})
check("my share on row", abs(din.get("my", {}).get("net", 0) - 66666) < 0.011, din.get("my"))
code, j, t = a.req("GET", "/api/expenses?limit=5&category=NOPE")
check("bad category rejected", code == 400, code)

# account: export downloads JSON, delete blocked while balances are open
code, ex, t = a.req("POST", "/api/user/export")
check("export returns data", code == 200 and (ex or {}).get("user", {}).get("email") == ae and len(ex.get("expenses", [])) >= 2, t[:200])
code, j, t = a.req("DELETE", "/api/user/delete", {"confirmationText": "DELETE MY ACCOUNT"})
check("delete blocked with open balance", code == 409, t[:200])

# public pages
for p in ["/", "/privacy", "/terms", "/auth/signin", "/auth/register"]:
    code, _, t = Client().req("GET", p)
    check(f"public page {p}", code == 200 and "Application error" not in t and 'href="#"' not in t, code)

# pages
for p in ["/dashboard", "/groups", "/settlements", "/expenses", "/expenses/create", f"/groups/{gid}", f"/groups/{gid}/expenses", f"/groups/{gid}/expenses/create"]:
    code, _, t = a.req("GET", p)
    check(f"page {p}", code == 200 and "Application error" not in t, code)


# ======================= BATCH 2 =======================
e2id = (e2 or {}).get("id")

# --- expense detail page + edit (incl. amount) ---
code, ed, t = a.req("GET", f"/api/expenses/{eid}")
check("B2 expense GET has payers/splits", code == 200 and ed and len(ed.get("splits", [])) == 3, t[:200])
code, j, t = a.req("PUT", f"/api/expenses/{eid}", {
    "description": "Dinner (edited)", "amount": 90000, "category": "FOOD_DRINK", "splitMethod": "EQUAL",
    "payers": [{"userId": aid, "amountPaid": 90000}],
    "participants": [{"userId": aid}, {"userId": bid}]})
check("B2 creator edits amount, split and participants", code == 200, t[:300])
code, ed, t = a.req("GET", f"/api/expenses/{eid}")
check("B2 edit recomputed splits", code == 200 and sorted(float(s_["amount"]) for s_ in ed["splits"]) == [45000, 45000] and float(ed["amount"]) == 90000, t[:400])
code, j, t = a.req("PUT", f"/api/expenses/{eid}", {
    "description": "x", "amount": 90000, "splitMethod": "EQUAL",
    "payers": [{"userId": aid, "amountPaid": 90000}], "participants": [{"userId": xid}]})
check("B2 edit keeps membership validation", code in (400, 403), code)
code, j, t = gc.req("PUT", f"/api/expenses/{eid}", {
    "description": "hack", "amount": 1, "splitMethod": "EQUAL",
    "payers": [{"userId": aid, "amountPaid": 1}], "participants": [{"userId": aid}]})
check("B2 non-creator non-payer member cannot edit", code == 403, code)
# budi (payer of groceries) switches it from itemized to exact
code, j, t = b.req("PUT", f"/api/expenses/{e2id}", {
    "description": "Groceries", "amount": 50000, "category": "SHOPPING", "splitMethod": "EXACT",
    "payers": [{"userId": bid, "amountPaid": 50000}],
    "participants": [{"userId": aid, "amount": 20000}, {"userId": bid, "amount": 30000}]})
check("B2 payer edits itemized -> exact", code == 200, t[:300])
code, ed2, t = b.req("GET", f"/api/expenses/{e2id}")
check("B2 items replaced", code == 200 and ed2.get("items") == [] and len(ed2["splits"]) == 2, t[:300])
code, st3, t = a.req("GET", f"/api/groups/{gid}/settlements")
nb3 = {b_["userId"]: b_["netBalance"] for b_ in st3["balances"]}
check("B2 balances follow edits and sum to zero", abs(sum(nb3.values())) < 0.005 and abs(nb3[aid] - (45000 - 20000 - 13333)) < 0.011, nb3)

# --- delete / restore ---
code, j, t = a.req("DELETE", f"/api/expenses/{eid}")
check("B2 delete expense", code == 200, t[:200])
code, j, t = a.req("GET", f"/api/expenses?limit=20&groupId={gid}")
check("B2 deleted expense hidden from list", code == 200 and all(e["id"] != eid for e in j["items"]), t[:200])
code, j, t = a.req("POST", f"/api/expenses/{eid}/restore")
check("B2 restore expense", code == 200, t[:200])
code, j, t = a.req("GET", f"/api/expenses?limit=20&groupId={gid}")
check("B2 restored expense back in list", any(e["id"] == eid for e in j["items"]), t[:200])
code, j, t = a.req("POST", f"/api/expenses/{eid}/restore")
check("B2 restore of live expense rejected", code == 400, code)

# --- comments ---
code, cm, t = b.req("POST", f"/api/expenses/{eid}/comments", {"body": "Thanks for dinner!"})
check("B2 member comments", code == 201, t[:200])
code, j, t = x.req("POST", f"/api/expenses/{eid}/comments", {"body": "spam"})
check("B2 non-member cannot comment", code in (403, 404), code)
code, j, t = x.req("GET", f"/api/expenses/{eid}/comments")
check("B2 non-member cannot read comments", code in (403, 404), code)
code, j, t = a.req("DELETE", f"/api/expenses/{eid}/comments/{cm['id']}")
check("B2 cannot delete someone else's comment", code == 403, code)
code, j, t = b.req("POST", f"/api/expenses/{eid}/comments", {"body": "  "})
check("B2 empty comment rejected", code == 400, code)
code, cm2, t = b.req("POST", f"/api/expenses/{eid}/comments", {"body": "oops"})
code, j, t = b.req("DELETE", f"/api/expenses/{eid}/comments/{cm2['id']}")
check("B2 delete own comment", code == 200, t[:200])
code, j, t = a.req("GET", f"/api/expenses/{eid}/comments")
check("B2 comments list", code == 200 and [c["body"] for c in j] == ["Thanks for dinner!"], t[:200])

# --- receipt ---
png = subprocess.run(["python3", "-c", "import zlib,struct,sys\nw=h=40\nraw=b''.join(b'\\x00'+bytes([200,100,50])*w for _ in range(h))\ndef ch(t,d):\n  c=struct.pack('>I',len(d))+t+d\n  return c+struct.pack('>I',zlib.crc32(t+d)&0xffffffff)\nsys.stdout.buffer.write(b'\\x89PNG\\r\\n\\x1a\\n'+ch(b'IHDR',struct.pack('>IIBBBBB',w,h,8,2,0,0,0))+ch(b'IDAT',zlib.compress(raw))+ch(b'IEND',b''))"], capture_output=True).stdout
code, body = a.upload(f"/api/expenses/{eid}/receipt", "r.png", png, "image/png")
check("B2 upload receipt (png)", code == 201, body[:200])
code, hdr, img = a.raw(f"/api/expenses/{eid}/receipt")
check("B2 member gets receipt as jpeg", code == 200 and img[:3] == b"\xff\xd8\xff" and "private" in (hdr.get("Cache-Control") or ""), (code, img[:10]))
code, hdr, img = b.raw(f"/api/expenses/{eid}/receipt?size=thumb")
check("B2 other member gets thumbnail", code == 200 and img[:3] == b"\xff\xd8\xff", code)
code, hdr, img = x.raw(f"/api/expenses/{eid}/receipt")
check("B2 non-member denied receipt", code in (403, 404), code)
code, hdr, img = Client().raw(f"/api/expenses/{eid}/receipt")
check("B2 anonymous denied receipt", code == 401, code)
code, body = a.upload(f"/api/expenses/{eid}/receipt", "evil.png", b"<script>alert(1)</script>", "image/png")
check("B2 non-image upload rejected", code in (400, 415), (code, body[:200]))
code, body = a.upload(f"/api/expenses/{eid}/receipt", "big.jpg", b"\xff\xd8\xff" + b"0" * (8 * 1024 * 1024 + 10), "image/jpeg")
check("B2 >8MB upload rejected", code in (400, 413), code)
code, body = x.upload(f"/api/expenses/{eid}/receipt", "r.png", png, "image/png")
check("B2 non-member cannot upload receipt", code in (403, 404), code)
code, _, _ = Client().raw("/uploads/receipts/")
check("B2 no public uploads path", code == 404, code)
code, j, t = a.req("DELETE", f"/api/expenses/{eid}/receipt")
check("B2 delete receipt", code == 200, t[:200])
code, hdr, img = a.raw(f"/api/expenses/{eid}/receipt")
check("B2 receipt gone after delete", code == 404, code)

# --- payment edit / delete / restore ---
code, st4, t = a.req("GET", f"/api/groups/{gid}/settlements")
pay = st4["history"][0]
check("B2 payer/receiver can manage payment", pay.get("canManage") is True, pay)
code, j, t = gc.req("PATCH", f"/api/groups/{gid}/settlements/{pay['id']}", {"amount": 1})
check("B2 uninvolved member cannot edit payment", code == 403, code)
code, j, t = a.req("PATCH", f"/api/groups/{gid}/settlements/{pay['id']}", {"amount": 10000, "method": "BANK_TRANSFER"})
check("B2 receiver edits payment amount", code == 200, t[:200])
code, st5, t = a.req("GET", f"/api/groups/{gid}/settlements")
nb5 = {b_["userId"]: b_["netBalance"] for b_ in st5["balances"]}
check("B2 balances follow payment edit", abs(nb5[bid] - (nb3[bid] - 3333)) < 0.011, (nb3, nb5))
code, j, t = b.req("DELETE", f"/api/groups/{gid}/settlements/{pay['id']}")
check("B2 payer deletes payment", code == 200, t[:200])
code, st6, t = a.req("GET", f"/api/groups/{gid}/settlements")
check("B2 deleted payment gone from history", all(h["id"] != pay["id"] for h in st6["history"]), t[:200])
code, j, t = b.req("POST", f"/api/groups/{gid}/settlements/{pay['id']}", {"action": "restore"})
check("B2 restore payment (undo)", code == 200, t[:200])
code, st7, t = a.req("GET", f"/api/groups/{gid}/settlements")
check("B2 restored payment counts again", any(h["id"] == pay["id"] for h in st7["history"]), t[:200])

# --- settings: simplify, currency, archive ---
code, j, t = a.req("PUT", f"/api/groups/{gid}", {"currency": "USD"})
check("B2 currency change blocked once expenses exist", code == 409, t[:200])
code, j, t = b.req("PUT", f"/api/groups/{gid}", {"name": "nope"})
check("B2 non-admin cannot change settings", code == 403, code)
code, j, t = a.req("PUT", f"/api/groups/{gid}", {"name": f"Trip {RUN} renamed", "description": "Bali", "simplifyDebts": False})
check("B2 admin renames + simplify off", code == 200 and j.get("simplifyDebts") is False, t[:200])
code, st8, t = a.req("GET", f"/api/groups/{gid}/settlements")
check("B2 settlements report simplify=false", code == 200 and st8.get("simplify") is False, t[:200])
code, g3, t = x.req("POST", "/api/groups", {"name": f"Empty {RUN}", "currency": "EUR"})
code, j, t = x.req("PUT", f"/api/groups/{g3['id']}", {"currency": "JPY"})
check("B2 currency change allowed while empty", code == 200 and j.get("currency") == "JPY", t[:200])
code, j, t = a.req("PUT", f"/api/groups/{gid}", {"archived": True})
check("B2 archive group", code == 200 and j.get("archived") is True, t[:200])
code, j, t = a.req("POST", "/api/expenses", {"groupId": gid, "description": "late", "amount": 10, "splitMethod": "EQUAL", "payers": [{"userId": aid, "amountPaid": 10}], "participants": [{"userId": aid}]})
check("B2 archived group rejects new expense", code == 409, code)
code, j, t = b.req("POST", f"/api/groups/{gid}/settlements", {"toUserId": aid, "amount": 1})
check("B2 archived group rejects payment", code == 409, code)
code, j, t = a.req("DELETE", f"/api/expenses/{eid}")
check("B2 archived group rejects delete", code == 409, code)
code, j, t = a.req("PUT", f"/api/groups/{gid}", {"name": "while archived"})
check("B2 archived group rejects settings change", code == 409, code)
code, j, t = a.req("GET", f"/api/expenses/{eid}")
check("B2 archived group still readable", code == 200, code)
code, j, t = a.req("PUT", f"/api/groups/{gid}", {"archived": False})
check("B2 unarchive group", code == 200 and j.get("archived") is False, t[:200])

# --- leave / delete group ---
code, gm, t = a.req("GET", f"/api/groups/{gid}")
mem = {m_["user"]["email"]: m_["id"] for m_ in gm["members"]}
code, j, t = a.req("DELETE", f"/api/groups/{gid}/members/{mem[ae]}")
check("B2 last admin / unsettled cannot leave", code == 400, t[:200])
code, j, t = a.req("DELETE", f"/api/groups/{gid}", {"confirmName": f"Trip {RUN} renamed"})
check("B2 cannot delete unsettled group", code == 409, t[:200])
code, j, t = b.req("DELETE", f"/api/groups/{g3['id']}", {"confirmName": f"Empty {RUN}"})
check("B2 non-member cannot delete group", code == 403, code)
code, j, t = x.req("DELETE", f"/api/groups/{g3['id']}", {"confirmName": "wrong"})
check("B2 delete needs typed name", code == 400, code)
code, j, t = x.req("DELETE", f"/api/groups/{g3['id']}", {"confirmName": f"Empty {RUN}"})
check("B2 owner deletes settled group", code == 200, t[:200])
code, j, t = x.req("GET", f"/api/groups/{g3['id']}")
check("B2 deleted group gone", code in (403, 404), code)

# --- activity ---
code, act, t = a.req("GET", f"/api/activity?groupId={gid}&limit=100")
types = [i["type"] for i in (act or {}).get("items", [])]
need = ["EXPENSE_CREATED", "EXPENSE_UPDATED", "EXPENSE_DELETED", "EXPENSE_RESTORED", "PAYMENT_RECORDED", "PAYMENT_UPDATED",
        "PAYMENT_DELETED", "PAYMENT_RESTORED", "MEMBER_INVITED", "MEMBER_JOINED", "GROUP_CREATED", "GROUP_RENAMED",
        "GROUP_SETTINGS_CHANGED", "GROUP_ARCHIVED", "GROUP_UNARCHIVED", "COMMENT_ADDED"]
missing = [n for n in need if n not in types]
check("B2 activity recorded for every event", code == 200 and not missing, missing)
lines = [i["line"]["text"] for i in act["items"]]
check("B2 activity lines are readable", any(l.startswith('You added "Dinner"') for l in lines) and any("Budi commented" in l for l in lines), lines[:6])
created = next(i for i in act["items"] if i["type"] == "EXPENSE_CREATED" and i["expenseId"] == eid)
check("B2 activity links to expense", created["line"]["href"] == f"/expenses/{eid}", created["line"])
code, pg1, t = a.req("GET", "/api/activity?limit=3")
code, pg2, t = a.req("GET", f"/api/activity?limit=3&cursor={pg1['nextCursor']}")
check("B2 activity pages", len(pg1["items"]) == 3 and pg1["nextCursor"] and pg2["items"] and pg2["items"][0]["id"] not in [i["id"] for i in pg1["items"]], t[:200])
code, j, t = x.req("GET", f"/api/activity?groupId={gid}")
check("B2 non-member cannot read group activity", code == 403, code)
code, j, t = x.req("GET", "/api/activity?limit=100")
check("B2 other users' feed excludes the group", code == 200 and all(i.get("groupId") != gid for i in j["items"]), t[:200])

for p in ["/activity", f"/expenses/{eid}", f"/expenses/{eid}/edit", f"/expenses/{e2id}", f"/groups/{gid}/settings"]:
    code, _, t = a.req("GET", p)
    check(f"B2 page {p}", code == 200 and "Application error" not in t, code)
code, _, t = x.req("GET", f"/expenses/{eid}")
check("B2 non-member gets 404 on expense page", code == 404, code)


if PROD:
    # Production: stop before the cron / DB-assertion section (it drives recurring
    # expenses with a fake clock and needs direct DB access).
    print(f"\n{sum(r for _, r in results)}/{len(results)} passed (--prod subset)")
    sys.exit(0 if all(r for _, r in results) else 1)


# ======================= BATCH 3 =======================
def read_env_file(path):
    try:
        lines = open(path).read().splitlines()
    except OSError:
        return {}
    return dict(l.split("=", 1) for l in lines if "=" in l and not l.lstrip().startswith("#"))

SECRET = os.environ.get("CRON_SECRET") or read_env_file(os.environ.get("ENV_FILE", os.path.join(REPO, ".env"))).get("CRON_SECRET", "").strip().strip('"')
if not SECRET:
    sys.exit("CRON_SECRET not found (set it or ENV_FILE)")
DB_CONTAINER = os.environ.get("DB_CONTAINER", "fairshare-dev-db")
DB_NAME = os.environ.get("DB_NAME", "fairshare")
DB_USER = os.environ.get("DB_USER", "postgres")

def sql(q):
    r = subprocess.run(["docker", "exec", DB_CONTAINER, "psql", "-U", DB_USER, "-d", DB_NAME, "-tAc", q], capture_output=True, text=True,
                       env={**os.environ, "PATH": "/usr/bin:" + os.environ.get("PATH", "")})
    if r.returncode != 0:
        sys.exit(f"psql via docker failed: {r.stderr.strip()[:300]}")
    return r.stdout.strip()

def hreq(c, method, path, body=None, headers=None):
    data = json.dumps(body).encode() if body is not None else None
    h = {"Content-Type": "application/json", **(headers or {})}
    r = urllib.request.Request(B + path, data=data, method=method, headers=h)
    try:
        resp = c.op.open(r, timeout=180); code = resp.status; txt = resp.read().decode()
    except urllib.error.HTTPError as e:
        code = e.code; txt = e.read().decode()
    try: j = json.loads(txt)
    except Exception: j = None
    return code, j, txt

def cron(body=None, secret=None):
    return hreq(Client(), "POST", "/api/cron/run", body or {}, {"Authorization": f"Bearer {SECRET if secret is None else secret}"})

def wait_notif(activity_id, tries=20):
    for _ in range(tries):
        n = sql(f"select count(*) from \"Activity\" where id='{activity_id}' and \"notifiedAt\" is not null")
        if n == "1": return True
        time.sleep(0.5)
    return False

def last_activity(group_id, typ):
    return sql(f"select id from \"Activity\" where \"groupId\"='{group_id}' and type='{typ}' order by \"createdAt\" desc limit 1")

# --- cron auth ---
code, j, t = cron(secret="")
check("B3 cron without secret -> 401", code == 401, code)
code, j, t = cron(secret="wrong-secret-wrong-secret")
check("B3 cron wrong secret -> 401", code == 401, code)
code, j, t = Client().req("POST", "/api/cron/run", {})
check("B3 cron no header -> 401", code == 401, code)
code, j, t = cron()
check("B3 cron with secret -> 200", code == 200 and j and j.get("ok"), t[:300])

# --- notifications outbox: not to the actor, respects opt-out ---
code, e3, t = b.req("POST", "/api/expenses", {
    "groupId": gid, "description": "Taxi B3", "amount": 30000, "category": "TRANSPORTATION", "splitMethod": "EQUAL",
    "payers": [{"userId": bid, "amountPaid": 30000}], "participants": [{"userId": aid}, {"userId": bid}]})
check("B3 budi adds expense", code == 201, t[:200])
act3 = last_activity(gid, "EXPENSE_CREATED")
check("B3 activity fanned out after commit", wait_notif(act3), act3)
rows = sql(f"select \"userId\"||':'||channel||':'||status from \"Notification\" where \"activityId\"='{act3}'").split("\n")
check("B3 outbox row for ani (email)", any(r.startswith(f"{aid}:EMAIL") for r in rows), rows)
check("B3 nothing queued for the actor", not any(r.startswith(bid) for r in rows), rows)
check("B3 no WhatsApp row while WA is off", not any(":WHATSAPP" in r for r in rows), rows)
st = sql(f"select status from \"Notification\" where \"activityId\"='{act3}' and \"userId\"='{aid}'")
err = sql(f"select \"lastError\" from \"Notification\" where \"activityId\"='{act3}' and \"userId\"='{aid}'")
check("B3 email to a reserved test domain is SKIPPED, never sent", st == "SKIPPED" and "Reserved test domain" in err, (st, err))
payload_text = sql(f"select payload->>'text' from \"Notification\" where \"activityId\"='{act3}' and \"userId\"='{aid}'")
check("B3 email has manage + unsubscribe links", "/unsubscribe?t=" in payload_text and "/account" in payload_text, payload_text[-300:])

code, j, t = a.req("PATCH", "/api/user/notifications", {"events": [{"key": "expense_added", "email": False}]})
check("B3 ani turns off expense emails", code == 200 and next(e for e in j["events"] if e["key"] == "expense_added")["email"] is False, t[:300])
code, e4, t = b.req("POST", "/api/expenses", {
    "groupId": gid, "description": "Coffee B3", "amount": 20000, "splitMethod": "EQUAL",
    "payers": [{"userId": bid, "amountPaid": 20000}], "participants": [{"userId": aid}, {"userId": bid}]})
act4 = last_activity(gid, "EXPENSE_CREATED")
wait_notif(act4)
n4 = sql(f"select count(*) from \"Notification\" where \"activityId\"='{act4}' and \"userId\"='{aid}'")
check("B3 opt-out respected (no row for ani)", act4 != act3 and n4 == "0", (act4, n4))

m_ = re.search(r"/unsubscribe\?t=([A-Za-z0-9_\-.%]+)", payload_text)
tok = urllib.parse.unquote(m_.group(1)) if m_ else ""
code, j, t = Client().req("POST", f"/api/unsubscribe?t={urllib.parse.quote(tok)}")
check("B3 one-click unsubscribe works without login", code == 200 and j and j.get("ok"), t[:200])
code, j, t = Client().req("POST", "/api/unsubscribe?t=forged.token")
check("B3 forged unsubscribe token rejected", code == 400, code)
code, _, t = Client().req("GET", f"/unsubscribe?t={urllib.parse.quote(tok)}")
check("B3 unsubscribe page renders", code == 200 and "Application error" not in t, code)
code, j, t = a.req("PATCH", "/api/user/notifications", {"events": [{"key": "expense_added", "email": True}], "digest": "WEEKLY"})
check("B3 re-enable + weekly digest", code == 200 and j["digest"] == "WEEKLY", t[:200])

# --- WhatsApp disabled mode + phone verification (mocked path) ---
code, j, t = a.req("GET", "/api/user/notifications")
check("B3 WhatsApp reported as not configured", code == 200 and j["whatsappConfigured"] is False, t[:200])
code, j, t = a.req("POST", "/api/user/phone", {"action": "send", "phone": f"+62 812 {RUN[-8:-4]} {RUN[-4:]}"})
check("B3 code send refused while WA disabled (503), number kept", code == 503, t[:200])
code, j, t = a.req("GET", "/api/user/notifications")
check("B3 phone saved but unverified", j["phone"] == f"+62812{RUN[-8:]}" and j["phoneVerified"] is False, t[:200])
code, j, t = a.req("POST", "/api/user/phone", {"action": "send", "phone": "12"})
check("B3 invalid phone rejected", code == 400, code)
code, j, t = hreq(a, "POST", "/api/user/phone", {"action": "test-code", "code": "123456"})
check("B3 test hook needs the secret", code == 404, code)
code, j, t = hreq(a, "POST", "/api/user/phone", {"action": "test-code", "code": "123456"}, {"x-test-secret": SECRET})
check("B3 test code issued", code == 200, t[:200])
code, j, t = a.req("POST", "/api/user/phone", {"action": "verify", "code": "000000"})
check("B3 wrong code rejected", code == 400, t[:200])
code, j, t = a.req("POST", "/api/user/phone", {"action": "verify", "code": "123456"})
check("B3 right code verifies", code == 200, t[:200])
code, j, t = a.req("GET", "/api/user/notifications")
check("B3 phone verified", j["phoneVerified"] is True, t[:200])
code, j, t = a.req("POST", "/api/user/phone", {"action": "verify", "code": "123456"})
check("B3 code cannot be reused", code == 400, code)

# --- reminders ---
code, st7, t = a.req("GET", f"/api/groups/{gid}/settlements")
sug = next((s_ for s_ in st7["suggestedSettlements"] if {s_["toUserId"], s_["fromUserId"]} <= {aid, bid}), None)
check("B3 a debt between ani and budi exists", sug is not None, st7["suggestedSettlements"])
cred_c, debtor, cred_id = (a, sug["fromUserId"], aid) if sug["toUserId"] == aid else (b, sug["fromUserId"], bid)
code, j, t = cred_c.req("POST", f"/api/groups/{gid}/reminders", {"debtorId": debtor})
check("B3 creditor reminds debtor", code == 200, t[:300])
code, j, t = cred_c.req("POST", f"/api/groups/{gid}/reminders", {"debtorId": debtor})
check("B3 second reminder within 24h -> 429", code == 429 and (j or {}).get("retryAt"), t[:200])
rem_n = sql(f"select count(*) from \"Notification\" where event='reminder' and \"userId\"='{debtor}'")
check("B3 reminder queued for the debtor", rem_n != "0", rem_n)
code, j, t = cred_c.req("POST", f"/api/groups/{gid}/reminders", {"debtorId": cred_id})
check("B3 cannot remind someone who does not owe you", code in (400, 409), t[:200])
code, j, t = x.req("POST", f"/api/groups/{gid}/reminders", {"debtorId": debtor})
check("B3 non-member cannot remind", code == 403, code)
code, act, t = a.req("GET", f"/api/activity?groupId={gid}&limit=20")
check("B3 reminder in activity", any(i["type"] == "REMINDER_SENT" for i in act["items"]), [i["type"] for i in act["items"]][:5])
code, j, t = a.req("PUT", f"/api/groups/{gid}", {"autoRemindWeekly": True})
check("B3 turn on weekly auto reminders", code == 200, t[:200])

# --- recurring via cron with fake now ---
code, r1, t = a.req("POST", "/api/expenses", {
    "groupId": gid, "description": "Rent B3", "amount": 300000, "category": "UTILITIES", "splitMethod": "EQUAL", "date": "2026-01-31",
    "payers": [{"userId": aid, "amountPaid": 300000}], "participants": [{"userId": aid}, {"userId": bid}],
    "repeat": {"frequency": "MONTHLY", "endDate": "2026-04-30"}})
check("B3 create monthly repeating expense", code == 201, t[:300])
rid = sql(f"select id from \"RecurringExpense\" where \"sourceExpenseId\"='{r1['id']}'")
check("B3 template created", bool(rid), rid)
code, j, t = cron({"now": "2026-03-05T12:00:00Z", "only": ["recurring"]})
check("B3 cron creates due occurrence", code == 200 and j["recurring"]["created"] == 1, t[:300])
code, j, t = cron({"now": "2026-03-05T12:00:00Z", "only": ["recurring"]})
check("B3 cron is idempotent", code == 200 and j["recurring"]["created"] == 0, t[:300])
dates = sql(f"select to_char(date,'YYYY-MM-DD')||':'||amount from \"Expense\" where \"recurringId\"='{rid}' and \"isDeleted\"=false order by date")
check("B3 Jan 31 -> Feb 28, same amount", dates == "2026-02-28:300000.00", dates)
code, j, t = cron({"now": "2026-06-01T12:00:00Z", "only": ["recurring"]})
dates = sql(f"select string_agg(to_char(date,'YYYY-MM-DD'), ',' order by date) from \"Expense\" where \"recurringId\"='{rid}'")
check("B3 catches up to end date (Mar 31, Apr 30) then stops", dates == "2026-02-28,2026-03-31,2026-04-30" and sql(f"select status from \"RecurringExpense\" where id='{rid}'") == "STOPPED", dates)
occ = sql(f"select id from \"Expense\" where \"recurringId\"='{rid}' order by date limit 1")
splits = sql(f"select string_agg(amount::text, ',' order by amount) from \"ExpenseSplit\" where \"expenseId\"='{occ}'")
check("B3 occurrence copies splits", splits == "150000.00,150000.00", splits)
creator = sql(f"select \"actorId\" from \"Activity\" where \"expenseId\"='{occ}' and type='EXPENSE_CREATED'")
check("B3 occurrence recorded as created by owner", creator == aid, creator)
code, j, t = x.req("PATCH", f"/api/recurring/{rid}", {"status": "PAUSED"})
check("B3 outsider cannot manage template", code in (403, 404), code)

# --- multi-currency with a manual rate ---
code, fx1, t = a.req("POST", "/api/expenses", {
    "groupId": gid, "description": "Souvenir USD", "amount": 10, "currency": "USD", "exchangeRate": 16000, "splitMethod": "EQUAL",
    "payers": [{"userId": aid, "amountPaid": 10}], "participants": [{"userId": aid}, {"userId": bid}, {"userId": xid if False else bid}][:2]})
check("B3 expense in USD with manual rate", code == 201, t[:300])
row = sql(f"select amount||'|'||\"originalAmount\"||'|'||\"originalCurrency\"||'|'||\"exchangeRate\"::float||'|'||\"rateSource\" from \"Expense\" where id='{(fx1 or {}).get('id')}'")
check("B3 stored converted + original", row == "160000.00|10.00|USD|16000|manual", row)
sp = sql(f"select string_agg(amount::text, ',' order by amount) from \"ExpenseSplit\" where \"expenseId\"='{(fx1 or {}).get('id')}'")
check("B3 converted shares in whole rupiah", sp == "80000.00,80000.00", sp)
code, fx2, t = a.req("POST", "/api/expenses", {
    "groupId": gid, "description": "Odd USD", "amount": 10, "currency": "USD", "exchangeRate": 16250.55, "splitMethod": "EQUAL",
    "payers": [{"userId": aid, "amountPaid": 10}], "participants": [{"userId": aid}, {"userId": bid}, {"email": ghost}]})
sp2 = sql(f"select string_agg(amount::text, ',' order by amount)||'|'||(select amount from \"Expense\" where id='{(fx2 or {}).get('id')}') from \"ExpenseSplit\" where \"expenseId\"='{(fx2 or {}).get('id')}'")
check("B3 3-way conversion sums, whole units", sp2 == "54168.00,54169.00,54169.00|162506.00", sp2)
code, j, t = a.req("GET", f"/expenses/{(fx1 or {}).get('id')}")
check("B3 detail shows both amounts", code == 200 and "USD" in t and ("10.00" in t) and "160,000" in t, code)
code, j, t = a.req("POST", "/api/expenses", {
    "groupId": gid, "description": "Bad rate", "amount": 10, "currency": "USD", "exchangeRate": -1, "splitMethod": "EQUAL",
    "payers": [{"userId": aid, "amountPaid": 10}], "participants": [{"userId": aid}]})
check("B3 negative rate rejected", code == 400, code)

# --- CSV export ---
code, hdr, raw_ = a.raw(f"/api/groups/{gid}/export.csv")
txt = raw_.decode("utf-8", "replace")
check("B3 group CSV 200 + csv type + BOM", code == 200 and "text/csv" in hdr.get("Content-Type", "") and raw_.startswith(b"\xef\xbb\xbf"), (code, hdr.get("Content-Type")))
check("B3 group CSV has share columns + payments", "Share: Ani" in txt and "Share: Budi" in txt and "\r\nPayments\r\n" in txt and "Souvenir USD" in txt, txt[:300])
check("B3 CSV zero-decimal amounts", ",160000," in txt and "160000.00" not in txt, txt[:500])
code, hdr, raw_ = x.raw(f"/api/groups/{gid}/export.csv")
check("B3 non-member CSV denied", code == 403, code)
code, hdr, raw_ = Client().raw(f"/api/groups/{gid}/export.csv")
check("B3 anonymous CSV denied", code == 401, code)
code, hdr, raw_ = b.raw("/api/expenses/export.csv")
t2 = raw_.decode("utf-8", "replace")
check("B3 my CSV has my share column", code == 200 and "Your share" in t2 and "Taxi B3" in t2, t2[:200])
code, j, t = a.req("POST", "/api/expenses", {
    "groupId": gid, "description": '=HYPERLINK("x"), "quoted"', "amount": 1000, "splitMethod": "EQUAL", "notes": "line1\nline2",
    "payers": [{"userId": aid, "amountPaid": 1000}], "participants": [{"userId": aid}]})
code, hdr, raw_ = a.raw(f"/api/groups/{gid}/export.csv")
txt = raw_.decode("utf-8")
check("B3 CSV escapes quotes/newlines and formulas", '"\'=HYPERLINK(""x""), ""quoted"""' in txt and '"line1\nline2"' in txt, [l for l in txt.split("\r\n") if "HYPERLINK" in l][:1])

# --- friends / direct expenses ---
code, j, t = a.req("POST", "/api/friends", {"email": xe})
check("B3 add friend by email", code == 201 and j["id"] == xid, t[:200])
code, j, t = a.req("POST", "/api/friends", {"email": xe})
check("B3 adding again is idempotent", code == 200, code)
newf = f"newfriend{RUN}@{DOMAIN}"
code, j, t = a.req("POST", "/api/friends", {"email": newf})
check("B3 add friend without account (ghost + invite)", code == 201 and j["isGhost"] is True, t[:200])
code, fr, t = a.req("GET", f"/api/friends/{xid}")
dg = (fr or {}).get("directGroupId")
check("B3 direct group exists", code == 200 and dg, t[:200])
code, j, t = a.req("GET", "/api/groups")
lst = j if isinstance(j, list) else (j or {}).get("groups", [])
check("B3 direct group hidden from group list", all(g_["id"] != dg for g_ in lst), t[:200])
code, de, t = a.req("POST", "/api/expenses", {
    "groupId": dg, "description": "Lunch with Xeno", "amount": 50, "splitMethod": "EQUAL",
    "payers": [{"userId": aid, "amountPaid": 50}], "participants": [{"userId": aid}, {"userId": xid}]})
check("B3 1:1 expense", code == 201, t[:200])
code, fl, t = x.req("GET", "/api/friends")
me_ = next((f_ for f_ in fl if f_["id"] == aid), None)
check("B3 friend balance: xeno owes ani 25", me_ and any(abs(b_["net"] + 25) < 0.001 for b_ in me_["balances"]), me_)
code, j, t = x.req("POST", f"/api/groups/{dg}/settlements", {"toUserId": aid, "amount": 25})
check("B3 settle up 1:1", code in (200, 201), t[:200])
code, fl, t = x.req("GET", "/api/friends")
me_ = next((f_ for f_ in fl if f_["id"] == aid), None)
check("B3 settled with friend", me_ and all(abs(b_["net"]) < 0.001 for b_ in me_["balances"]), me_)
code, j, t = a.req("POST", f"/api/groups/{dg}/members", {"email": be})
check("B3 cannot add a third person to a 1:1", code == 400, code)
code, j, t = a.req("DELETE", f"/api/groups/{dg}", {"confirmName": "x"})
check("B3 cannot delete a 1:1", code == 400, code)
code, j, t = b.req("GET", f"/api/friends/{xid}")
check("B3 not a friend -> 404", code == 404, code)
code, j, t = b.req("POST", f"/api/friends/{xid}")
check("B3 cannot start 1:1 with a stranger", code == 404, code)

# --- insights ---
code, ins, t = b.req("GET", "/api/insights?from=2026-01-01&to=2026-12-31")
idr = next((c_ for c_ in (ins or {}).get("currencies", []) if c_["currency"] == "IDR"), None)
check("B3 insights: my share by category/month", code == 200 and idr and idr["totalCents"] > 0 and idr["byCategory"] and len(idr["byMonth"]) == 12, t[:300])
code, ins2, t = b.req("GET", f"/api/insights?groupId={gid}&from=2026-02-01&to=2026-02-28")
feb = next((c_ for c_ in ins2["currencies"] if c_["currency"] == "IDR"), None)
check("B3 insights filter by group + range (Feb rent share)", feb and feb["totalCents"] == 15000000, ins2["currencies"])
code, j, t = Client().req("GET", "/api/insights")
check("B3 insights needs login", code == 401, code)

# --- cron full run: idempotent ---
code, j1, t = cron()
code2, j2, t2 = cron()
check("B3 full cron run twice ok", code == 200 and code2 == 200, (t[:200], t2[:200]))
check("B3 second run sends nothing new", j2["recurring"]["created"] == 0 and (j2["outbox"] or {}).get("sent", 0) == 0 and (j2.get("digests") or {}).get("sent", 0) == 0, t2[:400])
check("B3 digest sent once for ani", sql(f"select count(*) from \"Notification\" where \"userId\"='{aid}' and event='digest'") == "1", sql(f"select count(*) from \"Notification\" where \"userId\"='{aid}' and event='digest'"))

# --- money formatting ---
code, _, t = a.req("GET", f"/groups/{gid}")
check("B3 IDR shown without decimals", "IDR" in t and not re.search(r"IDR\s?[\d,]+\.\d\d", t), re.findall(r"IDR\s?[\d,]+\.\d\d", t)[:3])

for p in ["/friends", f"/friends/{xid}", f"/friends/{xid}/expenses/create", "/insights", "/account?tab=notifications", f"/groups/{gid}/settings", f"/expenses/{r1['id']}", "/expenses", "/groups", "/dashboard"]:
    code, _, t = a.req("GET", p)
    check(f"B3 page {p}", code == 200 and "Application error" not in t, code)

if IDS_FILE:
    open(IDS_FILE, "w").write(json.dumps({"gid": gid, "xid": xid, "rexp": r1["id"], "fx": (fx1 or {}).get("id"), "ae": ae, "be": be, "xe": xe}))
print(f"\n{sum(r for _, r in results)}/{len(results)} passed")
sys.exit(0 if all(r for _, r in results) else 1)
