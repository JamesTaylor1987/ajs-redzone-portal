"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Currency } from "@/lib/types";

interface HeaderProps {
  currency: Currency;
  onCurrencyChange: (c: Currency) => void;
  cartCount: number;
  onCartClick: () => void;
}

export function Header({ currency, onCurrencyChange, cartCount, onCartClick }: HeaderProps) {
  const router = useRouter();
  const [clicks, setClicks] = useState(0);

  const handleLogoClick = () => {
    const next = clicks + 1;
    if (next >= 5) {
      setClicks(0);
      router.push("/admin/login");
    } else {
      setClicks(next);
    }
  };

  return (
    <header className="brand-gradient sticky top-0 z-30 shadow-md">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-4">
        <button
          onClick={handleLogoClick}
          className="flex items-center gap-3 cursor-default select-none"
          aria-label="AJS Redzone Hardware Portal"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://ajsspalding.co.uk/img/ajs-logo@2x.png"
            alt="AJS Control & Automation"
            className="h-8 w-auto object-contain brightness-0 invert"
          />
          <div className="hidden sm:block w-px h-8 bg-white/30" />
          <div className="hidden sm:flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://redzoneproduction.com/images/logo/logo-white.png"
              alt="Redzone"
              className="h-5 w-auto object-contain"
            />
            <span className="text-white/60 text-sm">Hardware Portal</span>
          </div>
        </button>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex bg-white/10 rounded-lg overflow-hidden border border-white/20 text-xs font-semibold">
            <button
              onClick={() => onCurrencyChange("GBP")}
              className={`px-3 py-1.5 ${currency === "GBP" ? "bg-white text-ajs-dark" : "text-white/80 hover:bg-white/10"}`}
            >
              £ GBP
            </button>
            <button
              onClick={() => onCurrencyChange("EUR")}
              className={`px-3 py-1.5 ${currency === "EUR" ? "bg-white text-ajs-dark" : "text-white/80 hover:bg-white/10"}`}
            >
              € EUR
            </button>
          </div>

          <button
            onClick={onCartClick}
            className="bg-white/15 border border-white/25 rounded-lg px-3 py-2 text-white text-sm font-semibold hover:bg-white/25 transition-colors flex items-center gap-2"
          >
            <span aria-hidden>🛒</span>
            <span className="hidden sm:inline">Basket</span>
            <span className="bg-white text-ajs-dark rounded-full px-2 py-0.5 text-xs font-bold min-w-[1.5rem] text-center">
              {cartCount}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
