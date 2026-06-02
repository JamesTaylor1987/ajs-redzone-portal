"use client";

import { useFormState, useFormStatus } from "react-dom";
import { saveStockColoursAction, type SettingsState } from "./actions";
import { COLOUR_OPTIONS } from "@/lib/stock-colours";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-ajs-primary hover:bg-ajs-dark transition-colors disabled:opacity-50"
    >
      {pending ? "Saving…" : "Save changes"}
    </button>
  );
}

interface Props {
  current: { inStock: string; lowStock: string; outOfStock: string };
}

export function ColourPicker({ current }: Props) {
  const [state, action] = useFormState<SettingsState, FormData>(saveStockColoursAction, {});

  return (
    <div className="bg-white rounded-xl border border-ajs-light p-5 space-y-6">
      <h2 className="text-xs font-bold uppercase tracking-wide text-ajs-dark">Stock status badge colours</h2>

      {state.success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg px-4 py-2.5 font-semibold">
          Saved — catalogue updated.
        </div>
      )}
      {state.error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-4 py-2.5">
          {state.error}
        </div>
      )}

      <form action={action} className="space-y-5">
        <ColourRow name="stock_color_in_stock"     label="In Stock"     current={current.inStock} />
        <ColourRow name="stock_color_low_stock"    label="Low Stock"    current={current.lowStock} />
        <ColourRow name="stock_color_out_of_stock" label="Out of Stock" current={current.outOfStock} />
        <SaveButton />
      </form>
    </div>
  );
}

function ColourRow({ name, label, current }: { name: string; label: string; current: string }) {
  return (
    <div>
      <p className="text-sm font-semibold text-ajs-dark mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {COLOUR_OPTIONS.map((opt) => (
          <label key={opt.key} className="cursor-pointer">
            <input type="radio" name={name} value={opt.key} defaultChecked={current === opt.key} className="sr-only" />
            <span
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all select-none ${opt.classes} ${current === opt.key ? "border-ajs-dark ring-2 ring-ajs-dark/20" : "border-transparent"}`}
            >
              {label}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
