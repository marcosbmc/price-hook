"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  checkProductNow,
  deleteProduct,
  toggleProductActive,
} from "@/app/actions/products";
import { PriceHistoryPanel } from "@/components/price-history";
import {
  formatBrl,
  formatDateTime,
  getProductStatus,
  type ProductView,
} from "@/lib/products/serialize";

type ProductCardProps = {
  product: ProductView;
};

const toneClasses = {
  ok: "border-ok/30 bg-ok/10 text-ok",
  warning: "border-warning/30 bg-warning/10 text-warning",
  error: "border-danger/30 bg-danger/10 text-danger",
  paused: "border-border bg-surface-2 text-muted",
} as const;

export function ProductCard({ product }: ProductCardProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const status = getProductStatus(product);

  const belowTarget =
    product.targetPrice !== null &&
    product.lastPrice !== null &&
    product.lastPrice <= product.targetPrice;

  function runAction(action: () => Promise<{ ok: boolean; error?: string; message?: string }>) {
    setFeedback(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setFeedback(result.error ?? "Action failed");
      } else if (result.message) {
        setFeedback(result.message);
      }
      router.refresh();
    });
  }

  return (
    <article className="rounded-2xl border border-border bg-surface/80 p-5 shadow-lg shadow-black/20 backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${toneClasses[status.tone]}`}
            >
              {status.label}
            </span>
            <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted">
              {product.store}
            </span>
            {!product.isActive ? (
              <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted">
                Inactive
              </span>
            ) : null}
          </div>

          <h3 className="truncate text-base font-semibold text-zinc-50">
            {product.title ?? "Untitled product"}
          </h3>
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 block truncate text-sm text-accent hover:underline"
          >
            {product.url}
          </a>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-surface-2"
        >
          {expanded ? "Hide history" : "Show history"}
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-surface-2/70 px-3 py-2">
          <p className="text-xs text-muted">Current price</p>
          <p className={`text-sm font-semibold ${belowTarget ? "text-ok" : "text-zinc-100"}`}>
            {product.lastPrice === null ? "—" : formatBrl(product.lastPrice)}
          </p>
        </div>
        <div className="rounded-xl bg-surface-2/70 px-3 py-2">
          <p className="text-xs text-muted">Target</p>
          <p className="text-sm font-semibold text-zinc-100">
            {product.targetPrice === null
              ? "Any drop"
              : formatBrl(product.targetPrice)}
          </p>
        </div>
        <div className="rounded-xl bg-surface-2/70 px-3 py-2">
          <p className="text-xs text-muted">Last checked</p>
          <p className="text-sm font-semibold text-zinc-100">
            {formatDateTime(product.lastCheckedAt)}
          </p>
        </div>
      </div>

      {product.lastError ? (
        <p
          className={`mt-3 rounded-xl border px-3 py-2 text-sm ${
            status.tone === "error"
              ? "border-danger/30 bg-danger/10 text-danger"
              : "border-warning/30 bg-warning/10 text-warning"
          }`}
        >
          {product.lastError}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => runAction(() => checkProductNow(product.id))}
          className="rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-zinc-950 transition hover:brightness-110 disabled:opacity-60"
        >
          {pending ? "Working..." : "Check now"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => runAction(() => toggleProductActive(product.id))}
          className="rounded-xl border border-border px-3 py-2 text-sm font-medium text-zinc-200 transition hover:bg-surface-2 disabled:opacity-60"
        >
          {product.isActive ? "Pause" : "Activate"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!window.confirm("Delete this product and its history?")) {
              return;
            }
            runAction(() => deleteProduct(product.id));
          }}
          className="rounded-xl border border-danger/40 px-3 py-2 text-sm font-medium text-danger transition hover:bg-danger/10 disabled:opacity-60"
        >
          Delete
        </button>
      </div>

      {feedback ? (
        <p className="mt-3 text-sm text-muted">{feedback}</p>
      ) : null}

      <PriceHistoryPanel productId={product.id} open={expanded} />
    </article>
  );
}
