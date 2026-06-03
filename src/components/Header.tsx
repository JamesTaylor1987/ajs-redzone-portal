"use client";

import Link from "next/link";
import type { Currency } from "@/lib/types";

interface HeaderProps {
  currency: Currency;
  onCurrencyChange: (c: Currency) => void;
  cartCount: number;
  onCartClick: () => void;
}

export function Header({ currency, onCurrencyChange, cartCount, onCartClick }: HeaderProps) {
  return (
    <header className="brand-gradient sticky top-0 z-30 shadow-md">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-4">
        <div
          className="flex items-center gap-3 select-none"
          aria-label="AJS Redzone Hardware Portal"
        >
          <Link href="/admin/login" className="bg-white rounded px-2 py-1 block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://ajsspalding.co.uk/img/ajs-logo@2x.png"
              alt="AJS Control & Automation"
              className="h-6 w-auto object-contain"
            />
          </Link>
          <div className="w-px h-8 bg-white/30" />
          <Link href="/redzone/login" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://cdn.prod.website-files.com/6977ae7685a0199da7148962/699860f91ee461dc0f2bde24_redzone-favicon.svg"
              alt="Redzone PM Portal"
              className="h-5 w-5 object-contain"
            />
            <span className="font-bold text-white text-sm hidden sm:inline">Redzone</span>
            <span className="text-white/60 text-sm hidden sm:inline">Hardware Portal</span>
          </Link>
        </div>

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
