"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Network, AlertTriangle, RefreshCcw, HardHat, LogOut } from "lucide-react";

export default function FieldLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, login, logout } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await login(username.trim(), password);
    if (!result.success) {
      setError(result.error || "Login failed");
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col antialiased">
      {/* Mobile Top Bar */}
      <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center">
            <HardHat className="w-4 h-4 text-zinc-950" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-extrabold text-sm tracking-tight bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">MAXZONE</span>
              <span className="text-[9px] font-mono font-bold px-1 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">FIELD</span>
            </div>
            <p className="text-[10px] text-zinc-500 font-mono">Field Technician Portal</p>
          </div>
        </div>
        {user && (
          <div className="flex items-center space-x-2">
            <div className="text-right">
              <p className="text-[11px] font-semibold text-zinc-200">{user.first_name || user.username}</p>
              <p className="text-[9px] font-mono text-zinc-500">{user.role}</p>
            </div>
            <button onClick={logout} className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors" title="Sign out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </header>

      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-24 space-y-3">
          <RefreshCcw className="w-6 h-6 text-emerald-400 animate-spin" />
          <p className="text-xs text-zinc-500 font-mono">Checking session...</p>
        </div>
      ) : !user ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 space-y-5">
            <div className="text-center space-y-1.5">
              <div className="mx-auto w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Network className="w-5 h-5 text-emerald-400" />
              </div>
              <h1 className="text-sm font-bold text-zinc-100">Technician Sign In</h1>
              <p className="text-[11px] text-zinc-500">Field technician credentials required</p>
            </div>

            {error && (
              <div className="flex items-center space-x-2 p-3 bg-rose-950/50 border border-rose-800 rounded-xl text-xs text-rose-300">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-3">
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Username"
                required
                className="w-full px-3 py-2.5 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
              />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password"
                required
                className="w-full px-3 py-2.5 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 text-xs font-semibold text-zinc-950 bg-emerald-500 hover:bg-emerald-400 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {submitting && <RefreshCcw className="w-3.5 h-3.5 animate-spin" />}
                <span>{submitting ? "Signing in..." : "Sign In"}</span>
              </button>
            </form>
            <p className="text-[10px] text-zinc-600 text-center">Demo technician: <span className="font-mono text-zinc-400">field</span> / <span className="font-mono text-zinc-400">Field@2026</span></p>
          </div>
        </div>
      ) : (
        <main className="flex-1 mx-auto w-full max-w-md px-4 py-5 space-y-5 pb-24">{children}</main>
      )}
    </div>
  );
}