import { describe, expect, it } from "vitest";
import { BOM, csvAmount, csvCell, csvRow, fileSlug, toCsv } from "./csv";

describe("csv escaping", () => {
  it("leaves plain values alone", () => {
    expect(csvCell("Dinner")).toBe("Dinner");
    expect(csvCell(12.5)).toBe("12.5");
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
  });
  it("quotes commas, quotes and newlines (RFC 4180)", () => {
    expect(csvCell("Pizza, beer")).toBe('"Pizza, beer"');
    expect(csvCell('The "big" one')).toBe('"The ""big"" one"');
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
    expect(csvCell("a\r\nb")).toBe('"a\r\nb"');
  });
  it("keeps surrounding spaces by quoting", () => {
    expect(csvCell(" padded ")).toBe('" padded "');
  });
  it("neutralises spreadsheet formulas", () => {
    expect(csvCell("=SUM(A1:A9)")).toBe("'=SUM(A1:A9)");
    expect(csvCell("+62 812")).toBe("'+62 812");
    expect(csvCell("@cmd")).toBe("'@cmd");
    expect(csvCell("-5")).toBe("'-5");
    // numbers are numbers, not text
    expect(csvCell(-5)).toBe("-5");
  });
  it("keeps unicode", () => {
    expect(csvCell("Café Ñandú 寿司")).toBe("Café Ñandú 寿司");
  });
  it("writes rows with CRLF and a BOM", () => {
    expect(csvRow(["a", "b,c", 3])).toBe('a,"b,c",3');
    const out = toCsv([["h1", "h2"], ["x", "y"]]);
    expect(out.startsWith(BOM)).toBe(true);
    expect(out).toBe("\uFEFFh1,h2\r\nx,y\r\n");
  });
  it("formats amounts with the currency decimals", () => {
    expect(csvAmount(1250, 2)).toBe("12.50");
    expect(csvAmount(90000000, 0)).toBe("900000");
    expect(csvAmount(5, 2)).toBe("0.05");
  });
  it("makes safe file names", () => {
    expect(fileSlug("Bali trip 2026!")).toBe("bali-trip-2026");
    expect(fileSlug("Café")).toBe("cafe");
    expect(fileSlug("///")).toBe("export");
  });
});
