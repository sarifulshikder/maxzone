"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Search,
  ShieldCheck,
  Layers,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";
import api from "@/lib/api";
import { ApiResponse } from "@/types";

interface ResellerTransaction {
  id: string;
  reseller_id: string;
  wallet_id: string;
  type: "TOPUP" | "CUSTOMER_RENEWAL" | "COMMISSION_CREDIT" | "ADJUSTMENT";
  amount: number;
  balance_before: number;
  balance_after: number;
  reference_id: string | null;
  remarks: string | null;
  performed_by: string | null;
  created_at: string;
}

interface ResellerWallet {
  id: string;
  reseller_id: string;
  balance: number;
  credit_limit: number;
  locked_balance: number;
  currency: string;
}

interface LedgerResponse {
  items: ResellerTransaction[];
  total: number;
  page: number;
  page_size: number;
  wallet: ResellerWallet;
}

export default function ResellerLedgerPage() {
  const [transactions, setTransactions] = useState<ResellerTransaction[]>([]);
  const [wallet, setWallet] = useState<ResellerWallet | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  const fetchLedger = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<ApiResponse<LedgerResponse>>("/reseller/ledger?page=1&page_size=100");
      if (res.data?.success && res.data.data) {
        setTransactions(res.data.data.items || []);
        setWallet(res.data.data.wallet);
        setTotalCount(res.data.data.total);
        setError(null);
      } else {
        setError(res.data?.error?.message || "Failed to load financial ledger");
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosErr.response?.data?.error?.message || "Failed to connect to ledger API");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  const filteredTransactions = transactions.filter((tx) => {
    const matchesType = typeFilter === "ALL" || tx.type === typeFilter;
    const matchesSearch =
      searchTerm === "" ||
      (tx.reference_id && tx.reference_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (tx.remarks && tx.remarks.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-950 p-6 rounded-2xl border border-zinc-800/80 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Link
              href="/reseller/dashboard"
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition mr-1"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Double-Entry Financial Ledger
            </h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 font-mono">
              AUDIT STATEMENT
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400">
            Immutable transaction record with exact before and after balance tracking for financial audits
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchLedger()}
            className="p-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/50 transition flex items-center space-x-1.5 text-xs font-semibold"
            title="Refresh Ledger"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh Ledger</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && !loading && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Wallet Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-zinc-900/80 border border-zinc-800/80 p-5 rounded-2xl shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono">
              Settled Balance
            </span>
            <div className="mt-1">
              <span className="text-2xl font-black text-emerald-400 font-mono">
                ৳ {(wallet?.balance ?? 10000).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <span className="text-[11px] text-zinc-500 font-mono">Current real-time ledger balance</span>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800/80 p-5 rounded-2xl shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono">
              Authorized Credit Limit
            </span>
            <div className="mt-1">
              <span className="text-2xl font-black text-cyan-400 font-mono">
                ৳ {(wallet?.credit_limit ?? 5000).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <span className="text-[11px] text-zinc-500 font-mono">Overdraft ceiling allowed by Admin</span>
          </div>
          <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800/80 p-5 rounded-2xl shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono">
              Total Recorded Transactions
            </span>
            <div className="mt-1">
              <span className="text-2xl font-black text-white font-mono">
                {totalCount}
              </span>
            </div>
            <span className="text-[11px] text-zinc-500 font-mono">Full immutable double-entry history</span>
          </div>
          <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Layers className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Ledger Table Container */}
      <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl shadow-xl overflow-hidden">
        {/* Controls Bar */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-950/40">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search reference ID or remarks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex rounded-xl bg-zinc-900 p-1 border border-zinc-800 text-xs font-mono w-full sm:w-auto overflow-x-auto">
            {["ALL", "CUSTOMER_RENEWAL", "TOPUP", "ADJUSTMENT"].map((filter) => (
              <button
                key={filter}
                onClick={() => setTypeFilter(filter)}
                className={`px-3 py-1 rounded-lg transition whitespace-nowrap text-xs font-medium ${
                  typeFilter === filter
                    ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Ledger Statement Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950 text-zinc-400 uppercase tracking-wider font-mono border-b border-zinc-800">
              <tr>
                <th className="p-4">Date & Time</th>
                <th className="p-4">Reference ID</th>
                <th className="p-4">Type</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Balance Before</th>
                <th className="p-4">Balance After</th>
                <th className="p-4">Remarks / Audit Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono">
              {loading && transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-500">
                    Loading ledger transactions...
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-500">
                    No transactions recorded matching the filter.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const isDebit = tx.type === "CUSTOMER_RENEWAL";
                  const isTopup = tx.type === "TOPUP";

                  return (
                    <tr key={tx.id} className="hover:bg-zinc-800/40 transition-colors">
                      {/* Timestamp */}
                      <td className="p-4 text-zinc-300 whitespace-nowrap">
                        {new Date(tx.created_at).toLocaleString()}
                      </td>

                      {/* Reference ID */}
                      <td className="p-4 font-bold text-cyan-400 whitespace-nowrap">
                        {tx.reference_id || "—"}
                      </td>

                      {/* Type Badge */}
                      <td className="p-4 whitespace-nowrap">
                        {isDebit ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <ArrowDownLeft className="w-3 h-3 mr-1" />
                            RENEWAL
                          </span>
                        ) : isTopup ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <ArrowUpRight className="w-3 h-3 mr-1" />
                            TOPUP
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            {tx.type}
                          </span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="p-4 whitespace-nowrap">
                        <span
                          className={`font-black text-sm ${
                            isDebit ? "text-rose-400" : "text-emerald-400"
                          }`}
                        >
                          {isDebit ? "-" : "+"}৳ {tx.amount.toFixed(2)}
                        </span>
                      </td>

                      {/* Balance Before */}
                      <td className="p-4 text-zinc-400 whitespace-nowrap">
                        ৳ {tx.balance_before.toFixed(2)}
                      </td>

                      {/* Balance After (Exact Verification Anchor) */}
                      <td className="p-4 font-bold text-zinc-100 whitespace-nowrap">
                        ৳ {tx.balance_after.toFixed(2)}
                      </td>

                      {/* Remarks */}
                      <td className="p-4 text-zinc-300 font-sans text-xs max-w-xs truncate">
                        {tx.remarks || "Standard Ledger Entry"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
