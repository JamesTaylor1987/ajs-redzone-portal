"use client";

import { useState, useTransition } from "react";
import { saveQuoteAction, resendAmendedQuoteAction } from "./editActions";

interface Product {
  id: string;
  sku: string;
  name: string;
  price_gbp_pence: number;
}

interface Row {
  _key: string;
  sku: string;
  name: string;
  qty: number;
  unit_price_pence: number;
  discount_pct: number;
}

function penceToStr(pence: number) {
  return (pence / 100).toFixed(2);
}

function strToPence(s: string) {
  return Math.round(parseFloat(s || "0") * 100);
}

function lineTotal(r: Row) {
  return Math.round(r.unit_price_pence * r.qty * (1 - r.discount_pct / 100));
}

export function EditQuoteItemsForm({
  quoteId,
  initialItems,
  products,
  currentShippingPence,
  currentShippingLabel,
  currentOverallDiscountPct,
}: {
  quoteId: string;
  initialItems: Array<{ sku: string; name: string; qty: number; unit_price_gbp_pence: number; discount_pct?: number }>;
  products: Product[];
  currentShippingPence: number | null;
  currentShippingLabel: string | null;
  currentOverallDiscountPct: number | null;
}) {
  const [rows, setRows] = useState<Row[]>(
    initialItems.map((i) => ({
      _key: crypto.randomUUID(),
      sku: i.sku,
      name: i.name,
      qty: i.qty,
      unit_price_pence: Number(i.unit_price_gbp_pence),
      discount_pct: Number(i.discount_pct ?? 0),
    })),
  );
  const [overallDiscountPct, setOverallDiscountPct] = useState(currentOverallDiscountPct ?? 0);
  const [shippingPence, setShippingPence] = useState<number | null>(currentShippingPence);
  const [shippingLabel, setShippingLabel] = useState(currentShippingLabel ?? "");
  const [showCatalogueSelect, setShowCatalogueSelect] = useState(false);

  const [dirty, setDirty] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savePending, startSave] = useTransition();
  const [resendPending, startResend] = useTransition();

  function markDirty() {
    setDirty(true);
    setSaveMsg(null);
  }

  function updateRow(key: string, field: keyof Omit<Row, "_key">, raw: string) {
    setRows((prev) =>
      prev.map((r) => {
        if (r._key !== key) return r;
        if (field === "qty") return { ...r, qty: Math.max(1, parseInt(raw) || 1) };
        if (field === "unit_price_pence") return { ...r, unit_price_pence: strToPence(raw) };
        if (field === "discount_pct") return { ...r, discount_pct: Math.min(100, Math.max(0, parseFloat(raw) || 0)) };
        return { ...r, [field]: raw };
      }),
    );
    markDirty();
  }

  function addCustomRow() {
    setRows((prev) => [...prev, { _key: crypto.randomUUID(), sku: "", name: "", qty: 1, unit_price_pence: 0, discount_pct: 0 }]);
    setShowCatalogueSelect(false);
    markDirty();
  }

  function addFromCatalogue(productId: string) {
    const p = products.find((p) => p.id === productId);
    if (!p) return;
    setRows((prev) => [...prev, { _key: crypto.randomUUID(), sku: p.sku, name: p.name, qty: 1, unit_price_pence: Number(p.price_gbp_pence), discount_pct: 0 }]);
    setShowCatalogueSelect(false);
    markDirty();
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r._key !== key));
    markDirty();
  }

  function handleSave() {
    setError(null);
    startSave(async () => {
      const result = await saveQuoteAction(
        quoteId,
        rows.map((r) => ({ sku: r.sku, name: r.name, qty: r.qty, unit_price_pence: r.unit_price_pence, discount_pct: r.discount_pct })),
        {
          overallDiscountPct: overallDiscountPct > 0 ? overallDiscountPct : null,
          shippingLabel: shippingLabel.trim() || null,
          shippingPence,
        },
      );
      if (result.error) {
        setError(result.error);
      } else {
        setDirty(false);
        setSaveMsg("Saved");
        setTimeout(() => setSaveMsg(null), 3000);
      }
    });
  }

  function handleResend() {
    setError(null);
    startResend(async () => {
      const result = await resendAmendedQuoteAction(quoteId);
      if (result.error) {
        setError(result.error);
      } else {
        setResendMsg("Email sent to customer");
        setTimeout(() => setResendMsg(null), 5000);
      }
    });
  }

  const subtotal = rows.reduce((s, r) => s + lineTotal(r), 0);
  const overallDiscount = Math.round(subtotal * (overallDiscountPct / 100));
  const discountedSubtotal = subtotal - overallDiscount;
  const effectiveShipping = shippingPence ?? 0;
  const grandTotal = discountedSubtotal + effectiveShipping;

  return (
    <div className="bg-white rounded-xl border border-ajs-light overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-ajs-light flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-xs font-bold uppercase tracking-wide text-ajs-dark">Items</h2>
        <div className="flex items-center gap-2 flex-wrap">
          {error && <span className="text-xs text-rose-600 font-medium">{error}</span>}
          {saveMsg && <span className="text-xs text-emerald-600 font-semibold">{saveMsg}</span>}
          {resendMsg && <span className="text-xs text-emerald-600 font-semibold">{resendMsg}</span>}
          <button
            type="button"
            onClick={handleResend}
            disabled={resendPending || dirty}
            title={dirty ? "Save changes before resending" : "Resend updated quote to customer"}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-ajs-light text-ajs-muted hover:text-ajs-dark hover:border-ajs-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {resendPending ? "Sending…" : "Resend email"}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={savePending || !dirty}
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-ajs-primary text-white hover:bg-ajs-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {savePending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      {/* Items table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-slate-50 border-b border-ajs-light text-ajs-dark">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide w-24">SKU</th>
              <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide">Product</th>
              <th className="px-3 py-2 text-center text-xs font-bold uppercase tracking-wide w-20">Qty</th>
              <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide w-28">Unit (£)</th>
              <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide w-28">Disc %</th>
              <th className="px-3 py-2 text-right text-xs font-bold uppercase tracking-wide w-28">Line total</th>
              <th className="px-3 py-2 w-7" />
            </tr>
          </thead>
          <tbody className="divide-y divide-ajs-light">
            {rows.map((row) => (
              <tr key={row._key}>
                <td className="px-3 py-1.5">
                  <input
                    value={row.sku}
                    onChange={(e) => updateRow(row._key, "sku", e.target.value)}
                    className="w-full border border-ajs-light rounded px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ajs-primary/40"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <input
                    value={row.name}
                    onChange={(e) => updateRow(row._key, "name", e.target.value)}
                    className="w-full border border-ajs-light rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ajs-primary/40"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <input
                    type="number" min={1} value={row.qty}
                    onChange={(e) => updateRow(row._key, "qty", e.target.value)}
                    className="w-full border border-ajs-light rounded px-2 py-1.5 text-sm text-center font-semibold focus:outline-none focus:ring-1 focus:ring-ajs-primary/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <div className="flex items-center border border-ajs-light rounded overflow-hidden focus-within:ring-1 focus-within:ring-ajs-primary/40">
                    <span className="px-1.5 text-xs text-ajs-muted bg-slate-50 border-r border-ajs-light select-none">£</span>
                    <input
                      type="number" min={0} step={0.01}
                      value={penceToStr(row.unit_price_pence)}
                      onChange={(e) => updateRow(row._key, "unit_price_pence", e.target.value)}
                      className="w-full px-2 py-1 text-xs focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </td>
                <td className="px-3 py-1.5">
                  <div className="flex items-center border border-ajs-light rounded overflow-hidden focus-within:ring-1 focus-within:ring-ajs-primary/40">
                    <input
                      type="number" min={0} max={100} step={1}
                      value={row.discount_pct || ""}
                      placeholder="0"
                      onChange={(e) => updateRow(row._key, "discount_pct", e.target.value)}
                      className="w-full px-2 py-1.5 text-sm font-semibold focus:outline-none text-emerald-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="px-2 text-sm text-ajs-muted bg-slate-50 border-l border-ajs-light select-none">%</span>
                  </div>
                </td>
                <td className="px-3 py-1.5 text-right font-semibold text-sm">
                  {row.discount_pct > 0 && (
                    <div className="text-xs text-ajs-muted line-through">
                      £{(row.unit_price_pence * row.qty / 100).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                    </div>
                  )}
                  £{(lineTotal(row) / 100).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                </td>
                <td className="px-2 py-1.5 text-center">
                  <button type="button" onClick={() => removeRow(row._key)}
                    className="text-ajs-muted hover:text-rose-600 transition-colors text-base leading-none" title="Remove">
                    &times;
                  </button>
                </td>
              </tr>
            ))}
          </tbody>

          {/* Footer: add buttons + totals */}
          <tfoot className="border-t-2 border-ajs-light bg-slate-50">
            {/* Add line buttons */}
            <tr>
              <td colSpan={7} className="px-3 py-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <button type="button" onClick={addCustomRow}
                    className="text-xs font-semibold text-ajs-primary hover:text-ajs-dark transition-colors">
                    + Add custom line
                  </button>
                  <button type="button" onClick={() => setShowCatalogueSelect((v) => !v)}
                    className="text-xs font-semibold text-ajs-primary hover:text-ajs-dark transition-colors">
                    + Add from catalogue
                  </button>
                  {showCatalogueSelect && (
                    <select
                      defaultValue=""
                      onChange={(e) => { if (e.target.value) addFromCatalogue(e.target.value); }}
                      className="border border-ajs-light rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ajs-primary/40 bg-white"
                    >
                      <option value="" disabled>Select product…</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </td>
            </tr>

            {/* Subtotal */}
            <tr className="border-t border-ajs-light">
              <td colSpan={5} className="px-3 py-2 text-right text-xs text-ajs-muted">Subtotal (ex-VAT)</td>
              <td className="px-3 py-2 text-right font-semibold">
                £{(subtotal / 100).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
              </td>
              <td />
            </tr>

            {/* Overall discount */}
            <tr>
              <td colSpan={4} className="px-3 py-2 text-right text-xs text-ajs-muted">Overall discount</td>
              <td className="px-3 py-2">
                <div className="flex items-center border border-ajs-light rounded overflow-hidden focus-within:ring-1 focus-within:ring-ajs-primary/40">
                  <input
                    type="number" min={0} max={100} step={0.5}
                    value={overallDiscountPct || ""}
                    placeholder="0"
                    onChange={(e) => { setOverallDiscountPct(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0))); markDirty(); }}
                    className="w-full px-2 py-1 text-xs focus:outline-none text-emerald-700"
                  />
                  <span className="px-1.5 text-xs text-ajs-muted bg-slate-50 border-l border-ajs-light select-none">%</span>
                </div>
              </td>
              <td className="px-3 py-2 text-right text-emerald-700 font-semibold text-xs">
                {overallDiscountPct > 0 ? `−£${(overallDiscount / 100).toLocaleString("en-GB", { minimumFractionDigits: 2 })}` : "—"}
              </td>
              <td />
            </tr>

            {/* Shipping */}
            <tr>
              <td colSpan={2} className="px-3 py-2 text-right text-xs text-ajs-muted">Shipping label</td>
              <td colSpan={2} className="px-3 py-2">
                <input
                  type="text"
                  value={shippingLabel}
                  placeholder="e.g. Shipping, Delivery to site…"
                  onChange={(e) => { setShippingLabel(e.target.value); markDirty(); }}
                  className="w-full border border-ajs-light rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ajs-primary/40"
                />
              </td>
              <td className="px-3 py-2 text-right text-xs text-ajs-muted">Shipping cost</td>
              <td className="px-3 py-2">
                <div className="flex items-center border border-ajs-light rounded overflow-hidden focus-within:ring-1 focus-within:ring-ajs-primary/40">
                  <span className="px-1.5 text-xs text-ajs-muted bg-slate-50 border-r border-ajs-light select-none">£</span>
                  <input
                    type="number" min={0} step={0.01}
                    value={shippingPence !== null ? penceToStr(shippingPence) : ""}
                    placeholder="EXW"
                    onChange={(e) => { setShippingPence(e.target.value ? strToPence(e.target.value) : null); markDirty(); }}
                    className="w-full px-2 py-1 text-xs focus:outline-none"
                  />
                </div>
              </td>
              <td />
            </tr>

            {/* Grand total */}
            <tr className="border-t-2 border-ajs-light">
              <td colSpan={5} className="px-3 py-2.5 text-right font-bold text-sm">Total (ex-VAT)</td>
              <td className="px-3 py-2.5 text-right font-extrabold text-ajs-primary text-base">
                £{(grandTotal / 100).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {dirty && (
        <div className="px-5 py-2 bg-amber-50 border-t border-amber-200 text-xs text-amber-700 font-medium">
          Unsaved changes — save before resending.
        </div>
      )}
    </div>
  );
}
