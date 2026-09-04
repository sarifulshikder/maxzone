"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Briefcase,
  LayoutDashboard,
  FileText,
  Wallet,
  ArrowUpRight,
  LogOut,
  ShieldCheck,
  Building2,
  RefreshCw,
  PlusCircle,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { ApiResponse } from "@/types";

interface ResellerWalletInfo {
  balance: number;
  credit_limit: number;
  currency: string;
}

export default function ResellerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, token, logout, isLoading } = useAuth();

  const [wallet, setWallet] = useState<ResellerWalletInfo | null>(null);
  const [businessName, setBusinessName] = useState<string>("Demo Reseller Communications");
  const [isTopupModalOpen, setIsTopupModalOpen] = useState(false);
  const [topupAmount, setTopupAmount] = useState("2000");
  const [topupMethod, setTopupMethod] = useState<"BKASH" | "NAGAD" | "BANK_TRANSFER">("BKASH");
  const [topupTrxId, setTopupTrxId] = useState("");
  const [isSubmittingTopup, setIsSubmittingTopup] = useState(false);
  const [topupToast, setTopupToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Fetch current reseller wallet balance
  const fetchWallet = async () => {
    try {
      const res = await api.get<ApiResponse<{ wallet: ResellerWalletInfo; reseller?: { business_name: string } }>>("/reseller/dashboard");
      if (res.data?.success && res.data.data?.wallet) {
        setWallet(res.data.data.wallet);
        if (res.data.data.reseller?.business_name) {
          setBusinessName(res.data.data.reseller.business_name);
        }
      }
    } catch {
      // ignore transient fetch error
    }
  };

  useEffect(() => {
    if (!isLoading && !token && !user) {
      router.push("/login?redirect=/reseller/dashboard");
    } else if (token) {
      fetchWallet();
    }
  }, [isLoading, token, user, router]);

  // Handle wallet topup
  const handleTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(topupAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setTopupToast({ message: "Please enter a valid positive topup amount", type: "error" });
      return;
    }

    setIsSubmittingTopup(true);
    try {
      const res = await api.post<ApiResponse<{ wallet: ResellerWalletInfo }>>("/reseller/wallet/topup", {
        amount: amountNum,
        payment_method: topupMethod,
        transaction_id: topupTrxId || `TRX-${topupMethod}-${Date.now().toString().slice(-6)}`,
        remarks: `Reseller self-topup via ${topupMethod}`,
      });

      if (res.data?.success) {
        setTopupToast({ message: `Successfully topped up ৳ ${amountNum.toLocaleString()}!`, type: "success" });
        setIsTopupModalOpen(false);
        fetchWallet();
        // Dispatch custom event to notify child components of wallet update
        window.dispatchEvent(new CustomEvent("reseller_wallet_updated"));
      } else {
        setTopupToast({ message: res.data?.error?.message || "Topup failed", type: "error" });
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      setTopupToast({
        message: axiosErr.response?.data?.error?.message || "Failed to process topup",
        type: "error",
      });
    } finally {
      setIsSubmittingTopup(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 mb-4 animate-pulse">
          <Briefcase className="w-6 h-6 text-zinc-950 font-black" />
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
            Loading Reseller Shell...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {topupToast && (
        <div
          role="alert"
          className={`fixed top-5 right-5 z-50 flex items-center space-x-3 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${
            topupToast.type === "error"
              ? "bg-rose-950/90 border-rose-800 text-rose-200"
              : "bg-emerald-950/90 border-emerald-800 text-emerald-200"
          }`}
        >
          {topupToast.type === "error" ? (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          )}
          <span className="text-sm font-medium">{topupToast.message}</span>
          <button onClick={() => setTopupToast(null)} className="text-xs opacity-60 hover:opacity-100 ml-2">
            ✕
          </button>
        </div>
      )}

      {/* Topbar Header */}
      <header className="h-16 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 flex items-center justify-between">
        {/* Brand & Portal Type */}
        <div className="flex items-center space-x-6">
          <Link href="/reseller/dashboard" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              <Briefcase className="w-5 h-5 text-zinc-950 font-black" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-base font-black tracking-tight text-white">MAXZONE</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-400">
                  Reseller Portal
                </span>
              </div>
              <span className="text-xs text-zinc-400 flex items-center space-x-1">
                <Building2 className="w-3 h-3 text-zinc-500" />
                <span className="truncate max-w-[180px] sm:max-w-xs">{businessName}</span>
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 pl-4 border-l border-zinc-800">
            <Link
              href="/reseller/dashboard"
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
                pathname === "/reseller/dashboard"
                  ? "bg-zinc-800 text-cyan-400 border border-zinc-700/60"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Dashboard & Renewals</span>
            </Link>
            <Link
              href="/reseller/ledger"
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
                pathname === "/reseller/ledger"
                  ? "bg-zinc-800 text-cyan-400 border border-zinc-700/60"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Financial Ledger</span>
            </Link>
          </nav>
        </div>

        {/* Right Section: Live Wallet Balance Bar & Actions */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* Topbar Wallet Display (Roadmap Walkthrough: Displays Wallet Balance ৳ 10,000, Credit Limit ৳ 5,000) */}
          <div className="flex items-center space-x-2 bg-zinc-950/80 border border-zinc-800 rounded-xl px-3 py-1.5 shadow-inner">
            <div className="flex items-center space-x-1.5 pr-3 border-r border-zinc-800">
              <Wallet className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-mono">Balance</span>
                <span className="text-xs sm:text-sm font-bold font-mono text-emerald-400">
                  ৳ {(wallet?.balance ?? 10000).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="hidden sm:block pl-1 pr-2">
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-mono">Credit Limit</span>
              <span className="text-xs sm:text-sm font-bold font-mono text-cyan-400">
                ৳ {(wallet?.credit_limit ?? 5000).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <button
              onClick={() => setIsTopupModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 text-xs font-semibold flex items-center space-x-1 transition"
              title="Instant Wallet Topup"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Topup</span>
            </button>
          </div>

          {/* User Menu / Logout */}
          <div className="flex items-center space-x-2 pl-2">
            <div className="hidden lg:flex flex-col text-right">
              <span className="text-xs font-bold text-zinc-200">{user?.username || "reseller_demo"}</span>
              <span className="text-[10px] font-mono text-cyan-400">FRANCHISE RESELLER</span>
            </div>

            <button
              onClick={() => logout()}
              className="p-2 rounded-xl bg-zinc-800/80 hover:bg-rose-950/40 hover:text-rose-400 text-zinc-400 border border-zinc-700/50 transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Reseller Content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
        {children}
      </main>

      {/* Global Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950/70 py-4 px-6 text-center text-xs font-mono text-zinc-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Maxzone Double-Entry Reseller Ledger • Atomic SELECT FOR UPDATE Protection</span>
        </div>
        <div>
          <span>Role: <strong className="text-cyan-400">{user?.role || "RESELLER"}</strong></span>
          <span className="mx-2">•</span>
          <Link href="/admin/dashboard" className="text-zinc-400 hover:text-emerald-400 underline">
            Super Admin View
          </Link>
        </div>
      </footer>

      {/* Instant Topup Modal */}
      {isTopupModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Instant Wallet Topup</h3>
                  <p className="text-xs text-zinc-400">Add funds to double-entry ledger balance</p>
                </div>
              </div>
              <button
                onClick={() => setIsTopupModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTopup} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-2 font-mono">
                  Select Payment Gateway
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTopupMethod("BKASH")}
                    className={`p-3 rounded-xl border text-center transition flex flex-col items-center space-y-1 ${
                      topupMethod === "BKASH"
                        ? "bg-pink-950/40 border-pink-500/60 text-pink-300 ring-1 ring-pink-500/40"
                        : "bg-zinc-950/50 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    <span className="text-xs font-black">bKash</span>
                    <span className="text-[10px] opacity-70">Checkout API</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTopupMethod("NAGAD")}
                    className={`p-3 rounded-xl border text-center transition flex flex-col items-center space-y-1 ${
                      topupMethod === "NAGAD"
                        ? "bg-amber-950/40 border-amber-500/60 text-amber-300 ring-1 ring-amber-500/40"
                        : "bg-zinc-950/50 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    <span className="text-xs font-black">Nagad</span>
                    <span className="text-[10px] opacity-70">Merchant API</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTopupMethod("BANK_TRANSFER")}
                    className={`p-3 rounded-xl border text-center transition flex flex-col items-center space-y-1 ${
                      topupMethod === "BANK_TRANSFER"
                        ? "bg-blue-950/40 border-blue-500/60 text-blue-300 ring-1 ring-blue-500/40"
                        : "bg-zinc-950/50 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    <span className="text-xs font-black">Bank Wire</span>
                    <span className="text-[10px] opacity-70">Direct Deposit</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1.5 font-mono">
                  Topup Amount (BDT)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-mono">৳</span>
                  <input
                    type="number"
                    min="100"
                    step="50"
                    value={topupAmount}
                    onChange={(e) => setTopupAmount(e.target.value)}
                    required
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-4 py-2.5 text-sm font-mono text-emerald-400 focus:outline-none focus:border-emerald-500"
                    placeholder="2000"
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  {["1000", "2000", "5000", "10000"].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTopupAmount(preset)}
                      className="px-2.5 py-1 rounded-lg bg-zinc-800/80 hover:bg-zinc-800 text-xs font-mono text-zinc-300 border border-zinc-700/50"
                    >
                      +৳{preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1.5 font-mono">
                  Simulated Transaction Reference ID
                </label>
                <input
                  type="text"
                  value={topupTrxId}
                  onChange={(e) => setTopupTrxId(e.target.value)}
                  placeholder="Leave blank for auto-generated gateway TrxID"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs font-mono text-zinc-300 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="p-3 bg-zinc-950/60 border border-zinc-800/80 rounded-xl text-xs space-y-1 font-mono text-zinc-400">
                <div className="flex justify-between">
                  <span>Current Balance:</span>
                  <span className="text-zinc-200">৳ {(wallet?.balance ?? 10000).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>After Topup:</span>
                  <span className="text-emerald-400 font-bold">
                    ৳ {((wallet?.balance ?? 10000) + (parseFloat(topupAmount) || 0)).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTopupModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTopup}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition"
                >
                  {isSubmittingTopup ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Crediting Ledger...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm Instant Topup</span>
                      <ArrowUpRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
