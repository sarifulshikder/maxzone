"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Wallet,
  Users,
  Search,
  RefreshCw,
  Edit,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  X,
} from "lucide-react";
import api from "@/lib/api";
import { ApiResponse } from "@/types";

interface ResellerWallet {
  id: string;
  reseller_id: string;
  balance: number;
  credit_limit: number;
  locked_balance: number;
  currency: string;
}

interface Reseller {
  id: string;
  user_id: string;
  business_name: string;
  trade_license?: string;
  reseller_type: string;
  commission_type: string;
  commission_value: number;
  credit_limit: number;
  is_active: boolean;
  created_at: string;
}

interface AdminResellerOverview {
  reseller: Reseller;
  wallet: ResellerWallet;
  total_customers: number;
}

interface ResellerListResponse {
  items: AdminResellerOverview[];
  total: number;
  page: number;
  page_size: number;
}

export default function AdminResellersPage() {
  const [resellers, setResellers] = useState<AdminResellerOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedReseller, setSelectedReseller] = useState<AdminResellerOverview | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);

  // Adjustment modal state
  const [adjustAmount, setAdjustAmount] = useState("1000");
  const [adjustType, setAdjustType] = useState<"TOPUP" | "ADJUSTMENT">("TOPUP");
  const [adjustCreditLimit, setAdjustCreditLimit] = useState("");
  const [adjustRemarks, setAdjustRemarks] = useState("");
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const fetchResellers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<ApiResponse<ResellerListResponse>>("/admin/resellers");
      if (res.data?.success && res.data.data) {
        setResellers(res.data.data.items || []);
        setError(null);
      } else {
        setError(res.data?.error?.message || "Failed to load resellers");
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosErr.response?.data?.error?.message || "Failed to fetch resellers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResellers();
  }, [fetchResellers]);

  // Toast auto-dismiss
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
  };

  const openAdjustModal = (item: AdminResellerOverview) => {
    setSelectedReseller(item);
    setAdjustAmount("1000");
    setAdjustType("TOPUP");
    setAdjustCreditLimit(item.reseller.credit_limit.toString());
    setAdjustRemarks("Manual balance credit by Super Admin");
    setIsAdjustModalOpen(true);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReseller) return;

    setIsSubmittingAdjust(true);
    try {
      const amountNum = parseFloat(adjustAmount) || 0;
      const creditLimitNum = adjustCreditLimit ? parseFloat(adjustCreditLimit) : undefined;

      const res = await api.post("/admin/resellers/adjust", {
        reseller_id: selectedReseller.reseller.id,
        amount: amountNum,
        type: adjustType,
        credit_limit: creditLimitNum,
        remarks: adjustRemarks || "Admin balance adjustment",
      });

      if (res.data?.success) {
        showToast(`Successfully updated wallet for ${selectedReseller.reseller.business_name}!`, "success");
        setIsAdjustModalOpen(false);
        fetchResellers();
      } else {
        showToast(res.data?.error?.message || "Adjustment failed", "error");
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      showToast(axiosErr.response?.data?.error?.message || "Adjustment request failed", "error");
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  const filtered = resellers.filter(
    (r) =>
      searchTerm === "" ||
      r.reseller.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.reseller.reseller_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div
          role="alert"
          className={`fixed top-5 right-5 z-50 flex items-center space-x-3 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${
            toast.type === "error"
              ? "bg-rose-950/90 border-rose-800 text-rose-200"
              : "bg-emerald-950/90 border-emerald-800 text-emerald-200"
          }`}
        >
          {toast.type === "error" ? (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
          <button onClick={() => setToast(null)} className="text-xs opacity-60 hover:opacity-100 ml-2">
            ✕
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-950 p-6 rounded-2xl border border-zinc-800/80 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Reseller & Franchise Management
            </h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-400 font-mono">
              PHASE 5
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400">
            Multi-tier distributor hierarchy, double-entry wallet balance anchors, and credit overdraft controls
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href="/reseller/dashboard"
            target="_blank"
            className="px-4 py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center space-x-1.5 transition"
          >
            <span>Open Reseller Portal</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          <button
            onClick={() => fetchResellers()}
            className="p-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/50 transition flex items-center space-x-1.5 text-xs font-semibold"
            title="Refresh List"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
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

      {/* Table Container */}
      <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-950/40">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search business name or tier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="text-xs font-mono text-zinc-400">
            Total Resellers: <strong className="text-white">{filtered.length}</strong>
          </div>
        </div>

        {/* Resellers Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950 text-zinc-400 uppercase tracking-wider font-mono border-b border-zinc-800">
              <tr>
                <th className="p-4">Business Name & License</th>
                <th className="p-4">Type</th>
                <th className="p-4">Subscribers</th>
                <th className="p-4">Wallet Balance</th>
                <th className="p-4">Credit Limit</th>
                <th className="p-4">Available Funds</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-sans">
              {loading && resellers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-zinc-500 font-mono">
                    Loading resellers...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-zinc-500 font-mono">
                    No resellers found.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const available = item.wallet.balance + item.wallet.credit_limit;
                  return (
                    <tr key={item.reseller.id} className="hover:bg-zinc-800/40 transition-colors">
                      {/* Business Name */}
                      <td className="p-4">
                        <div className="font-bold text-white text-sm">
                          {item.reseller.business_name}
                        </div>
                        <div className="text-xs font-mono text-zinc-400">
                          {item.reseller.trade_license || "No Trade License registered"}
                        </div>
                      </td>

                      {/* Type */}
                      <td className="p-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">
                          {item.reseller.reseller_type}
                        </span>
                      </td>

                      {/* Customers */}
                      <td className="p-4">
                        <div className="flex items-center space-x-1.5">
                          <Users className="w-3.5 h-3.5 text-zinc-400" />
                          <span className="font-bold font-mono text-zinc-200">
                            {item.total_customers}
                          </span>
                        </div>
                      </td>

                      {/* Wallet Balance */}
                      <td className="p-4 font-mono font-bold text-emerald-400 text-sm">
                        ৳ {item.wallet.balance.toFixed(2)}
                      </td>

                      {/* Credit Limit */}
                      <td className="p-4 font-mono text-cyan-400 font-semibold">
                        ৳ {item.wallet.credit_limit.toFixed(2)}
                      </td>

                      {/* Available Funds */}
                      <td className="p-4 font-mono text-zinc-100 font-bold">
                        ৳ {available.toFixed(2)}
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        {item.reseller.is_active ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            ACTIVE
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-500">
                            INACTIVE
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        <button
                          onClick={() => openAdjustModal(item)}
                          className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-medium flex items-center space-x-1 ml-auto transition"
                        >
                          <Edit className="w-3 h-3" />
                          <span>Adjust Balance</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin Adjust Wallet Modal */}
      {isAdjustModalOpen && selectedReseller && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Adjust Reseller Wallet</h3>
                  <p className="text-xs text-zinc-400">{selectedReseller.reseller.business_name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1 font-mono">
                  Operation Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType("TOPUP")}
                    className={`p-2.5 rounded-xl border text-xs font-semibold transition ${
                      adjustType === "TOPUP"
                        ? "bg-emerald-950/50 border-emerald-500/60 text-emerald-300"
                        : "bg-zinc-950/50 border-zinc-800 text-zinc-400"
                    }`}
                  >
                    Credit Topup (+Amount)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType("ADJUSTMENT")}
                    className={`p-2.5 rounded-xl border text-xs font-semibold transition ${
                      adjustType === "ADJUSTMENT"
                        ? "bg-cyan-950/50 border-cyan-500/60 text-cyan-300"
                        : "bg-zinc-950/50 border-zinc-800 text-zinc-400"
                    }`}
                  >
                    Set Overdraft / Limit
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1 font-mono">
                  Adjustment Amount (৳)
                </label>
                <input
                  type="number"
                  step="50"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm font-mono text-emerald-400 focus:outline-none focus:border-emerald-500"
                  placeholder="1000"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1 font-mono">
                  Authorized Credit Limit (৳)
                </label>
                <input
                  type="number"
                  step="500"
                  value={adjustCreditLimit}
                  onChange={(e) => setAdjustCreditLimit(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm font-mono text-cyan-400 focus:outline-none focus:border-cyan-500"
                  placeholder="5000"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1 font-mono">
                  Audit Remarks / Reference
                </label>
                <input
                  type="text"
                  value={adjustRemarks}
                  onChange={(e) => setAdjustRemarks(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs font-sans text-zinc-200 focus:outline-none focus:border-cyan-500"
                  placeholder="e.g. Monthly credit line increase"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdjust}
                  className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition"
                >
                  {isSubmittingAdjust ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Applying Changes...</span>
                    </>
                  ) : (
                    <span>Save Adjustment</span>
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
