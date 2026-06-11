"use client";

import { useState } from "react";
import { sendAccountsLinkAction, type SendAccountsLinkState } from "./actions";
import { useT } from "@/components/LocaleProvider";

interface Props {
  quoteRef: string;
  token: string;
  accountsUrl: string;
}

export function ForwardToAccounts({ quoteRef, token, accountsUrl }: Props) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendAccountsLinkState>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(accountsUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* fallback: user can copy manually from the input */
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setResult(null);
    const fd = new FormData();
    fd.set("quoteRef", quoteRef);
    fd.set("token", token);
    fd.set("toEmail", email);
    const res = await sendAccountsLinkAction(null, fd);
    setResult(res);
    setSending(false);
    if (res && "success" in res) setEmail("");
  };

  return (
    <div className="mt-6 border-t border-ajs-light pt-6">
      <h3 className="text-sm font-bold text-ajs-dark mb-1">{t("forwardToAccountsTitle")}</h3>
      <p className="text-xs text-ajs-muted mb-4 leading-relaxed">
        {t("forwardToAccountsDesc")}
      </p>

      {/* Copy link */}
      <div className="flex gap-2 mb-3">
        <input
          readOnly
          value={accountsUrl}
          className="flex-1 min-w-0 text-xs border border-ajs-light rounded-md px-3 py-2 bg-slate-50 text-ajs-muted"
        />
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 px-4 py-2 rounded-md border border-ajs-light text-sm font-semibold text-ajs-dark bg-white hover:bg-ajs-light transition-colors"
        >
          {copied ? t("forwardCopied") : t("forwardCopyLink")}
        </button>
      </div>

      {/* Send by email */}
      {"success" in (result ?? {}) ? (
        <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
          {"success" in result! && result.success}
        </div>
      ) : (
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("forwardEmailPlaceholder")}
            required
            className="flex-1 text-sm border border-ajs-light rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ajs-primary/40"
          />
          <button
            type="submit"
            disabled={sending}
            className="shrink-0 px-4 py-2 rounded-md bg-ajs-primary text-white text-sm font-semibold hover:bg-ajs-dark disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {sending ? t("forwardSending") : t("forwardSendLink")}
          </button>
        </form>
      )}

      {"error" in (result ?? {}) && "error" in result! && (
        <p className="text-xs text-rose-600 mt-2">{result.error}</p>
      )}
    </div>
  );
}
