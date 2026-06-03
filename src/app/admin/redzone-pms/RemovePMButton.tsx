"use client";

import { useFormState, useFormStatus } from "react-dom";
import { removePMAction, type PMActionState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-xs text-rose-600 hover:text-rose-800 font-semibold disabled:opacity-50"
    >
      {pending ? "Removing…" : "Remove"}
    </button>
  );
}

export function RemovePMButton({ pmId }: { pmId: string }) {
  const [, action] = useFormState<PMActionState, FormData>(removePMAction, {});
  return (
    <form action={action} onSubmit={(e) => { if (!confirm("Remove this PM? They will lose portal access.")) e.preventDefault(); }}>
      <input type="hidden" name="pm_id" value={pmId} />
      <SubmitButton />
    </form>
  );
}
