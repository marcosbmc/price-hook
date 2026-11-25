import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { env } from "@/lib/env";

const authorizationHeaderSchema = z
  .string()
  .min(1, "Authorization header is required")
  .regex(/^Bearer\s+\S+/i, "Authorization must use Bearer scheme")
  .transform((value) => value.replace(/^Bearer\s+/i, "").trim());

function secretsEqual(provided: string, expected: string): boolean {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, expectedBuffer);
}

export function assertCronAuthorized(authorizationHeader: string | null): void {
  const parsed = authorizationHeaderSchema.safeParse(authorizationHeader);

  if (!parsed.success) {
    throw new CronAuthError("Unauthorized");
  }

  if (!secretsEqual(parsed.data, env.CRON_SECRET)) {
    throw new CronAuthError("Unauthorized");
  }
}

export class CronAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CronAuthError";
  }
}
