"use client";

import { useActionState, useMemo, useState } from "react";
import {
  createProduct,
  type ActionResult,
} from "@/app/actions/products";
import { detectStoreFromUrl } from "@/lib/products/detect-store-client";
import type { ProductView } from "@/lib/products/serialize";

const initialState: ActionResult<ProductView> | null = null;

export function ProductForm() {
  const [state, formAction, pending] = useActionState(createProduct, initialState);
  const [url, setUrl] = useState("");

  const detectedStore = useMemo(() => detectStoreFromUrl(url), [url]);

  return (
    <section className="rounded-2xl border border-border bg-surface/80 p-5 shadow-xl shadow-black/20 backdrop-blur">
      <div className="mb-5">
        <h2 className="text-lg font-semibold tracking-tight">Add product</h2>
        <p className="mt-1 text-sm text-muted">
          Paste an Amazon BR or Kabum URL, optionally set a target price, and add your
          Discord webhook. Leave target blank to alert on any price drop.
        </p>
      </div>

      <form action={formAction} className="grid gap-4">
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-zinc-200">Product URL</span>
          <input
            name="url"
            type="url"
            required
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://www.kabum.com.br/produto/..."
            className="rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none ring-accent/40 transition focus:ring-2"
          />
          <span className="text-xs text-muted">
            Detected store:{" "}
            <span className="font-medium text-accent">
              {detectedStore ?? "unsupported / empty"}
            </span>
          </span>
          {state?.ok === false && state.fieldErrors?.url ? (
            <span className="text-xs text-danger">{state.fieldErrors.url[0]}</span>
          ) : null}
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-zinc-200">
              Target price (R$) <span className="font-normal text-muted">optional</span>
            </span>
            <input
              name="targetPrice"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Leave blank to watch any drop"
              className="rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none ring-accent/40 transition focus:ring-2"
            />
            {state?.ok === false && state.fieldErrors?.targetPrice ? (
              <span className="text-xs text-danger">
                {state.fieldErrors.targetPrice[0]}
              </span>
            ) : null}
          </label>

          <label className="grid gap-1.5 sm:col-span-2">
            <span className="text-sm font-medium text-zinc-200">Discord webhook URL</span>
            <input
              name="webhookUrl"
              type="url"
              required
              placeholder="https://discord.com/api/webhooks/..."
              className="rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none ring-accent/40 transition focus:ring-2"
            />
            {state?.ok === false && state.fieldErrors?.webhookUrl ? (
              <span className="text-xs text-danger">
                {state.fieldErrors.webhookUrl[0]}
              </span>
            ) : null}
          </label>
        </div>

        {state?.ok === false ? (
          <p className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {state.error}
          </p>
        ) : null}

        {state?.ok === true ? (
          <p className="rounded-xl border border-ok/30 bg-ok/10 px-3 py-2 text-sm text-ok">
            {state.message ?? "Product created"}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Saving..." : "Save product"}
        </button>
      </form>
    </section>
  );
}
