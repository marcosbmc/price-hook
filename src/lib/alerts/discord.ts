import { calcDiscountPercent } from "@/lib/alerts/alert-rules";

export type DiscordPriceAlertPayload = {
  productTitle: string;
  productUrl: string;
  store: string;
  currentPrice: number;
  previousPrice: number | null;
  targetPrice: number | null;
  available: boolean;
};

function formatBrl(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDiscountPercent(previousPrice: number, currentPrice: number): string {
  const percent = calcDiscountPercent(previousPrice, currentPrice);
  return percent === null ? "—" : `${percent}%`;
}

export async function sendDiscordPriceAlert(
  webhookUrl: string,
  payload: DiscordPriceAlertPayload,
): Promise<void> {
  const hasDrop =
    payload.previousPrice !== null && payload.currentPrice < payload.previousPrice;
  const hasTarget = payload.targetPrice !== null;

  const content = hasTarget
    ? "Price target reached on PriceHook"
    : "Price drop detected on PriceHook";

  const fields: Array<{ name: string; value: string; inline: boolean }> = [
    {
      name: "Previous price",
      value:
        payload.previousPrice === null ? "—" : formatBrl(payload.previousPrice),
      inline: true,
    },
    {
      name: "New price",
      value: formatBrl(payload.currentPrice),
      inline: true,
    },
    {
      name: "Discount",
      value:
        payload.previousPrice === null
          ? "—"
          : formatDiscountPercent(payload.previousPrice, payload.currentPrice),
      inline: true,
    },
  ];

  if (hasTarget && payload.targetPrice !== null) {
    fields.push({
      name: "Target price",
      value: formatBrl(payload.targetPrice),
      inline: true,
    });

    fields.push({
      name: "Savings vs target",
      value: formatBrl(Math.max(payload.targetPrice - payload.currentPrice, 0)),
      inline: true,
    });
  }

  fields.push(
    {
      name: "Store",
      value: payload.store,
      inline: true,
    },
    {
      name: "Availability",
      value: payload.available ? "In stock" : "Unavailable",
      inline: true,
    },
  );

  const body = {
    content: hasDrop || hasTarget ? content : "Price update on PriceHook",
    embeds: [
      {
        title: payload.productTitle,
        url: payload.productUrl,
        color: 0x22c55e,
        fields,
        timestamp: new Date().toISOString(),
      },
    ],
  };

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Discord webhook failed with HTTP ${response.status}`);
  }
}
