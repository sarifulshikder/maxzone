"use client";

import React, { useState } from "react";
import {
  Wifi,
  KeyRound,
  MessageSquareText,
  ShieldCheck,
  RefreshCcw,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Database,
  BadgeCheck,
  Smartphone,
  Globe,
} from "lucide-react";
import api from "@/lib/api";
import { HotspotSession, HotspotOTPResponse, ApiResponse } from "@/types";

type Tab = "VOUCHER" | "OTP";

export default function HotspotPage() {
  const [tab, setTab] = useState<Tab>("VOUCHER");
  const [session, setSession] = useState<HotspotSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-4 relative overflow-hidden selection:bg-emerald-500 selection:text-zinc-950">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative z-10">
        {/* Brand */}
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-lg shadow-emerald-500/20">
            <Wifi className="w-7 h-7 text-zinc-950" />
          </div>
          <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-emerald-400 via-teal-200 to-white bg-clip-text text-transparent">
            MAXZONE WiFi Hotspot
          </h1>
          <p className="text-xs text-zinc-500">Captive Portal — enter your voucher PIN or SMS OTP to get online</p>
        </div>

        {session ? (
          <SessionSuccess session={session} onReset={() => setSession(null)} />
        ) : (
          <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl shadow-2xl backdrop-blur-xl p-6">
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Tabs */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-zinc-950/70 border border-zinc-800 rounded-xl mb-5">
              {(["VOUCHER", "OTP"] as Tab[]).map(t => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setError(null); }}
                  className={`flex items-center justify-center space-x-1.5 py-2 rounded-lg text-[11px] font-semibold transition-colors ${
                    tab === t ? "bg-emerald-500 text-zinc-950" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {t === "VOUCHER" ? <KeyRound className="w-3.5 h-3.5" /> : <MessageSquareText className="w-3.5 h-3.5" />}
                  <span>{t === "VOUCHER" ? "Voucher PIN" : "SMS OTP"}</span>
                </button>
              ))}
            </div>

            {tab === "VOUCHER" ? (
              <VoucherLogin onSuccess={s => setSession(s)} onError={setError} />
            ) : (
              <Otplogin onSuccess={s => setSession(s)} onError={setError} />
            )}

            <div className="mt-5 pt-4 border-t border-zinc-800/80 flex items-center justify-center space-x-2 text-[10px] text-zinc-600">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Free WiFi demo — production portal triggers RADIUS/CoA</span>
            </div>
          </div>
        )}

        <p className="mt-5 text-center text-[10px] font-mono text-zinc-700">SIMULATED CAPTIVE PORTAL • PHASE 8</p>
      </div>
    </div>
  );
}

/* ============================================================ */
/* Voucher PIN                                                  */
/* ============================================================ */
function VoucherLogin({ onSuccess, onError }: { onSuccess: (s: HotspotSession) => void; onError: (e: string) => void }) {
  const [pin, setPin] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) { onError("Please enter your voucher PIN"); return; }
    if (!phone.trim()) { onError("Phone number is required to activate the voucher"); return; }
    setSubmitting(true);
    onError("");
    try {
      const res = await api.post<ApiResponse<HotspotSession>>("/hotspot/voucher/login", { pin, phone });
      if (res.data?.success && res.data.data) {
        onSuccess(res.data.data);
      } else {
        onError(res.data?.error?.message || "Invalid voucher PIN");
      }
    } catch {
      onError("Voucher invalid or network error — try again");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-1.5" htmlFor="vpin">Voucher PIN</label>
        <input
          id="vpin"
          value={pin}
          onChange={e => setPin(e.target.value.toUpperCase())}
          placeholder="MAXZ-8899"
          autoFocus
          className="w-full px-3 py-3 bg-zinc-950/70 border border-zinc-800 rounded-xl text-center text-lg font-bold tracking-[0.3em] text-emerald-400 placeholder-zinc-700 placeholder:tracking-normal placeholder:font-normal placeholder:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-mono uppercase"
        />
      </div>
      <div>
        <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-1.5" htmlFor="vphone">Phone Number</label>
        <input
          id="vphone"
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="01XXXXXXXXX"
          className="w-full px-3 py-2.5 bg-zinc-950/70 border border-zinc-800 rounded-xl text-sm font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-bold rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
      >
        {submitting ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
        <span>{submitting ? "Connecting..." : "Connect to Internet"}</span>
      </button>
      <p className="text-center text-[10px] font-mono text-zinc-600 text-left">
        <span className="text-amber-400/80">Demo PIN:</span> <span className="text-amber-200">MAXZ-8899</span> — Popular Unlimited 15 Days (600 BDT)
      </p>
    </form>
  );
}

/* ============================================================ */
/* SMS OTP                                                      */
/* ============================================================ */
function Otplogin({ onSuccess, onError }: { onSuccess: (s: HotspotSession) => void; onError: (e: string) => void }) {
  const [step, setStep] = useState<"REQUEST" | "VERIFY">("REQUEST");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const request = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) { onError("Enter your phone number"); return; }
    setSubmitting(true);
    onError("");
    try {
      const res = await api.post<ApiResponse<HotspotOTPResponse>>("/hotspot/otp/request", { phone });
      if (res.data?.success && res.data.data) {
        setDevCode(res.data.data.dev_code); // simulated gateway echoes the code
        setStep("VERIFY");
      } else {
        onError(res.data?.error?.message || "Failed to send OTP");
      }
    } catch {
      onError("Network error while requesting OTP");
    } finally {
      setSubmitting(false);
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) { onError("Enter the OTP you received"); return; }
    setSubmitting(true);
    onError("");
    try {
      const res = await api.post<ApiResponse<HotspotSession>>("/hotspot/otp/verify", { phone, code });
      if (res.data?.success && res.data.data) {
        onSuccess(res.data.data);
      } else {
        onError(res.data?.error?.message || "Invalid or expired OTP");
      }
    } catch {
      onError("Invalid or expired OTP");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      {step === "REQUEST" ? (
        <form onSubmit={request} className="space-y-3">
          <div>
            <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-1.5" htmlFor="ophone">Phone Number</label>
            <input
              id="ophone"
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="01XXXXXXXXX"
              className="w-full px-3 py-2.5 bg-zinc-950/70 border border-zinc-800 rounded-xl text-sm font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-bold rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
          >
            {submitting ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
            <span>{submitting ? "Sending..." : "Send OTP via SMS"}</span>
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-3">
          <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-[11px] text-emerald-300/80 flex items-start space-x-2">
            <MessageSquareText className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>SMS gateway simulated — dev code for <b className="font-mono">{devCode}</b></span>
          </div>
          <div>
            <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-1.5" htmlFor="ocode">OTP Code</label>
            <input
              id="ocode"
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="••••••"
              maxLength={6}
              autoFocus
              className="w-full px-3 py-3 bg-zinc-950/70 border border-zinc-800 rounded-xl text-center text-lg font-bold tracking-[0.4em] text-emerald-400 placeholder-zinc-700 placeholder:tracking-normal placeholder:font-normal placeholder:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-bold rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
          >
            {submitting ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <BadgeCheck className="w-4 h-4" />}
            <span>{submitting ? "Verifying..." : "Verify & Connect"}</span>
          </button>
          <button type="button" onClick={() => setStep("REQUEST")} className="w-full text-center text-[10px] font-mono text-zinc-500 hover:text-zinc-300">
            ← Resend / change number
          </button>
        </form>
      )}
    </div>
  );
}

/* ============================================================ */
/* Success screen                                               */
/* ============================================================ */
function SessionSuccess({ session, onReset }: { session: HotspotSession; onReset: () => void }) {
  return (
    <div className="bg-zinc-900/90 border border-emerald-500/20 rounded-2xl p-6 shadow-2xl backdrop-blur-xl space-y-4 text-center">
      <div className="mx-auto w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
        <CheckCircle2 className="w-7 h-7 text-emerald-400" />
      </div>
      <div>
        <h2 className="text-lg font-black text-emerald-400">You&apos;re Online!</h2>
        <p className="text-[11px] text-zinc-500 mt-0.5">Internet session activated successfully</p>
      </div>

      <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-4 space-y-3 text-left">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-zinc-500 uppercase">Method</span>
          <span className="text-[11px] font-mono text-emerald-400">{session.method === "VOUCHER" ? "VOUCHER PIN" : "SMS OTP"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-zinc-500 uppercase">Plan</span>
          <span className="text-[11px] font-mono text-zinc-200">{session.plan_name}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-zinc-500 uppercase">Data</span>
          <span className="text-[11px] font-mono text-zinc-200">{session.data_limit}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-zinc-500 uppercase">Validity</span>
          <span className="text-[11px] font-mono text-zinc-200">{session.validity_days} days</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-zinc-500 uppercase">Session</span>
          <span className="text-[11px] font-mono text-emerald-400/70 truncate max-w-[160px]">{session.session_id}</span>
        </div>
        {session.phone && (
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Device</span>
            <span className="text-[11px] font-mono text-zinc-200">{session.phone}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between bg-emerald-500/5 border border-emerald-500/10 rounded-xl px-4 py-3 text-[10px] font-mono text-emerald-300/70">
        <span className="flex items-center space-x-1.5"><Clock3 className="w-3 h-3" /> Expires {new Date(session.expires_at).toLocaleString()}</span>
        <span className="flex items-center space-x-1.5"><Database className="w-3 h-3" /> RADIUS session</span>
      </div>

      <button
        onClick={onReset}
        className="w-full py-3 border border-zinc-700 hover:border-emerald-500/40 text-zinc-300 hover:text-emerald-400 rounded-xl text-xs font-semibold transition-colors"
      >
        Start Browsing →
      </button>
      <p className="text-[9px] font-mono text-zinc-600 leading-relaxed">{session.note}</p>
    </div>
  );
}