"use client";

import type { CartLine, Currency } from "@/lib/types";
import { formatMoney } from "@/lib/format";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  lines: CartLine[];
  currency: Currency;
  onContinue: () => void;
  onClear: () => void;
}

export function CartDrawer({
  open,
  onClose,
  lines,
  currency,
  onContinue,
  onClear,
}: CartDrawerProps) {
  const subtotal = lines.reduce((s, l) => s + l.qty * l.unitPricePence, 0);
  const itemCount = lines.reduce((s, l) => s + l.qty, 0);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
          aria-hidden
        />
      )}
      <aside
        className={`fixed top-0 right-0 bottom-0 w-full max-w-sm bg-white z-50 shadow-2xl transform transition-transform ${
          open ? "translate-x-0" : "translate-x-full"
        } flex flex-col`}
        aria-hidden={!open}
      >
        <header className="brand-gradient text-white p-4 flex items-center justify-between">
          <h2 className="font-bold">Basket ({itemCount})</h2>
          <button onClick={onClose} aria-label="Close basket" className="text-white/80 hover:text-white text-xl">
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          {lines.length === 0 ? (
            <div className="text-center text-ajs-muted text-sm py-12">
              Your basket is empty.
            </div>
          ) : (
            <ul className="divide-y divide-ajs-light">
              {lines.map((line) => (
                <li key={line.productId} className="py-3 flex justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-mono font-bold text-ajs-dark">{line.sku}</div>
                    <div className="text-sm font-semibold text-ajs-text leading-tight">
                      {line.name}
                    </div>
                    <div className="text-xs text-ajs-muted">
                      ×{line.qty} @ {formatMoney(line.unitPricePence, currency)}
                    </div>
                  </div>
                  <div className="font-bold text-sm text-ajs-dark whitespace-nowrap">
                    {formatMoney(line.qty * line.unitPricePence, currency)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="border-t border-ajs-light p-4 space-y-3">
          <div className="flex justify-between font-bold text-lg">
            <span>Subtotal</span>
            <span>{formatMoney(subtotal, currency)}</span>
          </div>
          <p className="text-xs text-ajs-muted leading-snug">
            All prices ex-VAT. VAT applied on invoice based on your country and VAT
            registration. Hardware invoiced 100% prior to shipment.
          </p>
          <button
            onClick={onContinue}
            disabled={lines.length === 0}
            className="w-full py-3 rounded-lg font-bold text-white bg-ajs-primary hover:bg-ajs-dark disabled:bg-ajs-muted disabled:opacity-50 transition-colors"
          >
            Continue to checkout →
          </button>
          {lines.length > 0 && (
            <button
              onClick={onClear}
              className="w-full py-2 text-xs text-ajs-muted hover:text-ajs-danger"
            >
              Clear basket
            </button>
          )}
        </footer>
      </aside>
    </>
  );
}
