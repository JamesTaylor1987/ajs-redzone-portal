"use client";

import { setProductActiveAction } from "./actions";

export function DeactivateButton({ id, name, active }: { id: string; name: string; active: boolean }) {
  const next = !active;
  const label = active ? "Deactivate" : "Activate";
  const confirmMsg = active
    ? `Deactivate "${name}"? It won't appear in the catalogue.`
    : `Activate "${name}"? It will appear in the catalogue.`;

  return (
    <form
      action={setProductActiveAction}
      onSubmit={(e) => {
        if (!confirm(confirmMsg)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="active" value={String(next)} />
      <button
        type="submit"
        className={`text-xs font-semibold hover:underline ${active ? "text-rose-500" : "text-emerald-600"}`}
      >
        {label}
      </button>
    </form>
  );
}
