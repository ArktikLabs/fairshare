import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emailDomain, isReservedEmail, RESERVED_DOMAIN_REASON } from "./email-domains";
import { deliverMail, sendMail } from "./mailer";

describe("isReservedEmail", () => {
  it.each([
    "a@smoke.invalid",
    "b@demo.test",
    "c@foo.example",
    "d@localhost",
    "e@my.localhost",
    "f@example.com",
    "g@mail.example.org",
    "h@EXAMPLE.NET",
    "i@SMOKE.INVALID.",
    "no-at-sign",
    "@nodomain.com",
    "",
    null,
    undefined,
  ])("treats %s as reserved", (addr) => {
    expect(isReservedEmail(addr)).toBe(true);
  });

  it.each(["aan@arktik.id", "x@gmail.com", "y@example.co", "z@notexample.com", "w@test.com", "v@invalid.io"])(
    "allows real address %s",
    (addr) => {
      expect(isReservedEmail(addr)).toBe(false);
    }
  );

  it("extracts the domain", () => {
    expect(emailDomain(" A@B.Example.COM ")).toBe("b.example.com");
    expect(emailDomain("nope")).toBeNull();
  });
});

describe("deliverMail guard", () => {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: "re_1" }), { status: 200 }));
  beforeEach(() => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_FROM", "FairShare <noreply@mail.arktik.id>");
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "info").mockImplementation(() => {});
    fetchMock.mockClear();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("never calls Resend for reserved domains", async () => {
    const r = await deliverMail({ to: "smoke+1@smoke.invalid", subject: "s", text: "t" });
    expect(r).toEqual({ ok: false, error: RESERVED_DOMAIN_REASON, skipped: true, retryable: false });
    expect(await sendMail({ to: "friend@example.com", subject: "invite", text: "t" })).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("still sends to real domains", async () => {
    const r = await deliverMail({ to: "someone@arktik.id", subject: "s", text: "t" });
    expect(r).toEqual({ ok: true, id: "re_1" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
