import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime } from "./utils";

describe("formatDate", () => {
  it("reads calendar dates (UTC midnight) as that day in any zone", () => {
    expect(formatDate("2026-10-08T00:00:00.000Z")).toBe("Oct 8, 2026");
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
