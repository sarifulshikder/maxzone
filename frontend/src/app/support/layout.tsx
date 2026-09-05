"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ShieldAlert, LogOut, RefreshCcw, Network } from "lucide-react";

const AGENT_ROLES = ["SUPER_ADMIN", "SUPPORT"];

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login?redirect=/support");
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <RefreshCcw className="w-4 h-4 text-emerald-400 animate-spin" />
          <span className="text-xs font-mono text-zinc-400">Loading helpdesk...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const authorized = user.role && AGENT_ROLES.includes(user.role);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col antialiased">
      <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center">
            <Network className="w-4 h-4 text-zinc-950" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-extrabold text-sm tracking-tight bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">MAXZONE</span>
              <span className="text-[9px] font-mono font-bold px-1 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">NOC</span>
            </div>
            <p className="text-[10px] text-zinc-500 font-mono">Support Helpdesk Kanban</p>
          </div>
        </div>
        {user && (
          <div className="flex items-center space-x-2.5">
            <Link href="/admin/dashboard" className="text-[11px] text-zinc-400 hover:text-emerald-400 transition-colors font-mono">
              ← Console
            </Link>
            <div className="text-right">
              <p className="text-[11px] font-semibold text-zinc-200">{user.first_name || user.username}</p>
              <p className="text-[9px] font-mono text-emerald-400">{user.role}</p>
            </div>
            <button onClick={logout} className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors" title="Sign out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </header>

      {authorized ? (
        <main className="flex-1">{children}</main>
      ) : (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 text-center space-y-3">
            <div className="mx-auto w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
            </div>
            <h1 className="text-sm font-bold text-zinc-100">Helpdesk Access Required</h1>
            <p className="text-xs text-zinc-500">
              Your role (<span className="font-mono">{user.role}</span>) does not have permission to open support tickets.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}