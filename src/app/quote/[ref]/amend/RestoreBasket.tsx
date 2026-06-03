"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { CartLine } from "@/lib/types";

const CART_KEY = "ajs_redzone_cart_v1";

export function RestoreBasket({ lines }: { lines: CartLine[] }) {
  const router = useRouter();

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(lines));
    } catch {
      /* ignore */
    }
    router.push("/");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-4 border-ajs-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-ajs-muted text-sm">Restoring your basket…</p>
      </div>
    </main>
  );
}
