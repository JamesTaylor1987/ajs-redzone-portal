"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { CartLine, CheckoutDetails } from "@/lib/types";

const CART_KEY    = "ajs_redzone_cart_v1";
const PREFILL_KEY = "ajs_redzone_prefill_v1";
const AMEND_KEY   = "ajs_redzone_amend_ref_v1";

interface Props {
  lines: CartLine[];
  prefill: Partial<CheckoutDetails>;
  originalRef: string;
}

export function RestoreBasket({ lines, prefill, originalRef }: Props) {
  const router = useRouter();

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(lines));
      localStorage.setItem(PREFILL_KEY, JSON.stringify(prefill));
      localStorage.setItem(AMEND_KEY, originalRef);
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
