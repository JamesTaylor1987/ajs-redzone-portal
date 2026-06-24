"use client";

import { useState, useTransition } from "react";
import { saveQuoteItemsAction, resendAmendedQuoteAction, type EditItem } from "./editActions";

interface Row extends EditItem {
  _key: string;
}

function penceToStr(pence: number) {
  return (pence / 100).toFixed(2);
}

function strToPence(s: string) {
  return Math.round(parseFloat(s || "0") * 100);
}

export function EditQuoteItemsForm({
  quoteId,
  initialItems,
}: {
  quoteId: string;
  initialItems: Array<{ sku: string; name: string; qty: number; unit_price_gbp_pence: number }>;
}) {
  const [rows, setRows] = useState<Row[]>(
    initialItems.map((i) => ({
      _key: crypto.randomUUID(),
      sku: i.sku,
      name: i.name,
      qty: i.qty,
      unit_price_pence: Number(i.unit_price_gbp_pence),
    })),
  );
  const [dirty, setDirty] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savePending, startSave] = useTransition();
  const [resendPending, startResend] = useTransition();

  function update(key: string, field: keyof EditItem, raw: string) {
    setRows((prev) =>
      prev.map((r) => {
        if (r._key !== key) return r;
        if (field === "qty") return { ...r, qty: Math.max(1, parseInt(raw) || 1) };
        if (field === "unit_price_pence") return { ...r, unit_price_pence: strToPence(raw) };
        return { ...r, [field]: raw };
      }),
    );
    setDirty(true);
    setSaveMsg(null);
  }

  function addRow() {
    setRows((prev) => [
      ...prev,
      { _key: crypto.randomUUID(), sku: "", name: "", qty: 1, unit_price_pence: 0 },
    ]);
    setDirty(true);
    setSaveMsg(null);
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r._key !== key));
    setDirty(true);
    setSaveMsg(null);
  }

  function handleSave() {
    setError(null);
    startSave(async () => {
      const result = await saveQuoteItemsAction(quoteId, rows);
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
        setResendMsg("Email sent");
        setTimeout(() => setResendMsg(null), 4000);
      }
    });
  }

  const subtotal = rows.reduce((s, r) => s + r.unit_price_pence * r.qty, 0);

  return (
    <div className="bg-white rounded-xl border border-ajs-light overflow-hidden">
      <div className="px-5 py-3 border-b border-ajs-light flex items-center justify-between gap-3">
        <h2 className="text-xs font-bold uppercase tracking-wide text-ajs-dark">Items</h2>
        <div className="flex items-center gap-2">
          {error && <span className="text-xs text-rose-600 font-medium">{error}</span>}
          {saveMsg && <span className="text-xs text-emerald-600 font-semibold">{saveMsg}</span>}
          {resendMsg && <span className="text-xs text-emerald-600 font-semibold">{resendMsg}</span>}
          <button
            type="button"
            onClick={handleResend}
            disabled={resendPending || dirty}
            title={dirty ? "Save changes before resending" : "Resend updated quote email to customer"}
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

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead className="bg-slate-50 border-b border-ajs-light text-ajs-dark">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide w-28">SKU</th>
              <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide">Product</th>
              <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide w-16">Qty</th>
              <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide w-28">Unit (£)</th>
              <th className="px-3 py-2 text-right text-xs font-bold uppercase tracking-wide w-28">Line total</th>
              <th className="px-3 py-2 w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-ajs-light">
            {rows.map((row) => (
              <tr key={row._key}>
                <td className="px-3 py-1.5">
                  <input
                    value={row.sku}
                    onChange={(e) => update(row._key, "sku", e.target.value)}
                    className="w-full border border-ajs-light rounded px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ajs-primary/40"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <input
                    value={row.name}
                    onChange={(e) => update(row._key, "name", e.target.value)}
                    className="w-full border border-ajs-light rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ajs-primary/40"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <input
                    type="number"
                    min={1}
                    value={row.qty}
                    onChange={(e) => update(row._key, "qty", e.target.value)}
                    className="w-full border border-ajs-light rounded px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-ajs-primary/40"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <div className="flex items-center border border-ajs-light rounded overflow-hidden focus-within:ring-1 focus-within:ring-ajs-primary/40">
                    <span className="px-1.5 text-xs text-ajs-muted bg-slate-50 border-r border-ajs-light">£</span>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={penceToStr(row.unit_price_pence)}
                      onChange={(e) => update(row._key, "unit_price_pence", e.target.value)}
                      className="w-full px-2 py-1 text-xs focus:outline-none"
                    />
                  </div>
                </td>
                <td className="px-3 py-1.5 text-right font-semibold text-sm">
                  £{((row.unit_price_pence * row.qty) / 100).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                </td>
                <td className="px-2 py-1.5 text-center">
                  <button
                    type="button"
                    onClick={() => removeRow(row._key)}
                    className="text-ajs-muted hover:text-rose-600 transition-colors text-base leading-none"
                    title="Remove line"
                  >
                    &times;
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-ajs-light bg-slate-50">
            <tr>
              <td colSpan={6} className="px-3 py-2">
                <button
                  type="button"
                  onClick={addRow}
                  className="text-xs font-semibold text-ajs-primary hover:text-ajs-dark transition-colors"
                >
                  + Add line item
                </button>
              </td>
            </tr>
            <tr className="border-t border-ajs-light">
              <td colSpan={4} className="px-3 py-2 text-right text-ajs-muted text-xs">
                Subtotal (ex-VAT)
              </td>
              <td className="px-3 py-2 text-right font-extrabold text-ajs-primary">
                £{(subtotal / 100).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
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
