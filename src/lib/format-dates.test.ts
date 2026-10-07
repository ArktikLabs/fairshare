import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime } from "./utils";

describe("formatDate", () => {
  it("reads calendar dates (UTC midnight) as that day in any zone", () => {
    expect(formatDate("2026-10-08T00:00:00.000Z")).toBe("Oct 8, 2026");
  });
  it("puts a timestamp on the day in the given zone (server and browser must agree)", () => {
    // 16:30 UTC = 00:30 next day in Shanghai, still the same day in Jakarta:
    // the root of the group-page hydration mismatch.
    const iso = "2026-10-07T16:30:00.000Z";
    expect(formatDate(iso, "UTC")).toBe("Oct 7, 2026");
    expect(formatDate(iso, "Asia/Shanghai")).toBe("Oct 8, 2026");
    expect(formatDate(iso, "Asia/Jakarta")).toBe("Oct 7, 2026");
    expect(() => formatDate(iso, "Not/AZone")).not.toThrow();
  });
});

describe("formatDateTime", () => {
  it("uses the viewer's time zone when given", () => {
    const iso = "2026-10-07T23:30:00.000Z";
    expect(formatDateTime(iso, "Asia/Jakarta")).toBe("Oct 8, 2026, 06:30 AM");
    expect(formatDateTime(iso, "America/New_York")).toBe("Oct 7, 2026, 07:30 PM");
  });
  it("ignores an unknown zone instead of throwing", () => {
    expect(() => formatDateTime("2026-10-07T23:30:00.000Z", "Not/AZone")).not.toThrow();
  });
});
