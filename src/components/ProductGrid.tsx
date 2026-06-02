"use client";

import { useMemo, useState } from "react";
import type { Product, Currency, CartLine, StockColourSettings } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { getClasses } from "@/lib/stock-colours";

interface ProductGridProps {
  products: Product[];
  currency: Currency;
  lines: CartLine[];
  onQtyChange: (product: Product, qty: number) => void;
  stockColours: StockColourSettings;
}


export function ProductGrid({ products, currency, lines, onQtyChange, stockColours }: ProductGridProps) {
  const [plcFilter, setPlcFilter] = useState<string>("All");
  const [matFilter, setMatFilter] = useState<string>("All");

  const panels = useMemo(
    () => products.filter((p) => p.category === "panel"),
    [products]
  );
  const addons = useMemo(
    () => products.filter((p) => p.category !== "panel"),
    [products]
  );

  const filteredPanels = panels.filter(
    (p) =>
      (plcFilter === "All" || p.plc === plcFilter) &&
      (matFilter === "All" || p.material === matFilter)
  );

  const qtyFor = (productId: string) =>
    lines.find((l) => l.productId === productId)?.qty ?? 0;

  return (
    <div className="space-y-6">
      <Section title="Control Panels">
        <FilterBar
          plcFilter={plcFilter}
          setPlcFilter={setPlcFilter}
          matFilter={matFilter}
          setMatFilter={setMatFilter}
        />
        <Grid>
          {filteredPanels.map((p) => (
            <Card
              key={p.id}
              product={p}
              currency={currency}
              qty={qtyFor(p.id)}
              onQtyChange={(q) => onQtyChange(p, q)}
              stockColours={stockColours}
            />
          ))}
          {filteredPanels.length === 0 && (
            <div className="col-span-full text-ajs-muted text-sm py-8 text-center">
              No panels match those filters.
            </div>
          )}
        </Grid>
      </Section>

      <Section title="Sensors, Software & Accessories">
        <Grid>
          {addons.map((p) => (
            <Card
              key={p.id}
              product={p}
              currency={currency}
              qty={qtyFor(p.id)}
              onQtyChange={(q) => onQtyChange(p, q)}
              stockColours={stockColours}
            />
          ))}
        </Grid>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-xl border border-ajs-light overflow-hidden shadow-sm">
      <header className="brand-gradient px-4 py-3">
        <h2 className="text-white font-bold text-lg">{title}</h2>
      </header>
      <div className="p-4 space-y-4">{children}</div>
    </section>
  );
}

function FilterBar({
  plcFilter,
  setPlcFilter,
  matFilter,
  setMatFilter,
}: {
  plcFilter: string;
  setPlcFilter: (s: string) => void;
  matFilter: string;
  setMatFilter: (s: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      {["All", "Siemens", "Allen Bradley"].map((f) => (
        <Chip key={f} active={plcFilter === f} onClick={() => setPlcFilter(f)}>
          {f}
        </Chip>
      ))}
      <span className="w-px h-6 bg-ajs-light mx-1" aria-hidden />
      {["All", "Mild Steel", "Stainless Steel"].map((f) => (
        <Chip key={f} active={matFilter === f} onClick={() => setMatFilter(f)}>
          {f}
        </Chip>
      ))}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
        active
          ? "bg-ajs-primary text-white border-ajs-primary"
          : "bg-white text-ajs-muted border-ajs-light hover:border-ajs-primary/40"
      }`}
    >
      {children}
    </button>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {children}
    </div>
  );
}

function Card({
  product,
  currency,
  qty,
  onQtyChange,
  stockColours,
}: {
  product: Product;
  currency: Currency;
  qty: number;
  onQtyChange: (q: number) => void;
  stockColours: StockColourSettings;
}) {
  const active = qty > 0;
  const stockClass =
    product.stock_status === "In Stock"      ? getClasses(stockColours.inStock) :
    product.stock_status === "Limited Stock" ? getClasses(stockColours.lowStock) :
    product.stock_status === "On Order"      ? getClasses(stockColours.outOfStock) :
    "bg-slate-100 text-slate-500";

  return (
    <div
      className={`rounded-lg border-2 transition-all ${
        active ? "border-ajs-primary bg-ajs-primary/5 shadow" : "border-ajs-light bg-white"
      }`}
    >
      <div className="aspect-square bg-gradient-to-br from-slate-200 to-slate-100 flex items-center justify-center text-ajs-dark/30 text-xs font-mono p-3">
        {product.sku}
      </div>
      <div className="p-3 space-y-1.5">
        <div className="text-[10px] font-mono text-ajs-muted">{product.sku}</div>
        <div className="font-bold text-sm leading-tight text-ajs-text">
          {product.name}
        </div>
        <div className="flex items-center justify-between flex-wrap gap-1">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stockClass}`}>
            {product.stock_status} · {product.lead_time}
          </span>
        </div>
        <div className="text-base font-extrabold text-ajs-dark">
          {formatMoney(product.price_gbp_pence, currency)}
        </div>

        <div className="flex items-center border border-ajs-light rounded-md overflow-hidden mt-1">
          <button
            onClick={() => onQtyChange(Math.max(0, qty - 1))}
            className="w-8 h-8 text-ajs-dark hover:bg-ajs-light/60 disabled:opacity-40"
            disabled={qty === 0}
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="flex-1 text-center font-bold text-sm">{qty}</span>
          <button
            onClick={() => onQtyChange(qty + 1)}
            className="w-8 h-8 bg-ajs-primary text-white hover:bg-ajs-dark"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
