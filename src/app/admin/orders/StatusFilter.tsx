"use client";

import { useRouter, useSearchParams } from "next/navigation";

const STATUSES = [
  { value: "", label: "All" },
  { value: "quote_submitted", label: "Quote submitted" },
  { value: "order_confirmed", label: "Order confirmed" },
  { value: "in_build", label: "In build" },
  { value: "ready_to_ship", label: "Ready to ship" },
  { value: "shipped", label: "Shipped" },
  { value: "complete", label: "Complete" },
  { value: "cancelled", label: "Cancelled" },
  { value: "expired",  label: "Expired" },
  { value: "revised",  label: "Superseded" },
];

export function StatusFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("status") ?? "";

  const set = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("status", value);
    } else {
      params.delete("status");
    }
    router.push(`/admin/orders?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {STATUSES.map((s) => (
        <button
          key={s.value}
          onClick={() => set(s.value)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
            current === s.value
              ? "bg-ajs-primary text-white border-ajs-primary"
              : "bg-white text-ajs-muted border-ajs-light hover:border-ajs-primary/40"
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
