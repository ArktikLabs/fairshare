import { beforeEach, describe, expect, it, vi } from "vitest";

// The outbox must mark rows for reserved test domains SKIPPED without calling
// any transport (Resend or WAHA).
const db = vi.hoisted(() => ({
  notification: {
    updateMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}));
vi.mock("./../prisma", () => ({ prisma: db }));
const deliverMail = vi.hoisted(() => vi.fn());
vi.mock("../mailer", () => ({ deliverMail }));
const sendWhatsAppText = vi.hoisted(() => vi.fn());
vi.mock("./whatsapp-waha", () => ({ sendWhatsAppText }));

import { sendNotification } from "./outbox";
import { RESERVED_DOMAIN_REASON } from "../email-domains";

function row(channel: "EMAIL" | "WHATSAPP", email: string) {
  return {
    id: "n1",
    channel,
    attempts: 1,
    payload: { subject: "s", text: "t" },
    user: { email, phone: "+6281234567890", phoneVerifiedAt: new Date(), status: "ACTIVE" },
  };
}

describe("sendNotification reserved-domain guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.notification.updateMany.mockResolvedValue({ count: 1 });
    db.notification.update.mockResolvedValue({});
    deliverMail.mockResolvedValue({ ok: true, id: "x" });
    sendWhatsAppText.mockResolvedValue({ ok: true });
  });

  it.each(["EMAIL", "WHATSAPP"] as const)("skips %s for a @smoke.invalid user", async (channel) => {
    db.notification.findUnique.mockResolvedValue(row(channel, "qa@smoke.invalid"));
    expect(await sendNotification("n1")).toBe("skipped");
    expect(deliverMail).not.toHaveBeenCalled();
    expect(sendWhatsAppText).not.toHaveBeenCalled();
    expect(db.notification.update).toHaveBeenCalledWith({
      where: { id: "n1" },
      data: { status: "SKIPPED", lastError: RESERVED_DOMAIN_REASON },
    });
  });

  it("sends email for a real address", async () => {
    db.notification.findUnique.mockResolvedValue(row("EMAIL", "someone@arktik.id"));
    expect(await sendNotification("n1")).toBe("sent");
    expect(deliverMail).toHaveBeenCalledTimes(1);
  });
});
