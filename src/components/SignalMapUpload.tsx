"use client";

import { useRef, useState } from "react";
import type { CartLine, Product } from "@/lib/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ParsedItem {
  productId: string;
  sku: string;
  name: string;
  qty: number;
  unitPricePence: number;
}

interface ParseResult {
  customerName: string;
  siteName: string;
  items: ParsedItem[];
  unmatchedSensors: string[];
  notInCatalogue: string[];
}

interface VfQty {
  productId: string;
  sku: string;
  name: string;
  unitPricePence: number;
  qty: number;
}

interface Props {
  vfProducts: Product[];
  onAddToBasket: (items: CartLine[]) => void;
}

// ---------------------------------------------------------------------------
// States
// ---------------------------------------------------------------------------

type UploadState = "idle" | "loading" | "parsed" | "done";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SignalMapUpload({ vfProducts, onAddToBasket }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [dragOver, setDragOver] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [includeVf, setIncludeVf] = useState(false);
  const [vfQtys, setVfQtys] = useState<VfQty[]>([]);

  // Initialise vfQtys when vfProducts first available
  const initialVfQtys = vfProducts.map((p) => ({
    productId: p.id,
    sku: p.sku,
    name: p.name,
    unitPricePence: p.price_gbp_pence,
    qty: 0,
  }));

  const currentVfQtys = vfQtys.length > 0 ? vfQtys : initialVfQtys;

  // ---------------------------------------------------------------------------
  // File processing
  // ---------------------------------------------------------------------------

  async function processFile(file: File) {
    if (!file.name.match(/\.(xlsx|xlsm)$/i)) {
      setParseError("Please select an .xlsx or .xlsm file.");
      setState("idle");
      return;
    }
    setState("loading");
    setParseError(null);

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/parse-signal-map", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok || data.error) {
        setParseError(data.error ?? "An unexpected error occurred.");
        setState("idle");
        return;
      }

      setParseResult(data as ParseResult);
      setIncludeVf(false);
      setVfQtys(initialVfQtys);
      setState("parsed");
    } catch (err) {
      setParseError(
        `Upload failed: ${err instanceof Error ? err.message : String(err)}`
      );
      setState("idle");
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // reset input so the same file can be re-selected
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  // ---------------------------------------------------------------------------
  // Add to basket
  // ---------------------------------------------------------------------------

  function handleAddToBasket() {
    if (!parseResult) return;
    const combined: CartLine[] = [...parseResult.items];
    if (includeVf) {
      for (const v of currentVfQtys) {
        if (v.qty > 0) {
          combined.push({
            productId: v.productId,
            sku: v.sku,
            name: v.name,
            qty: v.qty,
            unitPricePence: v.unitPricePence,
          });
        }
      }
    }
    if (combined.length === 0) return;
    onAddToBasket(combined);
    setState("done");
    // Auto-reset after a moment
    setTimeout(() => {
      setState("idle");
      setParseResult(null);
    }, 1800);
  }

  function reset() {
    setState("idle");
    setParseResult(null);
    setParseError(null);
  }

  function setVfQty(productId: string, qty: number) {
    setVfQtys((current) =>
      current.map((v) => (v.productId === productId ? { ...v, qty: Math.max(0, qty) } : v))
    );
  }

  const hasItems =
    (parseResult?.items.length ?? 0) > 0 ||
    (includeVf && currentVfQtys.some((v) => v.qty > 0));

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (state === "done") {
    return (
      <div className="mb-4 px-4 py-3 rounded-lg border border-ajs-primary/30 bg-ajs-primary/5 text-ajs-primary text-sm font-semibold text-center">
        Added to basket
      </div>
    );
  }

  if (state === "parsed" && parseResult) {
    return (
      <div className="mb-4 rounded-xl border border-ajs-light bg-white shadow-sm overflow-hidden">
        <header className="px-4 py-3 bg-ajs-primary/10 border-b border-ajs-light flex items-center justify-between gap-2">
          <div>
            <span className="font-bold text-ajs-dark text-sm">Signal map parsed</span>
            {(parseResult.customerName || parseResult.siteName) && (
              <p className="text-xs text-ajs-muted mt-0.5">
                {[parseResult.customerName, parseResult.siteName].filter(Boolean).join(" — ")}
              </p>
            )}
          </div>
          <button
            onClick={reset}
            className="text-xs text-ajs-muted hover:text-ajs-dark underline underline-offset-2 shrink-0"
          >
            Start again
          </button>
        </header>

        <div className="p-4 space-y-4">
          {/* Matched items */}
          {parseResult.items.length > 0 ? (
            <div>
              <p className="text-xs font-semibold text-ajs-muted uppercase tracking-wide mb-2">
                Items to add
              </p>
              <ul className="space-y-1">
                {parseResult.items.map((item) => (
                  <li key={item.sku} className="flex items-center gap-2 text-sm">
                    <span className="w-6 h-6 flex items-center justify-center rounded bg-ajs-primary text-white text-xs font-bold shrink-0">
                      {item.qty}
                    </span>
                    <span className="text-ajs-text font-medium">{item.name}</span>
                    <span className="text-ajs-muted font-mono text-xs ml-auto">{item.sku}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-ajs-muted">No catalogue items were matched from this file.</p>
          )}

          {/* Unmatched sensors */}
          {parseResult.unmatchedSensors.length > 0 && (
            <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2">
              <p className="text-xs font-semibold text-amber-700 mb-1">Could not auto-match</p>
              <p className="text-xs text-amber-700">
                {parseResult.unmatchedSensors.join(", ")}
              </p>
            </div>
          )}

          {/* Not in catalogue */}
          {parseResult.notInCatalogue.length > 0 && (
            <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2">
              <p className="text-xs font-semibold text-amber-700 mb-1">Not found in catalogue</p>
              <p className="text-xs font-mono text-amber-700">
                {parseResult.notInCatalogue.join(", ")}
              </p>
            </div>
          )}

          {/* Visual Factory toggle */}
          {vfProducts.length > 0 && (
            <div className="border-t border-ajs-light pt-3">
              <div className="flex items-center gap-3 mb-3">
                <p className="text-sm font-semibold text-ajs-text">
                  Include Visual Factory hardware?
                </p>
                <div className="flex rounded-md border border-ajs-light overflow-hidden text-xs font-semibold">
                  <button
                    onClick={() => setIncludeVf(false)}
                    className={`px-3 py-1 transition-colors ${
                      !includeVf
                        ? "bg-ajs-primary text-white"
                        : "bg-white text-ajs-muted hover:bg-ajs-light/60"
                    }`}
                  >
                    No
                  </button>
                  <button
                    onClick={() => setIncludeVf(true)}
                    className={`px-3 py-1 transition-colors ${
                      includeVf
                        ? "bg-ajs-primary text-white"
                        : "bg-white text-ajs-muted hover:bg-ajs-light/60"
                    }`}
                  >
                    Yes
                  </button>
                </div>
              </div>

              {includeVf && (
                <ul className="space-y-2">
                  {currentVfQtys.map((v) => (
                    <li key={v.productId} className="flex items-center gap-3">
                      <span className="flex-1 text-sm text-ajs-text">{v.name}</span>
                      <div className="flex items-center border border-ajs-light rounded-md overflow-hidden">
                        <button
                          onClick={() => setVfQty(v.productId, v.qty - 1)}
                          disabled={v.qty === 0}
                          className="w-7 h-7 text-ajs-dark hover:bg-ajs-light/60 disabled:opacity-40 text-sm"
                          aria-label={`Decrease ${v.name} qty`}
                        >
                          −
                        </button>
                        <span className="w-7 text-center font-bold text-sm">{v.qty}</span>
                        <button
                          onClick={() => setVfQty(v.productId, v.qty + 1)}
                          className="w-7 h-7 bg-ajs-primary text-white hover:bg-ajs-dark text-sm"
                          aria-label={`Increase ${v.name} qty`}
                        >
                          +
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Add to basket */}
          <button
            onClick={handleAddToBasket}
            disabled={!hasItems}
            className="w-full py-2.5 rounded-lg bg-ajs-primary text-white font-bold text-sm hover:bg-ajs-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add to basket
          </button>
        </div>
      </div>
    );
  }

  // idle / loading
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`mb-4 rounded-xl border transition-colors ${
        dragOver
          ? "border-ajs-primary bg-ajs-primary/10"
          : "border-ajs-light bg-ajs-light/40"
      }`}
    >
      <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
        <p className="flex-1 text-sm text-ajs-muted">
          Have a Redzone signal map? Upload it to auto-fill your basket.
        </p>

        <div className="flex items-center gap-3 shrink-0">
          {state === "loading" ? (
            <span className="text-xs text-ajs-muted flex items-center gap-1.5">
              <svg
                className="animate-spin h-4 w-4 text-ajs-primary"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Reading signal map...
            </span>
          ) : (
            <button
              onClick={() => inputRef.current?.click()}
              className="px-4 py-2 rounded-lg bg-ajs-primary text-white text-sm font-semibold hover:bg-ajs-dark transition-colors"
            >
              Upload file
            </button>
          )}
        </div>
      </div>

      {parseError && (
        <p className="px-4 pb-3 text-xs text-red-600">{parseError}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xlsm"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
