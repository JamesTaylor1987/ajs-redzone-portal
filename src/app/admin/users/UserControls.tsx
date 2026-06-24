"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useEffect, useRef, useState } from "react";
import {
  updateRoleAction,
  removeUserAction,
  inviteUserAction,
  generateResetLinkAction,
  type UserActionState,
} from "./actions";

const ROLES = [
  { value: "admin",    label: "Admin" },
  { value: "manager",  label: "Manager" },
  { value: "standard", label: "Standard" },
];

const ROLE_COLOUR: Record<string, string> = {
  admin:    "bg-red-100 text-red-700",
  manager:  "bg-purple-100 text-purple-700",
  standard: "bg-slate-100 text-slate-600",
};

function SubmitButton({ label, pending: pendingLabel }: { label: string; pending?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-3 py-1.5 rounded-md text-xs font-bold text-white bg-ajs-primary hover:bg-ajs-dark transition-colors disabled:opacity-50"
    >
      {pending ? (pendingLabel ?? "…") : label}
    </button>
  );
}

function CopyableLinkBox({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }).catch(() => {});
  }, [link]);

  return (
    <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
      <p className="text-xs font-semibold text-emerald-700 mb-1.5">
        {copied ? "Link copied to clipboard!" : "Copy this link and send it to the user:"}
      </p>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          readOnly
          value={link}
          onClick={() => inputRef.current?.select()}
          className="flex-1 text-xs font-mono bg-white border border-emerald-200 rounded px-2 py-1.5 text-ajs-text truncate focus:outline-none focus:ring-1 focus:ring-emerald-400"
        />
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(link).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 3000);
            });
          }}
          className="px-2.5 py-1 text-xs font-bold rounded bg-emerald-600 text-white hover:bg-emerald-700 transition-colors whitespace-nowrap"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <p className="text-[11px] text-emerald-600 mt-1.5">One-time link — expires in 24 hours.</p>
    </div>
  );
}

export function RoleSelect({ userId, currentRole }: { userId: string; currentRole: string }) {
  const [state, action] = useFormState<UserActionState, FormData>(updateRoleAction, {});
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="user_id" value={userId} />
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ROLE_COLOUR[currentRole] ?? "bg-slate-100 text-slate-600"}`}>
        {currentRole}
      </span>
      <select
        name="role"
        defaultValue={currentRole}
        className="border border-ajs-light rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-ajs-primary/40"
      >
        {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
      </select>
      <SubmitButton label="Save" />
      {state.error && <span className="text-xs text-rose-600">{state.error}</span>}
      {state.success && <span className="text-xs text-emerald-600">Saved</span>}
    </form>
  );
}

export function ResetLinkButton({ email }: { email: string }) {
  const [state, action] = useFormState<UserActionState, FormData>(generateResetLinkAction, {});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (state.link) {
      navigator.clipboard.writeText(state.link).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 4000);
      }).catch(() => {});
    }
  }, [state.link]);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <form action={action} className="inline">
        <input type="hidden" name="email" value={email} />
        <SubmitButton label="Get reset link" pending="Generating…" />
      </form>
      {state.error && <span className="text-xs text-rose-600">{state.error}</span>}
      {state.link && (
        <span className="text-xs font-semibold text-emerald-600">
          {copied ? "Copied to clipboard!" : "Link ready — paste to send"}
        </span>
      )}
    </div>
  );
}

export function RemoveButton({ userId }: { userId: string }) {
  const [state, action] = useFormState<UserActionState, FormData>(removeUserAction, {});
  return (
    <form action={action} onSubmit={(e) => { if (!confirm("Remove this user? They will lose access immediately.")) e.preventDefault(); }}>
      <input type="hidden" name="user_id" value={userId} />
      <button
        type="submit"
        className="text-xs text-rose-500 hover:text-rose-700 font-semibold transition-colors"
      >
        Remove
      </button>
      {state.error && <span className="text-xs text-rose-600 ml-2">{state.error}</span>}
    </form>
  );
}

export function InviteForm() {
  const [state, action] = useFormState<UserActionState, FormData>(inviteUserAction, {});
  return (
    <div className="bg-white rounded-xl border border-ajs-light p-5">
      <h2 className="text-xs font-bold uppercase tracking-wide text-ajs-dark mb-4">Invite a new user</h2>

      {state.error && (
        <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-4 py-2.5">
          {state.error}
        </div>
      )}

      <form action={action} className="flex gap-3 items-end flex-wrap">
        <div>
          <label className="block text-xs text-ajs-muted mb-1">Name</label>
          <input
            type="text"
            name="name"
            placeholder="Gareth Major"
            className="border border-ajs-light rounded-md px-3 py-2 text-sm w-44 focus:outline-none focus:ring-2 focus:ring-ajs-primary/40"
          />
        </div>
        <div>
          <label className="block text-xs text-ajs-muted mb-1">Email</label>
          <input
            type="email"
            name="email"
            required
            placeholder="gareth@example.com"
            className="border border-ajs-light rounded-md px-3 py-2 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-ajs-primary/40"
          />
        </div>
        <div>
          <label className="block text-xs text-ajs-muted mb-1">Role</label>
          <select
            name="role"
            defaultValue="standard"
            className="border border-ajs-light rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ajs-primary/40"
          >
            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <SubmitButton label="Create invite link" pending="Generating…" />
      </form>

      {state.link && <CopyableLinkBox link={state.link} />}

      <div className="mt-4 text-xs text-ajs-muted space-y-0.5">
        <p><strong>Admin / Manager</strong> — full access to admin and manufacturing</p>
        <p><strong>Standard</strong> — manufacturing only (work orders, stock)</p>
      </div>
    </div>
  );
}
