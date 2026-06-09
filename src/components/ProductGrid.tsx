"use client";

import { useMemo, useState, useCallback } from "react";
import Image from "next/image";
import type { Product, Currency, CartLine, StockColourSettings } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { getClasses } from "@/lib/stock-colours";
import { Lightbox } from "./Lightbox";
import { useT } from "./LocaleProvider";

interface ProductGridProps {
  products: Product[];
  productImages: Record<string, string[]>;
  currency: Currency;
  lines: CartLine[];
  onQtyChange: (product: Product, qty: number) => void;
  stockColours: StockColourSettings;
}


export function ProductGrid({ products, productImages, currency, lines, onQtyChange, stockColours }: ProductGridProps) {
  const t = useT();
  const [plcFilter, setPlcFilter] = useState<string>("All");
  const [matFilter, setMatFilter] = useState<string>("All");

  const stockLabels = {
    "In Stock": t("stockInStock"),
    "Limited Stock": t("stockLimitedStock"),
    "On Order": t("stockOnOrder"),
  };

  const panels = useMemo(
    () => products.filter((p) => p.category === "panel"),
    [products]
  );
  const addons = useMemo(
    () => products.filter((p) => p.category !== "panel" && p.category !== "visual_factory"),
    [products]
  );
  const visualFactory = useMemo(
    () => products.filter((p) => p.category === "visual_factory"),
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
      <Section title={t("sectionControlPanels")}>
        <FilterBar
          plcFilter={plcFilter}
          setPlcFilter={setPlcFilter}
          matFilter={matFilter}
          setMatFilter={setMatFilter}
          filterAll={t("filterAll")}
          filterMildSteel={t("filterMildSteel")}
          filterStainlessSteel={t("filterStainlessSteel")}
        />
        <Grid>
          {filteredPanels.map((p) => (
            <Card
              key={p.id}
              product={p}
              images={productImages[p.id] ?? (p.image_url ? [p.image_url] : [])}
              currency={currency}
              qty={qtyFor(p.id)}
              onQtyChange={(q) => onQtyChange(p, q)}
              stockColours={stockColours}
              prevLabel={t("prevPhoto")}
              nextLabel={t("nextPhoto")}
              decreaseLabel={t("decreaseQty")}
              increaseLabel={t("increaseQty")}
              stockLabels={stockLabels}
            />
          ))}
          {filteredPanels.length === 0 && (
            <div className="col-span-full text-ajs-muted text-sm py-8 text-center">
              {t("noMatchingPanels")}
            </div>
          )}
        </Grid>
      </Section>

      <Section title={t("sectionSensors")}>
        <Grid>
          {addons.map((p) => (
            <Card
              key={p.id}
              product={p}
              images={productImages[p.id] ?? (p.image_url ? [p.image_url] : [])}
              currency={currency}
              qty={qtyFor(p.id)}
              onQtyChange={(q) => onQtyChange(p, q)}
              stockColours={stockColours}
              prevLabel={t("prevPhoto")}
              nextLabel={t("nextPhoto")}
              decreaseLabel={t("decreaseQty")}
              increaseLabel={t("increaseQty")}
              stockLabels={stockLabels}
            />
          ))}
        </Grid>
      </Section>

      {visualFactory.length > 0 && (
        <Section title={t("sectionVisualFactory")}>
          <Grid>
            {visualFactory.map((p) => (
              <Card
                key={p.id}
                product={p}
                images={productImages[p.id] ?? (p.image_url ? [p.image_url] : [])}
                currency={currency}
                qty={qtyFor(p.id)}
                onQtyChange={(q) => onQtyChange(p, q)}
                stockColours={stockColours}
                prevLabel={t("prevPhoto")}
                nextLabel={t("nextPhoto")}
                decreaseLabel={t("decreaseQty")}
                increaseLabel={t("increaseQty")}
                stockLabels={stockLabels}
              />
            ))}
          </Grid>
        </Section>
      )}
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
  filterAll,
  filterMildSteel,
  filterStainlessSteel,
}: {
  plcFilter: string;
  setPlcFilter: (s: string) => void;
  matFilter: string;
  setMatFilter: (s: string) => void;
  filterAll: string;
  filterMildSteel: string;
  filterStainlessSteel: string;
}) {
  const plcOptions = [
    { value: "All", label: filterAll },
    { value: "Siemens", label: "Siemens" },
    { value: "Allen Bradley", label: "Allen Bradley" },
  ];
  const matOptions = [
    { value: "All", label: filterAll },
    { value: "Mild Steel", label: filterMildSteel },
    { value: "Stainless Steel", label: filterStainlessSteel },
  ];

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {plcOptions.map(({ value, label }) => (
        <Chip key={value} active={plcFilter === value} onClick={() => setPlcFilter(value)}>
          {label}
        </Chip>
      ))}
      <span className="w-px h-6 bg-ajs-light mx-1" aria-hidden />
      {matOptions.map(({ value, label }) => (
        <Chip key={value} active={matFilter === value} onClick={() => setMatFilter(value)}>
          {label}
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
  images,
  currency,
  qty,
  onQtyChange,
  stockColours,
  prevLabel,
  nextLabel,
  decreaseLabel,
  increaseLabel,
  stockLabels,
}: {
  product: Product;
  images: string[];
  currency: Currency;
  qty: number;
  onQtyChange: (q: number) => void;
  stockColours: StockColourSettings;
  prevLabel: string;
  nextLabel: string;
  decreaseLabel: string;
  increaseLabel: string;
  stockLabels: Record<string, string>;
}) {
  const active = qty > 0;
  const [imgIdx, setImgIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const stockClass =
    product.stock_status === "In Stock"      ? getClasses(stockColours.inStock) :
    product.stock_status === "Limited Stock" ? getClasses(stockColours.lowStock) :
    product.stock_status === "On Order"      ? getClasses(stockColours.outOfStock) :
    "bg-slate-100 text-slate-500";
  const stockLabel = stockLabels[product.stock_status] ?? product.stock_status;

  const prev = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setImgIdx((i) => (i - 1 + images.length) % images.length);
  }, [images.length]);

  const next = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setImgIdx((i) => (i + 1) % images.length);
  }, [images.length]);

  return (
    <div
      className={`rounded-lg border-2 transition-all ${
        active ? "border-ajs-primary bg-ajs-primary/5 shadow" : "border-ajs-light bg-white"
      }`}
    >
      <div className="aspect-square bg-gradient-to-br from-slate-200 to-slate-100 flex items-center justify-center text-ajs-dark/30 text-xs font-mono p-3 relative overflow-hidden group/img">
        {images.length > 0 ? (
          <>
            <Image
              src={images[imgIdx]}
              alt={product.name}
              fill
              className="object-cover cursor-zoom-in"
              sizes="200px"
              onClick={() => setLightbox(true)}
            />
            {images.length > 1 && (
              <>
                <button
                  onClick={prev}
                  className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 bg-black/50 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"
                  aria-label={prevLabel}
                >
                  ‹
                </button>
                <button
                  onClick={next}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 bg-black/50 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"
                  aria-label={nextLabel}
                >
                  ›
                </button>
                <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-1">
                  {images.map((_, i) => (
                    <span
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full ${i === imgIdx ? "bg-white" : "bg-white/40"}`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          product.sku
        )}
      </div>

      {lightbox && (
        <Lightbox
          images={images}
          index={imgIdx}
          alt={product.name}
          onClose={() => setLightbox(false)}
          onPrev={() => setImgIdx((i) => (i - 1 + images.length) % images.length)}
          onNext={() => setImgIdx((i) => (i + 1) % images.length)}
        />
      )}

      <div className="p-3 space-y-1.5">
        <div className="text-xs font-mono font-bold text-ajs-dark">{product.sku}</div>
        <div className="font-bold text-sm leading-tight text-ajs-text">
          {product.name}
        </div>
        <div className="flex items-center justify-between flex-wrap gap-1">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stockClass}`}>
            {stockLabel} · {product.lead_time}
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
            aria-label={decreaseLabel}
          >
            −
          </button>
          <span className="flex-1 text-center font-bold text-sm">{qty}</span>
          <button
            onClick={() => onQtyChange(qty + 1)}
            className="w-8 h-8 bg-ajs-primary text-white hover:bg-ajs-dark"
            aria-label={increaseLabel}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
