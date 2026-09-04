"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Zap,
  RefreshCw,
  Search,
  ArrowRight,
  Clock,
  CheckSquare,
  Square,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import api from "@/lib/api";
import { ApiResponse } from "@/types";

interface CustomerItem {
  id: string;
  customer_code: string;
  name: string;
  phone: string;
  email: string;
  zone_area: string;
  username: string;
  package_name: string;
  package_speed: string;
  price: number;
  router_name: string;
  status: string;
  expires_at: string;
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

interface ResellerProfile {
  id: string;
  business_name: string;
  commission_value: number;
  credit_limit: number;
}

interface ResellerOverviewData {
  reseller: ResellerProfile;
  wallet: ResellerWallet;
  total_customers: number;
  active_customers: number;
  expired_customers: number;
  customers: CustomerItem[];
}

interface BatchRenewResult {
  renewed_count: number;
  total_deducted: number;
  balance_before: number;
  balance_after: number;
}

export default function ResellerDashboardPage() {
  const [data, setData] = useState<ResellerOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isRenewing, setIsRenewing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "EXPIRED" | "ACTIVE">("ALL");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<ApiResponse<ResellerOverviewData>>("/reseller/dashboard");
      if (res.data?.success && res.data.data) {
        setData(res.data.data);
        setError(null);
      } else {
        setError(res.data?.error?.message || "Failed to load reseller dashboard overview");
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axiosErr.response?.data?.error?.message || "Failed to communicate with API server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
    const handleWalletUpdated = () => fetchOverview();
    window.addEventListener("reseller_wallet_updated", handleWalletUpdated);
    return () => window.removeEventListener("reseller_wallet_updated", handleWalletUpdated);
  }, [fetchOverview]);

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

