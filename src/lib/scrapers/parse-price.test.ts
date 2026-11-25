import { describe, expect, it } from "vitest";
import { parseBrazilianPrice } from "@/lib/scrapers/parse-price";

describe("parseBrazilianPrice", () => {
  it("parses Brazilian currency with thousand separators", () => {
    expect(parseBrazilianPrice("R$ 1.234,56")).toBe(1234.56);
  });

  it("parses values that only use a comma as decimal separator", () => {
    expect(parseBrazilianPrice("R$ 99,90")).toBe(99.9);
  });

  it("parses plain decimal strings", () => {
    expect(parseBrazilianPrice("109.44")).toBe(109.44);
  });

  it("returns null for invalid values", () => {
    expect(parseBrazilianPrice("")).toBeNull();
    expect(parseBrazilianPrice("abc")).toBeNull();
    expect(parseBrazilianPrice("R$ 0")).toBeNull();
  });
});
