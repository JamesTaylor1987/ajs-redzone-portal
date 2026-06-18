"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { savePMPhoneAction, type PMActionState } from "./actions";

function waHref(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const intl = digits.startsWith("0") ? "44" + digits.slice(1) : digits;
  return `https://wa.me/${intl}`;
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-2 py-1 text-xs font-semibold text-white bg-ajs-primary rounded hover:bg-ajs-dark disabled:opacity-50"
    >
      {pending ? "…" : "Save"}
    </button>
  );
}

interface Props {
  pmId: string;
  phone: string | null;
}

export function PMPhoneCell({ pmId, phone }: Props) {
  const [editing, setEditing] = useState(!phone);
  const [state, action] = useFormState<PMActionState, FormData>(savePMPhoneAction, {});

  if (!editing && phone) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <a
          href={`tel:${phone}`}
          className="text-ajs-primary hover:underline text-sm font-medium"
          title="Call"
        >
          📞 {phone}
        </a>
        <a
          href={waHref(phone)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-600 hover:underline text-xs font-semibold"
          title="WhatsApp"
        >
          WhatsApp
        </a>
        <button
          onClick={() => setEditing(true)}
          className="text-ajs-muted hover:text-ajs-dark text-xs underline"
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <form
      action={(fd) => {
        action(fd);
        setEditing(false);
      }}
      className="flex items-center gap-1.5"
    >
      <input type="hidden" name="pm_id" value={pmId} />
      <input
        type="tel"
        name="phone"
        defaultValue={phone ?? ""}
        placeholder="+44 7700 000000"
        className="border border-ajs-light rounded px-2 py-1 text-xs w-36 focus:outline-none focus:ring-1 focus:ring-ajs-primary/40"
      />
      <SaveButton />
      {phone && (
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-xs text-ajs-muted hover:text-ajs-dark"
        >
          Cancel
        </button>
      )}
      {state.error && <span className="text-xs text-rose-600">{state.error}</span>}
    </form>
  );
}
