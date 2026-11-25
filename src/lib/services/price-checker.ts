import type { Product } from "@/generated/prisma/client";
import { shouldSendAlert } from "@/lib/alerts/alert-rules";
import { sendDiscordPriceAlert } from "@/lib/alerts/discord";
import { prisma } from "@/lib/db";
import { resolveScraperByStore } from "@/lib/scrapers/registry";
import { ScraperError } from "@/lib/scrapers/types";

export type ProductCheckResult =
  | {
      productId: string;
      status: "success";
      price: number;
      available: boolean;
      alertSent: boolean;
    }
  | {
      productId: string;
      status: "error";
      error: string;
      code: string | null;
    };

export type PriceCheckSummary = {
  checked: number;
  succeeded: number;
  failed: number;
  alertsSent: number;
  results: ProductCheckResult[];
};

function decimalToNumber(value: Product["lastPrice"]): number | null {
  if (value === null) {
    return null;
  }

  return Number(value);
}

function toErrorMessage(error: unknown): { message: string; code: string | null } {
  if (error instanceof ScraperError) {
    return {
      message: `[${error.code}] ${error.message}`,
      code: error.code,
    };
  }

  if (error instanceof Error) {
    return { message: error.message, code: null };
  }

  return { message: "Unknown error while checking product", code: null };
}

export async function checkProductById(productId: string): Promise<ProductCheckResult> {
  const product = await prisma.product.findUnique({ where: { id: productId } });

  if (!product) {
    return {
      productId,
      status: "error",
      error: "Product not found",
      code: null,
    };
  }

  return checkProduct(product);
}

async function checkProduct(product: Product): Promise<ProductCheckResult> {
  const checkedAt = new Date();

  try {
    const scraper = resolveScraperByStore(product.store);
    const scrapeResult = await scraper.scrape(product.url);

    const previousLastPrice = decimalToNumber(product.lastPrice);
    const targetPrice = decimalToNumber(product.targetPrice);
    const alertEligible = shouldSendAlert({
      currentPrice: scrapeResult.price,
      targetPrice,
      previousLastPrice,
      lastAlertSentAt: product.lastAlertSentAt,
    });

    await prisma.$transaction([
      prisma.priceHistory.create({
        data: {
          productId: product.id,
          price: scrapeResult.price,
          available: scrapeResult.available,
          scrapedAt: checkedAt,
        },
      }),
      prisma.product.update({
        where: { id: product.id },
        data: {
          title: scrapeResult.title,
          lastPrice: scrapeResult.price,
          lastCheckedAt: checkedAt,
          lastError: null,
        },
      }),
    ]);

    let alertSent = false;

    if (alertEligible) {
      try {
        await sendDiscordPriceAlert(product.webhookUrl, {
          productTitle: scrapeResult.title,
          productUrl: product.url,
          store: product.store,
          currentPrice: scrapeResult.price,
          previousPrice: previousLastPrice,
          targetPrice,
          available: scrapeResult.available,
        });

        await prisma.product.update({
          where: { id: product.id },
          data: { lastAlertSentAt: checkedAt },
        });

        alertSent = true;
      } catch (alertError) {
        const { message } = toErrorMessage(alertError);
        await prisma.product.update({
          where: { id: product.id },
          data: {
            lastError: `Alert failed: ${message}`.slice(0, 1000),
          },
        });
      }
    }

    return {
      productId: product.id,
      status: "success",
      price: scrapeResult.price,
      available: scrapeResult.available,
      alertSent,
    };
  } catch (error) {
    const { message, code } = toErrorMessage(error);

    await prisma.product.update({
      where: { id: product.id },
      data: {
        lastCheckedAt: checkedAt,
        lastError: message.slice(0, 1000),
      },
    });

    return {
      productId: product.id,
      status: "error",
      error: message,
      code,
    };
  }
}

export async function runPriceCheck(): Promise<PriceCheckSummary> {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });

  const results: ProductCheckResult[] = [];

  for (const product of products) {
    const result = await checkProduct(product);
    results.push(result);
  }

  const succeeded = results.filter((result) => result.status === "success").length;
  const failed = results.filter((result) => result.status === "error").length;
  const alertsSent = results.filter(
    (result) => result.status === "success" && result.alertSent,
  ).length;

  return {
    checked: results.length,
    succeeded,
    failed,
    alertsSent,
    results,
  };
}
