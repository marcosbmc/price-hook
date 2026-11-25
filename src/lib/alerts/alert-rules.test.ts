import { describe, expect, it } from "vitest";
import {
  ALERT_COOLDOWN_MS,
  calcDiscountPercent,
  shouldSendAlert,
} from "@/lib/alerts/alert-rules";

describe("shouldSendAlert", () => {
  const now = new Date("2026-01-15T12:00:00.000Z");

  it("alerts on any drop when targetPrice is null", () => {
    expect(
      shouldSendAlert({
        currentPrice: 90,
        targetPrice: null,
        previousLastPrice: 100,
        lastAlertSentAt: null,
        now,
      }),
    ).toBe(true);
  });

  it("does not alert without target when price did not drop", () => {
    expect(
      shouldSendAlert({
        currentPrice: 100,
        targetPrice: null,
        previousLastPrice: 100,
        lastAlertSentAt: null,
        now,
      }),
    ).toBe(false);
  });

  it("does not alert without target on first check (no previous price)", () => {
    expect(
      shouldSendAlert({
        currentPrice: 80,
        targetPrice: null,
        previousLastPrice: null,
        lastAlertSentAt: null,
        now,
      }),
    ).toBe(false);
  });

  it("alerts when current price is at or below target", () => {
    expect(
      shouldSendAlert({
        currentPrice: 99,
        targetPrice: 100,
        previousLastPrice: 120,
        lastAlertSentAt: null,
        now,
      }),
    ).toBe(true);
  });

  it("does not alert when current price is above target", () => {
    expect(
      shouldSendAlert({
        currentPrice: 110,
        targetPrice: 100,
        previousLastPrice: 120,
        lastAlertSentAt: null,
        now,
      }),
    ).toBe(false);
  });

  it("blocks duplicate target alerts inside the cooldown window", () => {
    expect(
      shouldSendAlert({
        currentPrice: 95,
        targetPrice: 100,
        previousLastPrice: 95,
        lastAlertSentAt: new Date(now.getTime() - 60 * 60 * 1000),
        now,
      }),
    ).toBe(false);
  });

  it("allows target alert after cooldown", () => {
    expect(
      shouldSendAlert({
        currentPrice: 95,
        targetPrice: 100,
        previousLastPrice: 95,
        lastAlertSentAt: new Date(now.getTime() - ALERT_COOLDOWN_MS - 1),
        now,
      }),
    ).toBe(true);
  });

  it("allows target alert inside cooldown when price drops further", () => {
    expect(
      shouldSendAlert({
        currentPrice: 90,
        targetPrice: 100,
        previousLastPrice: 95,
        lastAlertSentAt: new Date(now.getTime() - 60 * 60 * 1000),
        now,
      }),
    ).toBe(true);
  });
});

describe("calcDiscountPercent", () => {
  it("returns the discount percentage on a drop", () => {
    expect(calcDiscountPercent(100, 85)).toBe(15);
  });

  it("returns null when there is no drop", () => {
    expect(calcDiscountPercent(100, 100)).toBeNull();
    expect(calcDiscountPercent(80, 90)).toBeNull();
  });
});
