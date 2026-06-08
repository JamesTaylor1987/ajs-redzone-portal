"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { CartLine, Currency, Product, CreateQuoteResponse, StockColourSettings } from "@/lib/types";
import { Header } from "./Header";
import { ProductGrid } from "./ProductGrid";
import { CartDrawer } from "./CartDrawer";
import { CheckoutForm } from "./CheckoutForm";
import { SupportBanner } from "./SupportBanner";

interface PortalAppProps {
  products: Product[];
  productImages: Record<string, string[]>;
  stockColours: StockColourSettings;
}

type Step = "browse" | "checkout";

const CART_STORAGE_KEY = "ajs_redzone_cart_v1";
const CCY_STORAGE_KEY = "ajs_redzone_ccy_v1";

export function PortalApp({ products, productImages, stockColours }: PortalAppProps) {
  const router = useRouter();
  const [currency, setCurrency] = useState<Currency>("GBP");
  const [lines, setLines] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [step, setStep] = useState<Step>("browse");

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const savedLines = localStorage.getItem(CART_STORAGE_KEY);
      if (savedLines) setLines(JSON.parse(savedLines));
      const savedCcy = localStorage.getItem(CCY_STORAGE_KEY);
      if (savedCcy === "GBP" || savedCcy === "EUR") setCurrency(savedCcy);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* ignore */
    }
  }, [lines]);

  useEffect(() => {
    try {
      localStorage.setItem(CCY_STORAGE_KEY, currency);
    } catch {
      /* ignore */
    }
  }, [currency]);

  const itemCount = lines.reduce((s, l) => s + l.qty, 0);

  const handleQtyChange = (product: Product, qty: number) => {
    setLines((current) => {
      const without = current.filter((l) => l.productId !== product.id);
      if (qty <= 0) return without;
      return [
        ...without,
        {
          productId: product.id,
          sku: product.sku,
          name: product.name,
          qty,
          unitPricePence: product.price_gbp_pence,
        },
      ];
    });
  };

  const clearCart = () => {
    setLines([]);
    setCartOpen(false);
  };

  const handleSubmissionSuccess = (response: CreateQuoteResponse) => {
    clearCart();
    router.push(`/quote/${encodeURIComponent(response.ref)}`);
  };

  return (
    <>
      <Header
        currency={currency}
        onCurrencyChange={setCurrency}
        cartCount={itemCount}
        onCartClick={() => setCartOpen(true)}
      />

      <main className="mx-auto max-w-6xl px-4 py-6">
        {step === "browse" && (
          <ProductGrid
            products={products}
            productImages={productImages}
            currency={currency}
            lines={lines}
            onQtyChange={handleQtyChange}
            stockColours={stockColours}
          />
        )}
        {step === "checkout" && (
          <CheckoutForm
            lines={lines}
            currency={currency}
            onBack={() => { setStep("browse"); window.scrollTo({ top: 0, behavior: "instant" }); }}
            onSuccess={handleSubmissionSuccess}
          />
        )}
        <div className="mt-8">
          <SupportBanner />
        </div>
      </main>

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        lines={lines}
        currency={currency}
        onContinue={() => {
          setCartOpen(false);
          setStep("checkout");
          window.scrollTo({ top: 0, behavior: "instant" });
        }}
        onClear={clearCart}
      />

      <TestQuoteButton />
    </>
  );
}

function TestQuoteButton() {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<string>("");

  async function fire() {
    setState("loading");
    try {
      const res = await fetch("/api/test-quote", { method: "POST" });
      const data = await res.json();
      setResult(JSON.stringify(data, null, 2));
      setState("done");
    } catch (e) {
      setResult(String(e));
      setState("error");
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {(state === "done" || state === "error") && (
        <pre className="bg-white border border-slate-300 rounded-lg p-3 text-xs max-w-xs overflow-auto max-h-48 shadow-lg">
          {result}
        </pre>
      )}
      <button
        onClick={fire}
        disabled={state === "loading"}
        className="bg-rose-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg hover:bg-rose-700 disabled:opacity-60"
      >
        {state === "loading" ? "Submitting..." : "🧪 Test Quote"}
      </button>
    </div>
  );
}

