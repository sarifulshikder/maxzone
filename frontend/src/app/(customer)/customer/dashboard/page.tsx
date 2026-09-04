"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Package as PackageIcon,
  AlertTriangle,
  Timer,
  ArrowRight,
} from "lucide-react";
import api from "@/lib/api";
import { CustomerPortalOverview, ApiResponse } from "@/types";

export default function CustomerDashboardPage() {
  const [data, setData] = useState<CustomerPortalOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [promiseLoading, setPromiseLoading] = useState(false);
  const [promiseSuccess, setPromiseSuccess] = useState<string | null>(null);
  const [promiseError, setPromiseError] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<ApiResponse<CustomerPortalOverview>>("/billing/customer/overview");
      if (res.data?.success && res.data.data) {
        setData(res.data.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const handleRequestPromise = async () => {
    setPromiseLoading(true);
    setPromiseSuccess(null);
    setPromiseError(null);
    try {
      const res = await api.post<ApiResponse<{ status: string; expires_at: string }>>("/billing/promise-to-pay", {
        customer_id: data?.customer.id,
      });
      if (res.data?.success) {
        setPromiseSuccess("🎉 Emergency 48-Hour Unblock Activated! Your connection is restored immediately.");
        fetchOverview();
      } else {
        setPromiseError(res.data?.error?.message || "Failed to request Promise to Pay");
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setPromiseError(e.response?.data?.error?.message || "Network error requesting emergency unblock");
    } finally {
      setPromiseLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-zinc-500 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span>Loading subscriber dashboard...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-20 text-center text-xs text-zinc-500">
        No subscriber profile found. Please create a customer first from the Admin Shell.
      </div>
    );
  }

  const { customer, service_account, package: pkg, active_promise, unpaid_invoices, recent_payments } = data;
  const isExpired = service_account.status === "EXPIRED";
  const isGrace = service_account.status === "GRACE";

  return (
    <div className="space-y-6">
      {/* Promise to Pay Active Banner / Countdown */}
      {active_promise && (
        <div className="p-4 bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-emerald-500/10 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Timer className="w-5 h-5 text-amber-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  Emergency 48-Hour Unblock Active
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 font-bold">
                  PROMISE-TO-PAY
                </span>
              </div>
              <p className="text-xs text-zinc-300 mt-0.5">
                Service unblocked until:{" "}
                <strong className="text-white font-mono">
                  {new Date(active_promise.expires_at).toLocaleString()}
                </strong>
                . Please settle your bill to avoid automatic termination.
              </p>
            </div>
          </div>
          <Link
            href="/customer/pay"
            className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition shrink-0 text-center"
          >
            Pay Bill Now
          </Link>
        </div>
      )}

      {/* Disconnection / Warning Alert Banner */}
      {(isExpired || isGrace) && !active_promise && (
        <div className="p-5 bg-gradient-to-r from-rose-950/60 to-zinc-900 border border-rose-800/80 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-rose-300">
                {isExpired ? "Service Expired / Suspended" : "Payment Due: Grace Period Warning"}
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Your internet subscription has reached its expiry date. Pay instantly with bKash/Nagad or request a
                complimentary 48-hour emergency unblock.
              </p>
              {promiseSuccess && (
                <p className="text-xs text-emerald-400 font-bold mt-2">{promiseSuccess}</p>
              )}
              {promiseError && (
                <p className="text-xs text-rose-400 font-bold mt-2">{promiseError}</p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={handleRequestPromise}
              disabled={promiseLoading}
              className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-xl transition shadow-lg shadow-amber-600/20 disabled:opacity-50"
            >
              {promiseLoading ? "Unblocking..." : "Request 48-Hour Promise to Pay"}
            </button>
            <Link
              href="/customer/pay"
              className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition"
            >
              Pay Now
            </Link>
          </div>
        </div>
      )}

      {/* Main Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Plan Overview Card */}
        <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4 md:col-span-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Active Subscription</span>
            <span
              className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                service_account.status === "ACTIVE"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              <span>{service_account.status}</span>
            </span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <PackageIcon className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-lg font-black text-zinc-100">{pkg.name}</h2>
                <div className="flex items-center space-x-2 text-xs text-zinc-400 font-mono mt-0.5">
                  <span className="text-indigo-400 font-bold">{pkg.rate_limit_string}</span>
                  <span>•</span>
                  <span>{service_account.service_type}</span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-2xl font-bold font-mono text-zinc-100">৳ {pkg.price}</div>
              <span className="text-[11px] text-zinc-500">Per Month</span>
            </div>
          </div>

          {/* Progress / Expiry Details */}
          <div className="pt-3 border-t border-zinc-800/80 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-zinc-500 block text-[11px]">PPPoE Username</span>
              <span className="font-mono text-zinc-200 font-semibold">{service_account.username}</span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[11px]">Expires At</span>
              <span className="font-mono text-zinc-200 font-semibold">
                {new Date(service_account.expires_at).toLocaleDateString()}
              </span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[11px]">Subscriber Code</span>
              <span className="font-mono text-emerald-400 font-semibold">{customer.customer_code}</span>
            </div>
          </div>
        </div>

        {/* Quick Payment Action Card */}
        <div className="p-6 bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl flex flex-col justify-between space-y-4">
          <div>
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider block">Billing Balance</span>
            <div className="text-3xl font-black text-zinc-100 font-mono mt-2">
              ৳ {unpaid_invoices.reduce((acc, i) => acc + Number(i.total_payable), 0).toFixed(2)}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              {unpaid_invoices.length > 0
                ? `${unpaid_invoices.length} unpaid bill pending payment`
                : "No pending dues. All invoices paid!"}
            </p>
          </div>

          <div className="space-y-2">
            <Link
              href="/customer/pay"
              className="w-full py-2.5 px-4 text-xs font-bold bg-[#e2136e] hover:bg-[#c2105e] text-white rounded-xl transition flex items-center justify-center space-x-2 shadow-lg shadow-[#e2136e]/20"
            >
              <span>Instant Pay with bKash</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            {!active_promise && (
              <button
                onClick={handleRequestPromise}
                disabled={promiseLoading}
                className="w-full py-2 px-3 text-xs font-medium text-amber-400 hover:text-amber-300 hover:bg-amber-950/30 border border-amber-800/40 rounded-xl transition"
              >
                Request Promise to Pay (48h)
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Unpaid Invoices Table */}
      {unpaid_invoices.length > 0 && (
        <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-100">Unpaid Invoices</h3>
            <span className="text-xs text-amber-400 font-mono">Immediate Action Recommended</span>
          </div>

          <div className="divide-y divide-zinc-800 border border-zinc-800 rounded-xl overflow-hidden">
            {unpaid_invoices.map(inv => (
              <div
                key={inv.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-zinc-950/40 hover:bg-zinc-800/40 transition"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-zinc-200">{inv.invoice_number}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      UNPAID
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 font-mono">
                    Due by: {new Date(inv.due_date).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center space-x-4">
                  <span className="text-base font-bold text-zinc-100 font-mono">
                    ৳ {Number(inv.total_payable).toFixed(2)}
                  </span>
                  <Link
                    href={`/customer/pay`}
                    className="px-3.5 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition"
                  >
                    Pay Invoice
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Payments Ledger */}
      <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4">
        <h3 className="text-sm font-bold text-zinc-100">Recent Payment Transactions</h3>
        {recent_payments.length === 0 ? (
          <p className="text-xs text-zinc-500 py-4 text-center">No payment history recorded yet.</p>
        ) : (
          <div className="divide-y divide-zinc-800 border border-zinc-800 rounded-xl overflow-hidden">
            {recent_payments.map(p => (
              <div key={p.id} className="p-3.5 flex items-center justify-between text-xs font-mono">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-zinc-200 font-bold">{p.payment_method}</span>
                    <span className="text-zinc-500">{p.gateway_transaction_id || "Direct Pay"}</span>
                  </div>
                  <span className="text-[11px] text-zinc-500">
                    {new Date(p.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-emerald-400 font-bold">৳ {Number(p.amount).toFixed(2)}</span>
                  <span className="block text-[10px] text-emerald-500/80">{p.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
