import { z } from "zod";
import { detectStore } from "@/lib/scrapers/registry";

const optionalTargetPriceSchema = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  return value;
}, z.union([
  z.null(),
  z.coerce
    .number()
    .positive("Target price must be greater than zero")
    .max(1_000_000, "Target price is too high"),
]));

export const createProductSchema = z.object({
  url: z
    .string()
    .trim()
    .url("Product URL must be a valid URL")
    .refine((value) => detectStore(value) !== null, {
      message: "Unsupported store. Use Amazon BR or Kabum URLs",
    }),
  targetPrice: optionalTargetPriceSchema,
  webhookUrl: z
    .string()
    .trim()
    .url("Webhook URL must be a valid URL")
    .regex(
      /^https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+$/i,
      "Webhook must match https://discord.com/api/webhooks/... (canary/ptb also allowed)",
    ),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

export const productIdSchema = z.object({
  productId: z.string().min(1, "Invalid product id"),
});
