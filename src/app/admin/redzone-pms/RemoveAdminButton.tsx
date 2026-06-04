"use client";

import { useFormState, useFormStatus } from "react-dom";
import { removeAdminAction, type PMActionState } from "./actions";

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

export function RemoveAdminButton({ userId }: { userId: string }) {
  const [, action] = useFormState<PMActionState, FormData>(removeAdminAction, {});
  return (
    <form action={action} onSubmit={(e) => { if (!confirm("Remove this admin? They will lose portal access.")) e.preventDefault(); }}>
      <input type="hidden" name="user_id" value={userId} />
      <SubmitButton />
    </form>
  );
}