  const customers = data?.customers || [];

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      searchTerm === "" ||
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.customer_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm);

    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "EXPIRED" && c.status === "EXPIRED") ||
      (statusFilter === "ACTIVE" && c.status === "ACTIVE");

    return matchesSearch && matchesStatus;
  });

  const toggleSelectCustomer = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredCustomers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredCustomers.map((c) => c.id));
    }
  };

  // Calculate renewal total for selected customers
  const selectedCost = selectedIds.reduce((total, id) => {
    const cust = customers.find((c) => c.id === id);
    return total + (cust?.price ?? 550);
  }, 0);

  // Execute Batch Renewal (SELECT FOR UPDATE Double-Entry Atomic Ledger Transaction)
  const handleBatchRenew = async (idsToRenew: string[]) => {
    if (idsToRenew.length === 0) {
      showToast("Please select at least one subscriber to renew.", "error");
      return;
    }

    setIsRenewing(true);
    try {
      const res = await api.post<ApiResponse<BatchRenewResult>>("/reseller/renew/batch", {
        customer_ids: idsToRenew,
      });

      if (res.data?.success && res.data.data) {
        const result = res.data.data;
        showToast(
          `⚡ Batch Renewal Successful! Renewed ${result.renewed_count} subscriber(s). Deducted ৳ ${result.total_deducted.toFixed(2)}. New Balance: ৳ ${result.balance_after.toFixed(2)}.`,
          "success"
        );
        setSelectedIds([]);
        // Re-fetch overview
        await fetchOverview();
        // Dispatch event to update topbar wallet
        window.dispatchEvent(new CustomEvent("reseller_wallet_updated"));
      } else {
        showToast(res.data?.error?.message || "Batch renewal failed", "error");
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
      showToast(
        axiosErr.response?.data?.error?.message || "Failed to execute atomic wallet deduction",
        "error"
      );
    } finally {
      setIsRenewing(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
          Loading Reseller Overview...
        </span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-6 rounded-2xl bg-rose-950/30 border border-rose-800/50 text-rose-200 space-y-4">
        <div className="flex items-center space-x-3">
          <AlertCircle className="w-6 h-6 text-rose-400 shrink-0" />
          <div>
            <h3 className="text-base font-bold">Failed to load Reseller Dashboard</h3>
            <p className="text-xs text-rose-300/80">{error}</p>
          </div>
        </div>
        <button
          onClick={() => fetchOverview()}
          className="px-4 py-2 rounded-xl bg-rose-900/50 hover:bg-rose-900 text-xs font-semibold flex items-center space-x-2 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Connection</span>
        </button>
      </div>
    );
  }

  const wallet = data?.wallet || { balance: 10000, credit_limit: 5000, locked_balance: 0, currency: "BDT" };

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
              Subscriber Renewal & Wallet Desk
            </h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-400 font-mono">
              PHASE 5
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400">
            Atomic batch provisioning with zero double-spending protection and instant MikroTik RADIUS sync
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchOverview()}
            className="p-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/50 transition flex items-center space-x-1.5 text-xs font-semibold"
            title="Refresh Table"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <Link
            href="/reseller/ledger"
            className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700/80 text-cyan-400 border border-cyan-500/30 font-semibold text-xs flex items-center space-x-1.5 transition"
          >
            <span>Financial Ledger</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Wallet Balance (Walkthrough Anchor) */}
        <div className="bg-zinc-900/80 border border-zinc-800/80 p-5 rounded-2xl relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono">
              Wallet Balance
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
              ৳ {wallet.balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1 font-mono">
            Available for immediate customer renewals
          </p>
        </div>

        {/* Credit Limit (Walkthrough Anchor) */}
        <div className="bg-zinc-900/80 border border-zinc-800/80 p-5 rounded-2xl relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono">
              Credit Limit
            </span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-cyan-400 font-mono">
              ৳ {wallet.credit_limit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1 font-mono">
            Max overdraft allowed by Super Admin
          </p>
        </div>

        {/* Expired Subscribers Awaiting Renewal */}
        <div className="bg-zinc-900/80 border border-zinc-800/80 p-5 rounded-2xl relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono">
              Awaiting Renewal
            </span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-rose-400 font-mono">
              {data?.expired_customers ?? 0}
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1 font-mono">
            Subscribers currently in EXPIRED status
          </p>
        </div>

        {/* Total Active Subscribers */}
        <div className="bg-zinc-900/80 border border-zinc-800/80 p-5 rounded-2xl relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono">
              Active Subscribers
            </span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">
              {data?.active_customers ?? 0}{" "}
              <span className="text-xs font-normal text-zinc-500">/ {data?.total_customers ?? 0}</span>
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1 font-mono">
            Online with active RADIUS authorizations
          </p>
        </div>
      </div>

      {/* Batch Renewal Floating Action Bar */}
      {selectedIds.length > 0 && (
        <div className="sticky top-20 z-30 bg-gradient-to-r from-cyan-950 via-zinc-900 to-emerald-950 border border-cyan-500/50 rounded-2xl p-4 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-black text-white">
                  {selectedIds.length} Subscriber{selectedIds.length > 1 ? "s" : ""} Selected
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
                  Total: ৳ {selectedCost.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Wallet deduction: ৳ {wallet.balance.toFixed(2)} →{" "}
                <strong className="text-emerald-400">৳ {(wallet.balance - selectedCost).toFixed(2)}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition"
            >
              Clear
            </button>
            <button
              onClick={() => handleBatchRenew(selectedIds)}
              disabled={isRenewing}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-zinc-950 font-black text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition"
            >
              {isRenewing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing Atomic Renewal...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-zinc-950" />
                  <span>⚡ Batch Renew Selected ({selectedIds.length})</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Customer Renewal Table Section */}
      <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl shadow-xl overflow-hidden">
        {/* Table Controls */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-950/40">
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search name, username, or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex rounded-xl bg-zinc-900 p-1 border border-zinc-800 text-xs font-mono">
              {(["ALL", "EXPIRED", "ACTIVE"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`px-3 py-1 rounded-lg transition text-xs font-medium ${
                    statusFilter === filter
                      ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            <button
              onClick={toggleSelectAll}
              className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700/80 text-xs font-medium text-zinc-300 border border-zinc-700/50 flex items-center space-x-1.5"
            >
              {selectedIds.length === filteredCustomers.length && filteredCustomers.length > 0 ? (
                <>
                  <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Deselect All</span>
                </>
              ) : (
                <>
                  <Square className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Select All ({filteredCustomers.length})</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Customer Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950 text-zinc-400 uppercase tracking-wider font-mono border-b border-zinc-800">
              <tr>
                <th className="p-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.length > 0 && selectedIds.length === filteredCustomers.length}
                    onChange={toggleSelectAll}
                    className="rounded border-zinc-700 bg-zinc-900 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                </th>
                <th className="p-4">Subscriber</th>
                <th className="p-4">Package & Speed</th>
                <th className="p-4">Renewal Cost</th>
                <th className="p-4">Status</th>
                <th className="p-4">Expires At</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-sans">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-500 font-mono">
                    No subscribers found matching the filters.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => {
                  const isSelected = selectedIds.includes(cust.id);
                  const isExpired = cust.status === "EXPIRED";

                  return (
                    <tr
                      key={cust.id}
                      className={`hover:bg-zinc-800/40 transition-colors ${
                        isSelected ? "bg-cyan-950/20" : ""
                      }`}
                    >
                      {/* Selection Checkbox */}
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectCustomer(cust.id)}
                          className="rounded border-zinc-700 bg-zinc-900 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                        />
                      </td>

                      {/* Subscriber Info */}
                      <td className="p-4">
                        <div className="font-bold text-white text-sm">{cust.name}</div>
                        <div className="text-xs text-zinc-400 font-mono">
                          {cust.customer_code} • <span className="text-cyan-400 font-bold">{cust.username}</span>
                        </div>
                        <div className="text-[11px] text-zinc-500">{cust.phone}</div>
                      </td>

                      {/* Package & Speed */}
                      <td className="p-4">
                        <div className="font-semibold text-zinc-200">{cust.package_name}</div>
                        <div className="text-xs font-mono text-zinc-400">
                          Limit: <span className="text-emerald-400">{cust.package_speed}</span>
                        </div>
                      </td>

                      {/* Wholesale Cost */}
                      <td className="p-4">
                        <span className="font-bold font-mono text-sm text-zinc-100">
                          ৳ {cust.price.toFixed(2)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        {isExpired ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            EXPIRED
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            ACTIVE
                          </span>
                        )}
                      </td>

                      {/* Expires At */}
                      <td className="p-4 text-xs font-mono text-zinc-400">
                        {cust.expires_at ? new Date(cust.expires_at).toLocaleString() : "—"}
                      </td>

                      {/* Individual Renew Button */}
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleBatchRenew([cust.id])}
                          disabled={isRenewing}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1 ml-auto ${
                            isExpired
                              ? "bg-cyan-500 hover:bg-cyan-400 text-zinc-950 shadow-md shadow-cyan-500/20"
                              : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700"
                          }`}
                        >
                          <Zap className="w-3 h-3" />
                          <span>Renew</span>
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
    </div>
  );
}
