import type { Store } from "@/generated/prisma/enums";

export type ScrapeResult = {
  title: string;
  price: number;
  available: boolean;
  store: Store;
  url: string;
};

export type ScraperErrorCode =
  | "BLOCKED"
  | "TIMEOUT"
  | "PARSE"
  | "NETWORK"
  | "UNSUPPORTED";

export class ScraperError extends Error {
  readonly code: ScraperErrorCode;
  readonly statusCode: number | undefined;
  readonly store: Store | undefined;
  readonly url: string | undefined;

  constructor(
    code: ScraperErrorCode,
    message: string,
    options?: {
      statusCode?: number;
      store?: Store;
      url?: string;
      cause?: unknown;
    },
  ) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "ScraperError";
    this.code = code;
    this.statusCode = options?.statusCode;
    this.store = options?.store;
    this.url = options?.url;
  }
}

export interface ScraperStrategy {
  readonly store: Store;
  matches(url: string): boolean;
  scrape(url: string): Promise<ScrapeResult>;
}
