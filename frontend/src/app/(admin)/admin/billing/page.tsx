"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  CreditCard,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  X,
  Zap,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import api from "@/lib/api";
import { Invoice, ApiResponse } from "@/types";

export default function BillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [expireModalOpen, setExpireModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateMsg, setGenerateMsg] = useState<string | null>(null);
  const [targetMonth, setTargetMonth] = useState("2026-09");
  const [expireLoading, setExpireLoading] = useState(false);
  const [expireMsg, setExpireMsg] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<ApiResponse<{ items: Invoice[]; total: number }>>("/billing/invoices", {
        params: {
          status: statusFilter === "ALL" ? "" : statusFilter,
          search: search || undefined,
        },
      });
      if (res.data?.success && res.data.data?.items) {
        setInvoices(res.data.data.items);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleGenerateInvoices = async () => {
    setGenerating(true);
    setGenerateMsg(null);
    try {
      const res = await api.post<ApiResponse<{ generated_count: number; total_amount: number }>>(
        "/billing/invoices/generate",
        { month: targetMonth }
      );
      if (res.data?.success && res.data.data) {
        setGenerateMsg(
          `Success: Generated ${res.data.data.generated_count} invoices totaling ৳ ${res.data.data.total_amount}`
        );
        fetchInvoices();
        setTimeout(() => {
          setGenerateModalOpen(false);
          setGenerateMsg(null);
        }, 2000);
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setGenerateMsg(e.response?.data?.error?.message || "Failed to generate invoices");
    } finally {
      setGenerating(false);
    }
  };

  const handleExpireAccount = async (customerId: string) => {
    setExpireLoading(true);
    setExpireMsg(null);
    try {
      const res = await api.post<ApiResponse<{ message: string }>>("/billing/customer/expire", {
        customer_id: customerId,
        status: "EXPIRED",
      });
      if (res.data?.success) {
        setExpireMsg("Account artificially set to EXPIRED. Line status updated.");
        fetchInvoices();
        setTimeout(() => {
          setExpireModalOpen(false);
          setExpireMsg(null);
        }, 1200);
      }
    } catch {
      setExpireMsg("Failed to expire account");
    } finally {
      setExpireLoading(false);
    }
  };

  // KPIs
  const totalInvoiced = invoices.reduce((acc, inv) => acc + Number(inv.total_payable), 0);
  const totalPaid = invoices
    .filter(inv => inv.status === "PAID")
    .reduce((acc, inv) => acc + Number(inv.total_payable), 0);
  const totalUnpaid = invoices
    .filter(inv => inv.status === "UNPAID" || inv.status === "OVERDUE")
    .reduce((acc, inv) => acc + Number(inv.total_payable), 0);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-100">Billing & Automated Invoicing</h1>
              <p className="text-xs text-zinc-500">
                1st-of-month calendar cycle, mid-month pro-rata engine & bKash/Nagad auto-provisioning
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setGenerateModalOpen(true)}
            className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition flex items-center space-x-2 shadow-lg shadow-indigo-600/20"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Generate Invoices</span>
          </button>
          <a
            href="/customer/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-xl transition flex items-center space-x-1.5"
          >
            <span>Customer Portal</span>
            <ExternalLink className="w-3 h-3 text-zinc-400" />
          </a>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-1.5">
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Total Invoiced</span>
          <div className="text-2xl font-bold text-zinc-100 font-mono">
            ৳ {totalInvoiced.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-zinc-500">Across {invoices.length} active invoices</span>
        </div>

        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-1.5">
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Collected (Paid)</span>
          <div className="text-2xl font-bold text-emerald-400 font-mono">
            ৳ {totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-emerald-500/80 flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3 inline" />
            <span>Real-time settled payments</span>
          </span>
        </div>

        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-1.5">
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Outstanding (Unpaid)</span>
          <div className="text-2xl font-bold text-amber-400 font-mono">
            ৳ {totalUnpaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-amber-500/80 flex items-center space-x-1">
            <Clock className="w-3 h-3 inline" />
            <span>Pending subscriber collection</span>
          </span>
        </div>

        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-1.5">
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Payment Gateways</span>
          <div className="flex items-center space-x-2 pt-1">
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#e2136e]/20 text-[#e2136e] border border-[#e2136e]/30">
              bKash Sandbox
            </span>
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#f7941d]/20 text-[#f7941d] border border-[#f7941d]/30">
              Nagad API
            </span>
          </div>
          <span className="text-[11px] text-zinc-500">Automated CoA re-dispatch</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
        <div className="flex items-center space-x-1 bg-zinc-900 border border-zinc-800 p-1 rounded-xl">
          {["ALL", "UNPAID", "PAID", "OVERDUE"].map(tab => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                statusFilter === tab
                  ? "bg-zinc-800 text-zinc-100 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search invoice or subscriber..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-64"
            />
          </div>
          <button
            onClick={fetchInvoices}
            className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-zinc-950/60 text-zinc-400 border-b border-zinc-800 font-mono text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Invoice #</th>
                <th className="px-6 py-3.5">Subscriber</th>
                <th className="px-6 py-3.5">Billing Period</th>
                <th className="px-6 py-3.5">Amount</th>
                <th className="px-6 py-3.5">Payment Status</th>
                <th className="px-6 py-3.5">Due Date</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">
                    Loading invoices...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">
                    No invoices found. Click <strong>&quot;Generate Invoices&quot;</strong> to run the monthly billing engine.
                  </td>
                </tr>
              ) : (
                invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-zinc-800/40 transition">
                    <td className="px-6 py-4 font-mono font-bold text-zinc-200">
                      <span className="bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                        {inv.invoice_number}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-zinc-200">
                        {inv.customer?.user
                          ? `${inv.customer.user.first_name} ${inv.customer.user.last_name || ""}`
                          : "Subscriber"}
                      </div>
                      <div className="flex items-center space-x-2 mt-0.5">
                        <span className="text-[11px] text-zinc-500 font-mono">
                          {inv.customer?.customer_code} • {inv.service_account?.username || "PPPoE"}
                        </span>
                        <span
                          className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                            inv.service_account?.status === "ACTIVE"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          <span>Line: {inv.service_account?.status || "ACTIVE"}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-zinc-400 font-mono">
                      {new Date(inv.billing_period_start).toLocaleDateString()} -{" "}
                      {new Date(inv.billing_period_end).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-zinc-100">
                      ৳ {Number(inv.total_payable).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      {inv.status === "PAID" ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>PAID</span>
                        </span>
                      ) : inv.status === "OVERDUE" ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <AlertTriangle className="w-3 h-3" />
                          <span>OVERDUE</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <Clock className="w-3 h-3" />
                          <span>UNPAID</span>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-zinc-400 font-mono">
                      {new Date(inv.due_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {inv.status === "UNPAID" && (
                          <a
                            href={`/customer/pay`}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-semibold transition"
                          >
                            Pay via bKash
                          </a>
                        )}
                        <button
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setExpireModalOpen(true);
                          }}
                          title="Simulate service expiration to test Promise to Pay unblock"
                          className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-[11px] font-medium transition flex items-center space-x-1"
                        >
                          <ShieldAlert className="w-3 h-3 text-rose-400" />
                          <span>Expire Acct</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* GENERATE INVOICES MODAL */}
      {generateModalOpen && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-zinc-100">Run Monthly Billing Engine</h3>
              </div>
              <button
                onClick={() => setGenerateModalOpen(false)}
                className="p-1 text-zinc-500 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Generates 1st-of-the-month calendar cycle invoices for all active subscribers with automatic mid-month
              pro-rata calculation.
            </p>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Target Billing Month</label>
              <input
                type="month"
                value={targetMonth}
                onChange={e => setTargetMonth(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {generateMsg && (
              <div className="p-3 bg-indigo-950/50 border border-indigo-800 rounded-xl text-xs text-indigo-300">
                {generateMsg}
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setGenerateModalOpen(false)}
                className="px-4 py-2 text-xs text-zinc-400 hover:text-zinc-100"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateInvoices}
                disabled={generating}
                className="px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition disabled:opacity-50 flex items-center space-x-1.5"
              >
                {generating ? <span>Generating...</span> : <span>Generate Invoices Now</span>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXPIRE ACCOUNT MODAL (FOR TESTING PROMISE TO PAY) */}
      {expireModalOpen && selectedInvoice && (
        <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-rose-400" />
                <h3 className="text-sm font-bold text-zinc-100">Artificially Expire Account (Test Mode)</h3>
              </div>
              <button
                onClick={() => setExpireModalOpen(false)}
                className="p-1 text-zinc-500 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              This action changes subscriber <strong>{selectedInvoice.customer?.customer_code}</strong> status to{" "}
              <span className="text-rose-400 font-mono font-bold">EXPIRED</span> with yesterday&apos;s expiry date.
            </p>
            <p className="text-xs text-zinc-500">
              Then navigate to the <strong>Customer Portal (/customer/dashboard)</strong> to test the self-service{" "}
              <strong>&quot;48-Hour Promise to Pay&quot;</strong> emergency unblock feature.
            </p>

            {expireMsg && (
              <div className="p-3 bg-emerald-950/50 border border-emerald-800 rounded-xl text-xs text-emerald-300">
                {expireMsg}
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setExpireModalOpen(false)}
                className="px-4 py-2 text-xs text-zinc-400 hover:text-zinc-100"
              >
                Cancel
              </button>
              <button
                onClick={() => handleExpireAccount(selectedInvoice.customer_id)}
                disabled={expireLoading}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-xl transition disabled:opacity-50"
              >
                {expireLoading ? "Expiring..." : "Confirm Expire Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
