"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { getProductHistory } from "@/app/actions/products";
import {
  formatBrl,
  formatDateTime,
  type PriceHistoryView,
} from "@/lib/products/serialize";

type PriceHistoryProps = {
  productId: string;
  open: boolean;
};

export function PriceHistoryPanel({ productId, open }: PriceHistoryProps) {
  const [history, setHistory] = useState<PriceHistoryView[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      return;
    }

    startTransition(async () => {
      const result = await getProductHistory(productId);
      if (!result.ok) {
        setError(result.error);
        setHistory(null);
        return;
      }

      setError(null);
      setHistory(result.data);
    });
  }, [open, productId]);

  const chartPoints = useMemo(() => {
    if (!history || history.length === 0) {
      return [];
    }

    const chronological = [...history].reverse();
    const prices = chronological.map((entry) => entry.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const span = max - min || 1;

    return chronological.map((entry, index) => {
      const x = (index / Math.max(chronological.length - 1, 1)) * 100;
      const y = 100 - ((entry.price - min) / span) * 100;
      return { x, y, price: entry.price };
    });
  }, [history]);

  if (!open) {
    return null;
  }

  return (
    <div className="mt-4 border-t border-border pt-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-zinc-100">Recent price history</h4>
        {pending ? <span className="text-xs text-muted">Loading...</span> : null}
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {!pending && history && history.length === 0 ? (
        <p className="text-sm text-muted">No history yet. Run a check first.</p>
      ) : null}

      {chartPoints.length > 1 ? (
        <svg
          viewBox="0 0 100 40"
          className="mb-4 h-24 w-full overflow-visible rounded-xl bg-surface-2/60 p-2"
          role="img"
          aria-label="Price trend chart"
        >
          <polyline
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1.5"
            points={chartPoints.map((point) => `${point.x},${point.y * 0.35}`).join(" ")}
          />
          {chartPoints.map((point) => (
            <circle
              key={`${point.x}-${point.price}`}
              cx={point.x}
              cy={point.y * 0.35}
              r="1.2"
              fill="var(--accent)"
            />
          ))}
        </svg>
      ) : null}

      {history && history.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface-2 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">When</th>
                <th className="px-3 py-2 font-medium">Price</th>
                <th className="px-3 py-2 font-medium">Availability</th>
              </tr>
            </thead>
            <tbody>
              {history.map((entry) => (
                <tr key={entry.id} className="border-t border-border/70">
                  <td className="px-3 py-2 text-zinc-300">
                    {formatDateTime(entry.scrapedAt)}
                  </td>
                  <td className="px-3 py-2 font-medium text-zinc-100">
                    {formatBrl(entry.price)}
                  </td>
                  <td className="px-3 py-2 text-zinc-300">
                    {entry.available ? "In stock" : "Unavailable"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
