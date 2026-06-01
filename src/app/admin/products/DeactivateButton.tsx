"use client";

import { deleteProductAction } from "./actions";

export function DeactivateButton({ id, name }: { id: string; name: string }) {
  return (
    <form
      action={deleteProductAction}
      onSubmit={(e) => {
        if (!confirm(`Deactivate "${name}"? It won't appear in the catalogue.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="text-rose-500 text-xs font-semibold hover:underline">
        Deactivate
      </button>
    </form>
  );
}
