import { describe, expect, it } from "vitest";
import { detectStoreFromUrl } from "@/lib/products/detect-store-client";

describe("detectStoreFromUrl", () => {
  it("detects Amazon BR", () => {
    expect(
      detectStoreFromUrl("https://www.amazon.com.br/dp/B0EXAMPLE"),
    ).toBe("AMAZON_BR");
  });

  it("detects Kabum", () => {
    expect(
      detectStoreFromUrl("https://www.kabum.com.br/produto/123/item"),
    ).toBe("KABUM");
  });

  it("returns null for unsupported stores", () => {
    expect(detectStoreFromUrl("https://www.example.com/product/1")).toBeNull();
  });

  it("returns null for invalid URLs", () => {
    expect(detectStoreFromUrl("not-a-url")).toBeNull();
  });
});
