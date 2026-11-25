"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  createProductSchema,
  productIdSchema,
} from "@/lib/products/schema";
import {
  serializePriceHistory,
  serializeProduct,
  type PriceHistoryView,
  type ProductView,
} from "@/lib/products/serialize";
import { detectStore } from "@/lib/scrapers/registry";
import { checkProductById } from "@/lib/services/price-checker";

export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

function flattenZodErrors(
  issues: { path: PropertyKey[]; message: string }[],
): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};

  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
  }

  return fieldErrors;
}

export async function listProducts(): Promise<ProductView[]> {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
  });

  return products.map(serializeProduct);
}

export async function createProduct(
  _prev: ActionResult<ProductView> | null,
  formData: FormData,
): Promise<ActionResult<ProductView>> {
  const parsed = createProductSchema.safeParse({
    url: formData.get("url"),
    targetPrice: formData.get("targetPrice"),
    webhookUrl: formData.get("webhookUrl"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Validation failed",
      fieldErrors: flattenZodErrors(parsed.error.issues),
    };
  }

  const store = detectStore(parsed.data.url);
  if (!store) {
    return {
      ok: false,
      error: "Unsupported store. Use Amazon BR or Kabum URLs",
      fieldErrors: {
        url: ["Unsupported store. Use Amazon BR or Kabum URLs"],
      },
    };
  }

  try {
    const product = await prisma.product.create({
      data: {
        url: parsed.data.url,
        store,
        targetPrice: parsed.data.targetPrice,
        webhookUrl: parsed.data.webhookUrl,
      },
    });

    const checkResult = await checkProductById(product.id);
    const refreshed = await prisma.product.findUniqueOrThrow({
      where: { id: product.id },
    });

    revalidatePath("/");

    if (checkResult.status === "error") {
      return {
        ok: true,
        data: serializeProduct(refreshed),
        message: `Product created, but initial check failed: ${checkResult.error}`,
      };
    }

    return {
      ok: true,
      data: serializeProduct(refreshed),
      message: checkResult.alertSent
        ? "Product created and alert sent"
        : "Product created and checked",
    };
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return {
        ok: false,
        error: "This product URL is already registered",
        fieldErrors: { url: ["This product URL is already registered"] },
      };
    }

    console.error("Failed to create product", error);
    return { ok: false, error: "Failed to create product" };
  }
}

export async function toggleProductActive(
  productId: string,
): Promise<ActionResult<ProductView>> {
  const parsed = productIdSchema.safeParse({ productId });
  if (!parsed.success) {
    return { ok: false, error: "Invalid product id" };
  }

  const existing = await prisma.product.findUnique({
    where: { id: parsed.data.productId },
  });

  if (!existing) {
    return { ok: false, error: "Product not found" };
  }

  const updated = await prisma.product.update({
    where: { id: existing.id },
    data: { isActive: !existing.isActive },
  });

  revalidatePath("/");
  return { ok: true, data: serializeProduct(updated) };
}

export async function deleteProduct(
  productId: string,
): Promise<ActionResult> {
  const parsed = productIdSchema.safeParse({ productId });
  if (!parsed.success) {
    return { ok: false, error: "Invalid product id" };
  }

  try {
    await prisma.product.delete({ where: { id: parsed.data.productId } });
    revalidatePath("/");
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "Product not found" };
  }
}

export async function checkProductNow(
  productId: string,
): Promise<ActionResult<ProductView>> {
  const parsed = productIdSchema.safeParse({ productId });
  if (!parsed.success) {
    return { ok: false, error: "Invalid product id" };
  }

  const result = await checkProductById(parsed.data.productId);
  const product = await prisma.product.findUnique({
    where: { id: parsed.data.productId },
  });

  if (!product) {
    return { ok: false, error: "Product not found" };
  }

  revalidatePath("/");

  if (result.status === "error") {
    return {
      ok: false,
      error: result.error,
    };
  }

  return {
    ok: true,
    data: serializeProduct(product),
    message: result.alertSent
      ? "Checked successfully and Discord alert sent"
      : "Checked successfully",
  };
}

export async function getProductHistory(
  productId: string,
): Promise<ActionResult<PriceHistoryView[]>> {
  const parsed = productIdSchema.safeParse({ productId });
  if (!parsed.success) {
    return { ok: false, error: "Invalid product id" };
  }

  const history = await prisma.priceHistory.findMany({
    where: { productId: parsed.data.productId },
    orderBy: { scrapedAt: "desc" },
    take: 30,
  });

  return {
    ok: true,
    data: history.map(serializePriceHistory),
  };
}
