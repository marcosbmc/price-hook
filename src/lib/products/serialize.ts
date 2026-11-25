import type { PriceHistory, Product } from "@/generated/prisma/client";
import type { Store } from "@/generated/prisma/enums";

export type ProductView = {
  id: string;
  url: string;
  store: Store;
  title: string | null;
  targetPrice: number | null;
  webhookUrl: string;
  lastPrice: number | null;
  lastCheckedAt: string | null;
  lastAlertSentAt: string | null;
  lastError: string | null;
  isActive: boolean;
  createdAt: string;
};

export type PriceHistoryView = {
  id: string;
  price: number;
  available: boolean;
  scrapedAt: string;
};

export function serializeProduct(product: Product): ProductView {
  return {
    id: product.id,
    url: product.url,
    store: product.store,
    title: product.title,
    targetPrice:
      product.targetPrice === null ? null : Number(product.targetPrice),
    webhookUrl: product.webhookUrl,
    lastPrice: product.lastPrice === null ? null : Number(product.lastPrice),
    lastCheckedAt: product.lastCheckedAt?.toISOString() ?? null,
    lastAlertSentAt: product.lastAlertSentAt?.toISOString() ?? null,
    lastError: product.lastError,
    isActive: product.isActive,
    createdAt: product.createdAt.toISOString(),
  };
}

export function serializePriceHistory(entry: PriceHistory): PriceHistoryView {
  return {
    id: entry.id,
    price: Number(entry.price),
    available: entry.available,
    scrapedAt: entry.scrapedAt.toISOString(),
  };
}

export function formatBrl(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatDateTime(iso: string | null): string {
  if (!iso) {
    return "Never";
  }

  return new Date(iso).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export type ProductStatusTone = "ok" | "warning" | "error" | "paused";

export function getProductStatus(product: ProductView): {
  tone: ProductStatusTone;
  label: string;
} {
  if (!product.isActive) {
    return { tone: "paused", label: "Paused" };
  }

  if (product.lastError) {
    if (product.lastError.includes("[BLOCKED]") || /blocked/i.test(product.lastError)) {
      return { tone: "error", label: "Blocked" };
    }

    return { tone: "warning", label: "Needs attention" };
  }

  if (!product.lastCheckedAt) {
    return { tone: "ok", label: "Ready" };
  }

  return { tone: "ok", label: "Healthy" };
}
