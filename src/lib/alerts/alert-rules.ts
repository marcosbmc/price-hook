export const ALERT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export type AlertDecisionInput = {
  currentPrice: number;
  targetPrice: number | null;
  previousLastPrice: number | null;
  lastAlertSentAt: Date | null;
  now?: Date;
};

function passesTargetAntiSpam(input: {
  currentPrice: number;
  previousLastPrice: number | null;
  lastAlertSentAt: Date | null;
  now: Date;
}): boolean {
  if (input.lastAlertSentAt === null) {
    return true;
  }

  const msSinceLastAlert = input.now.getTime() - input.lastAlertSentAt.getTime();
  if (msSinceLastAlert >= ALERT_COOLDOWN_MS) {
    return true;
  }

  if (
    input.previousLastPrice !== null &&
    input.currentPrice < input.previousLastPrice
  ) {
    return true;
  }

  return false;
}

/**
 * Decides whether a Discord alert should be sent.
 *
 * - Without targetPrice: alert on any drop vs previous lastPrice.
 * - With targetPrice: alert when currentPrice <= targetPrice, with anti-spam.
 */
export function shouldSendAlert(input: AlertDecisionInput): boolean {
  const now = input.now ?? new Date();

  if (input.targetPrice === null) {
    return (
      input.previousLastPrice !== null &&
      input.currentPrice < input.previousLastPrice
    );
  }

  if (input.currentPrice > input.targetPrice) {
    return false;
  }

  return passesTargetAntiSpam({
    currentPrice: input.currentPrice,
    previousLastPrice: input.previousLastPrice,
    lastAlertSentAt: input.lastAlertSentAt,
    now,
  });
}

export function calcDiscountPercent(
  previousPrice: number,
  currentPrice: number,
): number | null {
  if (previousPrice <= 0 || currentPrice >= previousPrice) {
    return null;
  }

  return Number((((previousPrice - currentPrice) / previousPrice) * 100).toFixed(1));
}
