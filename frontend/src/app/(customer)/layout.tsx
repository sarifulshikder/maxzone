"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Wifi,
  CreditCard,
  LayoutDashboard,
} from "lucide-react";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      {/* Customer Header */}
      <header className="h-16 border-b border-zinc-800 bg-zinc-900/60 backdrop-blur-md sticky top-0 z-40 px-6 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <Link href="/customer/dashboard" className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <Wifi className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-sm font-black tracking-tight text-white block">
                MAXZONE <span className="text-emerald-400 font-mono text-xs">SELF-CARE</span>
              </span>
              <span className="text-[10px] text-zinc-400 -mt-0.5 block">Subscriber Portal</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center space-x-1 pl-4 border-l border-zinc-800">
            <Link
              href="/customer/dashboard"
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
                pathname === "/customer/dashboard"
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Overview</span>
            </Link>
            <Link
              href="/customer/pay"
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
                pathname === "/customer/pay"
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Pay Bill</span>
            </Link>
          </nav>
        </div>

        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center space-x-2 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full text-xs text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-[11px]">karim_fiber</span>
          </div>
          <Link
            href="/admin/billing"
            className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-zinc-800 rounded-xl transition"
          >
            Back to Admin
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-6 text-center text-xs text-zinc-500">
        Maxzone Broadband Self-Care • 24/7 Helpline: 16223 • Dhaka, Bangladesh
      </footer>
    </div>
  );
}
