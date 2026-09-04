"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  X,
  Smartphone,
  Check,
} from "lucide-react";
import api from "@/lib/api";
import { CustomerPortalOverview, ApiResponse, Invoice, Payment } from "@/types";

export default function CustomerPayPage() {
  const [data, setData] = useState<CustomerPortalOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Modal states
  const [bkashModalOpen, setBkashModalOpen] = useState(false);
  const [nagadModalOpen, setNagadModalOpen] = useState(false);

  // bKash flow states
  const [bkashStep, setBkashStep] = useState<"phone" | "otp" | "pin">("phone");
  const [bkashPhone, setBkashPhone] = useState("01711223344");
  const [bkashOtp, setBkashOtp] = useState("123456");
  const [bkashPin, setBkashPin] = useState("12345");
  const [bkashPaymentId, setBkashPaymentId] = useState<string | null>(null);
  const [bkashLoading, setBkashLoading] = useState(false);

  // Nagad flow states
  // Nagad flow states (nagadStep managed implicitly via modal open state)
  const [nagadPhone, setNagadPhone] = useState("01711223344");
  const [nagadPin, setNagadPin] = useState("1234");
  const [nagadRefId, setNagadRefId] = useState<string | null>(null);
  const [nagadLoading, setNagadLoading] = useState(false);

  // Success state
  const [paymentSuccess, setPaymentSuccess] = useState<Payment | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<ApiResponse<CustomerPortalOverview>>("/billing/customer/overview");
      if (res.data?.success && res.data.data) {
        setData(res.data.data);
        if (res.data.data.unpaid_invoices.length > 0) {
          setSelectedInvoice(res.data.data.unpaid_invoices[0]);
        } else if (res.data.data.latest_invoice) {
          setSelectedInvoice(res.data.data.latest_invoice);
        }
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

  // bKash start
  const handleStartBkash = async () => {
    if (!selectedInvoice) return;
    setBkashLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.post<ApiResponse<{ payment_id: string }>>("/billing/pay/bkash/create", {
        invoice_id: selectedInvoice.id,
      });
      if (res.data?.success && res.data.data) {
        setBkashPaymentId(res.data.data.payment_id);
        setBkashStep("phone");
        setBkashModalOpen(true);
      } else {
        setErrorMsg(res.data?.error?.message || "Failed to initiate bKash checkout");
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setErrorMsg(e.response?.data?.error?.message || "Network error contacting bKash gateway");
    } finally {
      setBkashLoading(false);
    }
  };

  // bKash confirm & execute
  const handleConfirmBkash = async () => {
    if (!bkashPaymentId) return;
    setBkashLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.post<ApiResponse<Payment>>("/billing/pay/bkash/execute", {
        payment_id: bkashPaymentId,
        otp: bkashOtp,
        pin: bkashPin,
      });
      if (res.data?.success && res.data.data) {
        setPaymentSuccess(res.data.data);
        setBkashModalOpen(false);
        fetchOverview();
      } else {
        setErrorMsg(res.data?.error?.message || "bKash payment authorization failed");
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setErrorMsg(e.response?.data?.error?.message || "Payment execution failed");
    } finally {
      setBkashLoading(false);
    }
  };

  // Nagad start
  const handleStartNagad = async () => {
    if (!selectedInvoice) return;
    setNagadLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.post<ApiResponse<{ payment_ref_id: string }>>("/billing/pay/nagad/initialize", {
        invoice_id: selectedInvoice.id,
      });
      if (res.data?.success && res.data.data) {
        setNagadRefId(res.data.data.payment_ref_id);
        setNagadModalOpen(true);
      } else {
        setErrorMsg(res.data?.error?.message || "Failed to initialize Nagad payment");
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setErrorMsg(e.response?.data?.error?.message || "Network error contacting Nagad gateway");
    } finally {
      setNagadLoading(false);
    }
  };

  // Nagad confirm & verify
  const handleConfirmNagad = async () => {
    if (!nagadRefId) return;
    setNagadLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.post<ApiResponse<Payment>>("/billing/pay/nagad/verify", {
        payment_ref_id: nagadRefId,
        pin: nagadPin,
      });
      if (res.data?.success && res.data.data) {
        setPaymentSuccess(res.data.data);
        setNagadModalOpen(false);
        fetchOverview();
      } else {
        setErrorMsg(res.data?.error?.message || "Nagad verification failed");
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setErrorMsg(e.response?.data?.error?.message || "Nagad payment processing failed");
    } finally {
      setNagadLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-zinc-500">
        Loading payment gateway...
      </div>
    );
  }

  const invoiceAmount = selectedInvoice ? Number(selectedInvoice.total_payable) : 1000.0;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back button */}
      <Link
        href="/customer/dashboard"
        className="inline-flex items-center space-x-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Subscriber Overview</span>
      </Link>

      {/* Payment Success Toast / Card */}
      {paymentSuccess && (
        <div className="p-6 bg-gradient-to-r from-emerald-950/80 to-zinc-900 border border-emerald-500/50 rounded-2xl space-y-3 shadow-2xl">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-emerald-300">
                Payment Successful! Connection Active
              </h3>
              <p className="text-xs text-zinc-300">
                Transaction ID: <strong className="font-mono text-emerald-400">{paymentSuccess.gateway_transaction_id}</strong>
              </p>
            </div>
          </div>
          <p className="text-xs text-zinc-400">
            Your payment of <strong>৳ {Number(paymentSuccess.amount).toFixed(2)}</strong> via{" "}
            <strong>{paymentSuccess.payment_method}</strong> was captured. FreeRADIUS credentials and MikroTik speed profiles
            have been automatically refreshed in real time.
          </p>
          <div className="pt-2">
            <Link
              href="/customer/dashboard"
              className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition inline-block"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-950/60 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Invoice Details Card */}
      <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div>
            <span className="text-[11px] text-zinc-500 uppercase tracking-wider block">Invoice Checkout</span>
            <h2 className="text-lg font-bold text-zinc-100 mt-0.5">
              {selectedInvoice ? selectedInvoice.invoice_number : "INV-202609-0001"}
            </h2>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${
              selectedInvoice?.status === "PAID"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
            }`}
          >
            {selectedInvoice?.status || "UNPAID"}
          </span>
        </div>

        <div className="space-y-3 text-xs font-mono">
          <div className="flex justify-between text-zinc-400">
            <span>Subscriber Profile:</span>
            <span className="text-zinc-200">{data?.customer.customer_code} (karim_fiber)</span>
          </div>
          <div className="flex justify-between text-zinc-400">
            <span>Package Subscription:</span>
            <span className="text-indigo-400 font-bold">{data?.package.name} ({data?.package.rate_limit_string})</span>
          </div>
          <div className="flex justify-between text-zinc-400">
            <span>Billing Period:</span>
            <span className="text-zinc-200">
              {selectedInvoice ? new Date(selectedInvoice.billing_period_start).toLocaleDateString() : "01/09/2026"} -{" "}
              {selectedInvoice ? new Date(selectedInvoice.billing_period_end).toLocaleDateString() : "30/09/2026"}
            </span>
          </div>
          <div className="flex justify-between text-zinc-400">
            <span>Due Date:</span>
            <span className="text-amber-400">
              {selectedInvoice ? new Date(selectedInvoice.due_date).toLocaleDateString() : "10/09/2026"}
            </span>
          </div>
          <div className="flex justify-between pt-3 border-t border-zinc-800 text-sm font-sans">
            <span className="font-bold text-zinc-200">Total Payable Amount:</span>
            <span className="font-bold font-mono text-lg text-emerald-400">৳ {invoiceAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Payment Gateway Selector */}
      {selectedInvoice?.status !== "PAID" ? (
        <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4">
          <div>
            <h3 className="text-sm font-bold text-zinc-100">Select Instant Payment Gateway</h3>
            <p className="text-xs text-zinc-500">
              Payments are verified in real time and automatically trigger MikroTik CoA session unblock
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* bKash Option */}
            <button
              onClick={handleStartBkash}
              disabled={bkashLoading}
              className="p-4 bg-zinc-950 border border-zinc-800 hover:border-[#e2136e] rounded-xl text-left transition space-y-2 group relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#e2136e] group-hover:underline">bKash Checkout</span>
                <span className="px-2 py-0.5 text-[10px] font-mono bg-[#e2136e]/10 text-[#e2136e] rounded font-bold">
                  SIMULATOR
                </span>
              </div>
              <p className="text-xs text-zinc-400">Tokenized Checkout API with automated OTP / PIN simulation</p>
            </button>

            {/* Nagad Option */}
            <button
              onClick={handleStartNagad}
              disabled={nagadLoading}
              className="p-4 bg-zinc-950 border border-zinc-800 hover:border-[#f7941d] rounded-xl text-left transition space-y-2 group relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#f7941d] group-hover:underline">Nagad Merchant</span>
                <span className="px-2 py-0.5 text-[10px] font-mono bg-[#f7941d]/10 text-[#f7941d] rounded font-bold">
                  SIMULATOR
                </span>
              </div>
              <p className="text-xs text-zinc-400">Direct encrypted merchant payment with callback reconciliation</p>
            </button>
          </div>
        </div>
      ) : (
        <div className="p-6 bg-emerald-950/30 border border-emerald-800 rounded-2xl text-center space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
          <h3 className="text-sm font-bold text-emerald-300">This invoice is settled in full</h3>
          <p className="text-xs text-zinc-400">No additional payments required for this billing cycle.</p>
        </div>
      )}

      {/* ============================================================ */}
      {/* BKASH SANDBOX SIMULATOR MODAL */}
      {/* ============================================================ */}
      {bkashModalOpen && (
        <div className="fixed inset-0 bg-zinc-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#e2136e] rounded-3xl shadow-2xl overflow-hidden text-white animate-in fade-in duration-200">
            {/* bKash Header */}
            <div className="p-6 bg-[#d11065] flex items-center justify-between">
              <div>
                <span className="text-xs uppercase tracking-widest font-black opacity-80 block">bKash PAYMENT</span>
                <h3 className="text-lg font-black">MAXZONE ISP</h3>
              </div>
              <button
                onClick={() => setBkashModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Amount Banner */}
            <div className="px-6 py-4 bg-white text-zinc-900 flex items-center justify-between border-b border-zinc-200">
              <span className="text-xs text-zinc-500 font-semibold">Payment Amount:</span>
              <span className="text-lg font-black font-mono text-[#e2136e]">৳ {invoiceAmount.toFixed(2)}</span>
            </div>

            {/* Simulator Interactive Body */}
            <div className="p-6 space-y-4 bg-zinc-900 text-zinc-100">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[11px] text-amber-300">
                ⚡ <strong>Sandbox Mode:</strong> Use test OTP <code className="font-mono bg-zinc-800 px-1 py-0.5 rounded">123456</code> and PIN <code className="font-mono bg-zinc-800 px-1 py-0.5 rounded">12345</code> to confirm.
              </div>

              {bkashStep === "phone" && (
                <div className="space-y-3">
                  <label className="block text-xs text-zinc-400 font-medium">Your bKash Account Number</label>
                  <div className="relative">
                    <Smartphone className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={bkashPhone}
                      onChange={e => setBkashPhone(e.target.value)}
                      placeholder="017XXXXXXXX"
                      className="w-full pl-9 pr-3 py-2.5 bg-zinc-950 border border-zinc-700 rounded-xl text-sm font-mono text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[#e2136e]"
                    />
                  </div>
                  <button
                    onClick={() => setBkashStep("otp")}
                    className="w-full py-2.5 bg-[#e2136e] hover:bg-[#c2105e] font-bold text-xs text-white rounded-xl transition mt-2"
                  >
                    Confirm & Send OTP
                  </button>
                </div>
              )}

              {bkashStep === "otp" && (
                <div className="space-y-3">
                  <label className="block text-xs text-zinc-400 font-medium">Enter 6-Digit bKash Verification Code</label>
                  <input
                    type="text"
                    value={bkashOtp}
                    onChange={e => setBkashOtp(e.target.value)}
                    placeholder="123456"
                    className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-700 rounded-xl text-center text-lg tracking-widest font-mono text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[#e2136e]"
                  />
                  <button
                    onClick={() => setBkashStep("pin")}
                    className="w-full py-2.5 bg-[#e2136e] hover:bg-[#c2105e] font-bold text-xs text-white rounded-xl transition"
                  >
                    Verify Code
                  </button>
                </div>
              )}

              {bkashStep === "pin" && (
                <div className="space-y-3">
                  <label className="block text-xs text-zinc-400 font-medium">Enter 5-Digit bKash PIN</label>
                  <input
                    type="password"
                    maxLength={5}
                    value={bkashPin}
                    onChange={e => setBkashPin(e.target.value)}
                    placeholder="•••••"
                    className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-700 rounded-xl text-center text-lg tracking-widest font-mono text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[#e2136e]"
                  />
                  <button
                    onClick={handleConfirmBkash}
                    disabled={bkashLoading}
                    className="w-full py-3 bg-[#e2136e] hover:bg-[#c2105e] font-black text-xs uppercase tracking-wider text-white rounded-xl transition flex items-center justify-center space-x-2 shadow-lg shadow-[#e2136e]/30 disabled:opacity-50"
                  >
                    {bkashLoading ? (
                      <span>Executing Payment...</span>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Confirm Sandbox Payment</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* NAGAD SANDBOX SIMULATOR MODAL */}
      {/* ============================================================ */}
      {nagadModalOpen && (
        <div className="fixed inset-0 bg-zinc-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#f7941d] rounded-3xl shadow-2xl overflow-hidden text-white animate-in fade-in duration-200">
            {/* Nagad Header */}
            <div className="p-6 bg-[#e07f10] flex items-center justify-between">
              <div>
                <span className="text-xs uppercase tracking-widest font-black opacity-80 block">NAGAD PAYMENT</span>
                <h3 className="text-lg font-black">MAXZONE BROADBAND</h3>
              </div>
              <button
                onClick={() => setNagadModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Amount Banner */}
            <div className="px-6 py-4 bg-white text-zinc-900 flex items-center justify-between border-b border-zinc-200">
              <span className="text-xs text-zinc-500 font-semibold">Payable:</span>
              <span className="text-lg font-black font-mono text-[#f7941d]">৳ {invoiceAmount.toFixed(2)}</span>
            </div>

            {/* Nagad Body */}
            <div className="p-6 space-y-4 bg-zinc-900 text-zinc-100">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[11px] text-amber-300">
                ⚡ <strong>Nagad Sandbox:</strong> Enter test PIN <code className="font-mono bg-zinc-800 px-1 py-0.5 rounded">1234</code> to confirm payment.
              </div>

              <div className="space-y-3">
                <label className="block text-xs text-zinc-400 font-medium">Nagad Account Number</label>
                <input
                  type="text"
                  value={nagadPhone}
                  onChange={e => setNagadPhone(e.target.value)}
                  className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-700 rounded-xl text-sm font-mono text-zinc-100"
                />
                <label className="block text-xs text-zinc-400 font-medium">Account PIN</label>
                <input
                  type="password"
                  value={nagadPin}
                  onChange={e => setNagadPin(e.target.value)}
                  placeholder="••••"
                  className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-700 rounded-xl text-center text-lg tracking-widest font-mono text-zinc-100"
                />
                <button
                  onClick={handleConfirmNagad}
                  disabled={nagadLoading}
                  className="w-full py-3 bg-[#f7941d] hover:bg-[#df7d0e] font-black text-xs uppercase tracking-wider text-white rounded-xl transition flex items-center justify-center space-x-2 shadow-lg shadow-[#f7941d]/30 disabled:opacity-50 mt-2"
                >
                  {nagadLoading ? "Processing..." : "Confirm Nagad Payment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
