"use client";

import { useFormState, useFormStatus } from "react-dom";
import { assignPMAction } from "./[id]/actions";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-2 py-0.5 rounded text-xs font-bold text-white bg-ajs-primary hover:bg-ajs-dark disabled:opacity-50 transition-colors"
    >
      {pending ? "…" : "Save"}
    </button>
  );
}

interface PM { id: string; name: string; type?: string | null; }

interface Props {
  quoteId: string;
  currentPMId: string | null;
  pms: PM[];
}

export function InlinePMForm({ quoteId, currentPMId, pms }: Props) {
  const [state, action] = useFormState(assignPMAction, {});
  return (
    <div className="space-y-1">
      <form action={action} className="flex items-center gap-1">
        <input type="hidden" name="id" value={quoteId} />
        <select
          name="rz_pm_id"
          defaultValue={currentPMId ?? ""}
          className="border border-ajs-light rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-ajs-primary/40 max-w-[140px]"
        >
          <option value="">— None —</option>
          {pms.map((pm) => (
            <option key={pm.id} value={pm.id}>
              {pm.name}{pm.type === "admin" ? " (Mgr)" : ""}
            </option>
          ))}
        </select>
        <SaveButton />
      </form>
      {state.success && <p className="text-xs text-emerald-600 font-semibold">Saved</p>}
      {state.error && <p className="text-xs text-rose-600">{state.error}</p>}
    </div>
  );
}
