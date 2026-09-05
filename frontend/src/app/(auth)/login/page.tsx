"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  Network, 
  Lock, 
  User as UserIcon, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  ArrowRight, 
  CheckCircle2, 
  KeyRound
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"error" | "success">("error");

  const { login, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const explicitRedirect = searchParams.get("redirect");

  const getTargetUrl = useCallback((role?: string) => {
    if (explicitRedirect) {
      const roleAllowed =
        (role === "SUPER_ADMIN" || role === "SUPPORT") &&
          (explicitRedirect.startsWith("/admin") || explicitRedirect.startsWith("/support")) ||
        (role === "RESELLER" || role === "SUB_RESELLER") && explicitRedirect.startsWith("/reseller") ||
        role === "CUSTOMER" && explicitRedirect.startsWith("/customer") ||
        role === "FIELD_TECH" && explicitRedirect.startsWith("/field");
      if (roleAllowed) return explicitRedirect;
    }
    if (role === "RESELLER" || role === "SUB_RESELLER") return "/reseller/dashboard";
    if (role === "CUSTOMER") return "/customer/dashboard";
    if (role === "FIELD_TECH") return "/field/dashboard";
    if (role === "SUPPORT") return "/support";
    return "/admin/dashboard";
  }, [explicitRedirect]);

  // If already logged in, redirect
  useEffect(() => {
    if (user) {
      router.push(getTargetUrl(user.role));
    }
  }, [user, router, getTargetUrl]);

  // Toast auto-dismiss
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const showToast = (message: string, type: "error" | "success" = "error") => {
    setToastMessage(message);
    setToastType(type);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setToastMessage(null);

    if (!username.trim()) {
      const msg = "Please enter your username";
      setError(msg);
      showToast(msg, "error");
      return;
    }

    if (!password) {
      const msg = "Please enter your password";
      setError(msg);
      showToast(msg, "error");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await login(username.trim(), password);
      if (result.success) {
        showToast("Authentication successful! Redirecting...", "success");
        setTimeout(() => {
          const stored = typeof window !== "undefined" ? localStorage.getItem("maxzone_user") : null;
          let role = undefined;
          if (stored) {
            try {
              role = JSON.parse(stored)?.role;
            } catch {
              // ignore
            }
          }
          router.push(getTargetUrl(role));
        }, 500);
      } else {
        const errorMsg = result.error || "Invalid username or password";
        setError(errorMsg);
        showToast(errorMsg, "error");
      }
    } catch {
      const errorMsg = "An unexpected error occurred. Please try again.";
      setError(errorMsg);
      showToast(errorMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickFill = () => {
    setUsername("admin");
    setPassword("Maxzone@2026");
    setError(null);
  };

  const handleQuickFillReseller = () => {
    setUsername("reseller_demo");
    setPassword("Pass@123");
    setError(null);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-center items-center p-4 relative overflow-hidden selection:bg-emerald-500 selection:text-zinc-950">
      {/* Background Ambience */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div 
          role="alert"
          className={`fixed top-6 right-6 z-50 flex items-center space-x-3 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${
            toastType === "error"
              ? "bg-rose-950/90 border-rose-800 text-rose-200 shadow-rose-950/30"
              : "bg-emerald-950/90 border-emerald-800 text-emerald-200 shadow-emerald-950/30"
          }`}
        >
          {toastType === "error" ? (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          )}
          <span className="text-sm font-medium">{toastMessage}</span>
          <button 
            onClick={() => setToastMessage(null)}
            className="text-xs opacity-60 hover:opacity-100 ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Login Card */}
      <div className="w-full max-w-md relative z-10">
        <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-8 shadow-2xl backdrop-blur-xl">
          {/* Logo & Header */}
          <div className="text-center space-y-3 mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-lg shadow-emerald-500/20 mb-1">
              <Network className="w-8 h-8 text-zinc-950 font-black" />
            </div>
            <div>
              <div className="flex items-center justify-center space-x-2">
                <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-emerald-400 via-teal-200 to-white bg-clip-text text-transparent">
                  MAXZONE
                </h1>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400">
                  ISP-ERP
                </span>
              </div>
              <p className="text-sm text-zinc-400 mt-1">
                Enterprise Network Control & Billing Portal
              </p>
            </div>
          </div>

          {/* Inline Error Alert */}
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="leading-snug">
                <span className="font-semibold block">Authentication Error</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div className="space-y-1.5">
              <label 
                htmlFor="username" 
                className="block text-xs font-medium text-zinc-300 uppercase tracking-wider"
              >
                Username or Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-950/70 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all font-mono"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label 
                  htmlFor="password" 
                  className="block text-xs font-medium text-zinc-300 uppercase tracking-wider"
                >
                  Password
                </label>
                <span className="text-xs text-zinc-500">Min. 6 chars</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-11 py-2.5 bg-zinc-950/70 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-bold rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Super Admin Shell</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Fill Helper */}
          <div className="mt-6 pt-5 border-t border-zinc-800/80">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
              <span className="flex items-center space-x-1.5 text-zinc-400 font-medium">
                <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                <span>Default Super Admin Credentials</span>
              </span>
              <button
                type="button"
                onClick={handleQuickFill}
                className="text-emerald-400 hover:text-emerald-300 font-medium hover:underline text-xs"
              >
                Auto Fill
              </button>
            </div>
            {/* Reseller Demo Credentials */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-1.5">
                <span className="flex items-center space-x-1.5 text-zinc-400 font-medium">
                  <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Phase 5 Reseller Credentials</span>
                </span>
                <button
                  type="button"
                  onClick={handleQuickFillReseller}
                  className="text-cyan-400 hover:text-cyan-300 font-medium hover:underline text-xs"
                >
                  Auto Fill
                </button>
              </div>
              <div
                onClick={handleQuickFillReseller}
                className="cursor-pointer p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800 hover:border-cyan-500/40 transition-colors flex items-center justify-between font-mono text-xs text-zinc-300"
              >
                <div>
                  <span className="text-zinc-500">user:</span> <span className="text-cyan-300">reseller_demo</span>
                  <span className="text-zinc-600 mx-2">|</span>
                  <span className="text-zinc-500">pass:</span> <span className="text-cyan-300">Pass@123</span>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  Click to Use
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="mt-6 text-center space-y-2">
          <Link
            href="/"
            className="text-xs text-zinc-400 hover:text-emerald-400 transition-colors inline-flex items-center space-x-1"
          >
            <span>← Back to System Diagnostics Overview</span>
          </Link>
          <p className="text-[11px] text-zinc-600">
            Maxzone ISP-ERP &copy; 2026. Microservices & High-Speed AAA Automation.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-mono text-zinc-400">Loading Login...</span>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
