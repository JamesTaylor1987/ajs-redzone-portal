"use client";

import { useState } from "react";
import Link from "next/link";
import { rzLogoutAction } from "./login/actions";

const RZ_ICON = "https://cdn.prod.website-files.com/6977ae7685a0199da7148962/699860f91ee461dc0f2bde24_redzone-favicon.svg";

interface Props {
  name: string;
}

export function RedzoneNav({ name }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <header className="bg-[#7f1d1d] text-white shadow">
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={RZ_ICON} alt="Redzone" className="h-6 w-6" />
          <span className="font-extrabold text-sm tracking-wide">Redzone Portal</span>
          <nav className="hidden sm:flex gap-4 text-sm ml-2">
            <Link href="/redzone/quotes" className="text-white/80 hover:text-white transition-colors">
              My Quotes
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-4 text-xs text-white/60">
            <span>{name}</span>
            <form action={rzLogoutAction}>
              <button type="submit" className="hover:text-white transition-colors">Sign out</button>
            </form>
          </div>

          <button
            className="sm:hidden p-2 rounded hover:bg-white/10 transition-colors"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {open ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {open && (
        <div className="sm:hidden border-t border-white/20 px-4 py-3 space-y-1 max-w-5xl mx-auto">
          <Link href="/redzone/quotes" onClick={() => setOpen(false)} className="block px-3 py-2.5 rounded-lg text-sm font-medium text-white/90 hover:bg-white/10 transition-colors">
            My Quotes
          </Link>
          <div className="border-t border-white/20 pt-2 mt-2 space-y-1">
            <div className="px-3 py-1 text-xs text-white/50">{name}</div>
            <form action={rzLogoutAction}>
              <button type="submit" className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-white/90 hover:bg-white/10 transition-colors">
                Sign out
              </button>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
