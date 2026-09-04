"use client";

import { useEffect, useState } from "react";
import { 
  Server, 
  Database, 
  Cpu, 
  Layers, 
  ShieldCheck, 
  Activity, 
  RefreshCw, 
  Sun, 
  Moon, 
  Terminal, 
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Network,
  Users,
  Wallet,
  Smartphone,
  Headphones,
  Wifi
} from "lucide-react";
import api from "@/lib/api";

interface HealthData {
  status: string;
  app_name: string;
  environment: string;
  version: string;
  database: string;
  redis: string;
  uptime_seconds: number;
  memory_alloc_mb: string;
  go_version: string;
}

export default function HomePage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDark, setIsDark] = useState<boolean>(true);
  const [lastChecked, setLastChecked] = useState<string>("");

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/health");
      if (res.data?.success) {
        setHealth(res.data.data);
      } else {
        setError("Unexpected response format from backend API");
      }
    } catch (err: unknown) {
      console.error(err);
      setError("Unable to connect to Go Backend API. Ensure the backend server is running.");
    } finally {
      setLoading(false);
      setLastChecked(new Date().toLocaleTimeString());
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    const root = document.documentElement;
    if (isDark) {
      root.classList.remove("dark");
      root.classList.add("light");
    } else {
      root.classList.remove("light");
      root.classList.add("dark");
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-200 ${isDark ? "bg-zinc-950 text-zinc-100" : "bg-zinc-50 text-zinc-900"}`}>
      {/* Top Navigation Bar */}
      <header className={`border-b ${isDark ? "border-zinc-800 bg-zinc-900/70" : "border-zinc-200 bg-white/70"} backdrop-blur-md sticky top-0 z-50`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Network className="w-6 h-6 text-zinc-950 font-bold" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">MAXZONE</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isDark ? "bg-emerald-950 text-emerald-400 border border-emerald-800" : "bg-emerald-100 text-emerald-800 border border-emerald-300"}`}>
                  ISP-ERP Core
                </span>
              </div>
              <p className="text-xs text-zinc-500 font-mono">Phase 0: Foundation Verified</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={fetchHealth}
              disabled={loading}
              className={`flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all ${
                isDark 
                  ? "bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-200" 
                  : "bg-zinc-100 border-zinc-300 hover:bg-zinc-200 text-zinc-700"
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-400" : ""}`} />
              <span>{loading ? "Checking..." : "Re-check Health"}</span>
            </button>

            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className={`p-2 rounded-lg border transition-colors ${
                isDark 
                  ? "bg-zinc-800 border-zinc-700 text-amber-400 hover:bg-zinc-700" 
                  : "bg-zinc-100 border-zinc-300 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Banner */}
        <div className={`p-8 rounded-2xl border relative overflow-hidden ${
          isDark 
            ? "bg-gradient-to-br from-zinc-900 via-zinc-900/60 to-zinc-950 border-zinc-800" 
            : "bg-gradient-to-br from-white via-zinc-50 to-zinc-100 border-zinc-200 shadow-sm"
        }`}>
          <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center space-x-2 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Phase 0 Initialized & Verified</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
              Enterprise ISP-ERP & Network Automation Engine
            </h1>
            <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
              Maxzone combines a high-concurrency, low-memory Go modular engine with Next.js 15 for complete ISP management: FreeRADIUS AAA, MikroTik RouterOS control, FTTH GIS optical mapping, and automated regional billing.
            </p>
            {lastChecked && (
              <p className="text-xs text-zinc-500 font-mono">
                System telemetry live as of {lastChecked}
              </p>
            )}
          </div>
        </div>

        {/* Live Diagnostics Card Grid */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center space-x-2">
              <Activity className="w-5 h-5 text-emerald-400" />
              <span>Live Infrastructure Health Diagnostics</span>
            </h2>
            <span className="text-xs font-mono text-zinc-500">Auto-refreshing every 10s</span>
          </div>

          {error && (
            <div className="p-4 rounded-xl border border-rose-800/50 bg-rose-950/30 text-rose-300 text-sm flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
              <div>
                <p className="font-semibold">Backend Connection Issue</p>
                <p className="text-xs text-rose-300/80 mt-1">{error}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Backend Engine */}
            <div className={`p-5 rounded-xl border transition-all ${
              isDark ? "bg-zinc-900/60 border-zinc-800" : "bg-white border-zinc-200 shadow-sm"
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <Cpu className="w-5 h-5" />
                </div>
                {health?.status === "UP" ? (
                  <span className="inline-flex items-center space-x-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>ONLINE</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    <AlertCircle className="w-3 h-3" />
                    <span>OFFLINE</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 font-medium">Backend Core Engine</p>
              <h3 className="text-lg font-bold mt-1 font-mono">{health?.go_version || "Go 1.25.0"}</h3>
              <div className="mt-3 pt-3 border-t border-zinc-800/50 text-xs text-zinc-400 flex justify-between font-mono">
                <span>Memory:</span>
                <span className="text-emerald-400 font-bold">{health?.memory_alloc_mb || "--"}</span>
              </div>
              <div className="mt-1 text-xs text-zinc-400 flex justify-between font-mono">
                <span>Uptime:</span>
                <span>{health ? `${health.uptime_seconds}s` : "--"}</span>
              </div>
            </div>

            {/* Card 2: Database */}
            <div className={`p-5 rounded-xl border transition-all ${
              isDark ? "bg-zinc-900/60 border-zinc-800" : "bg-white border-zinc-200 shadow-sm"
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                  <Database className="w-5 h-5" />
                </div>
                {health?.database === "CONNECTED" ? (
                  <span className="inline-flex items-center space-x-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>CONNECTED</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    <AlertCircle className="w-3 h-3" />
                    <span>OFFLINE</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 font-medium">Relational Database</p>
              <h3 className="text-lg font-bold mt-1 font-mono">PostgreSQL 16</h3>
              <div className="mt-3 pt-3 border-t border-zinc-800/50 text-xs text-zinc-400 flex justify-between font-mono">
                <span>Spatial Ext:</span>
                <span className="text-indigo-400 font-bold">PostGIS 3.4</span>
              </div>
              <div className="mt-1 text-xs text-zinc-400 flex justify-between font-mono">
                <span>Port / Host:</span>
                <span>5432 / localhost</span>
              </div>
            </div>

            {/* Card 3: Cache & Queue */}
            <div className={`p-5 rounded-xl border transition-all ${
              isDark ? "bg-zinc-900/60 border-zinc-800" : "bg-white border-zinc-200 shadow-sm"
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
                  <Server className="w-5 h-5" />
                </div>
                {health?.redis === "CONNECTED" ? (
                  <span className="inline-flex items-center space-x-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>CONNECTED</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    <AlertCircle className="w-3 h-3" />
                    <span>OFFLINE</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 font-medium">In-Memory Cache & Tasks</p>
              <h3 className="text-lg font-bold mt-1 font-mono">Redis 7.2</h3>
              <div className="mt-3 pt-3 border-t border-zinc-800/50 text-xs text-zinc-400 flex justify-between font-mono">
                <span>Task Queue:</span>
                <span className="text-rose-400 font-bold">Asynq Engine</span>
              </div>
              <div className="mt-1 text-xs text-zinc-400 flex justify-between font-mono">
                <span>Port / Host:</span>
                <span>6379 / localhost</span>
              </div>
            </div>

            {/* Card 4: Hardware Simulation Mode */}
            <div className={`p-5 rounded-xl border transition-all ${
              isDark ? "bg-zinc-900/60 border-zinc-800" : "bg-white border-zinc-200 shadow-sm"
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                  <Layers className="w-5 h-5" />
                </div>
                <span className="inline-flex items-center space-x-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>ACTIVE</span>
                </span>
              </div>
              <p className="text-xs text-zinc-500 font-medium">Network Hardware Simulator</p>
              <h3 className="text-lg font-bold mt-1 font-mono">Mock Drivers</h3>
              <div className="mt-3 pt-3 border-t border-zinc-800/50 text-xs text-zinc-400 flex justify-between font-mono">
                <span>MikroTik Sim:</span>
                <span className="text-amber-400 font-bold">READY</span>
              </div>
              <div className="mt-1 text-xs text-zinc-400 flex justify-between font-mono">
                <span>OLT Sim:</span>
                <span className="text-amber-400 font-bold">READY</span>
              </div>
            </div>
          </div>
        </section>

        {/* Portals Overview */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold flex items-center space-x-2">
            <Layers className="w-5 h-5 text-emerald-400" />
            <span>Dedicated Multi-Portal Architecture</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                title: "Super Admin & NOC Portal",
                role: "ISP Management",
                desc: "Full network topology, live bandwidth graphs, subscriber lifecycle, and FreeRADIUS management.",
                icon: ShieldCheck,
                color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
                badge: "Phase 1"
              },
              {
                title: "Reseller & Sub-Reseller",
                role: "Franchise Partners",
                desc: "Prepaid wallet, credit limit, batch renewal, and tiered commission accounting.",
                icon: Wallet,
                color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
                badge: "Phase 5"
              },
              {
                title: "Customer Self-Care",
                role: "Subscribers & PWA",
                desc: "1-click bKash/Nagad checkout, usage graphs, live optical power meter, and 48h Promise to Pay.",
                icon: Users,
                color: "text-sky-400 bg-sky-500/10 border-sky-500/20",
                badge: "Phase 4"
              },
              {
                title: "Field Technician Portal",
                role: "Linemen & Splicers",
                desc: "Interactive GIS map, GPS nearest-box radar, live optical dBm testing, and fast ONU scanning.",
                icon: Smartphone,
                color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
                badge: "Phase 7"
              },
              {
                title: "Support & Helpdesk",
                role: "NOC Tier-1 & Tier-2",
                desc: "Kanban ticket queue, customer 360 diagnostics, live ping test, and instant CoA session bounce.",
                icon: Headphones,
                color: "text-rose-400 bg-rose-500/10 border-rose-500/20",
                badge: "Phase 8"
              },
              {
                title: "Hotspot Captive Portal",
                role: "Public Wi-Fi & Cafe",
                desc: "Voucher PIN cards, SMS OTP authentication, and direct mobile financial recharge.",
                icon: Wifi,
                color: "text-teal-400 bg-teal-500/10 border-teal-500/20",
                badge: "Phase 8"
              }
            ].map((portal, idx) => {
              const IconComp = portal.icon;
              return (
                <div 
                  key={idx} 
                  className={`p-5 rounded-xl border transition-all ${
                    isDark ? "bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700" : "bg-white border-zinc-200 shadow-sm hover:border-zinc-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${portal.color}`}>
                      <IconComp className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                      {portal.badge}
                    </span>
                  </div>
                  <h3 className="font-bold text-base">{portal.title}</h3>
                  <p className="text-xs text-zinc-500 font-medium mb-2">{portal.role}</p>
                  <p className="text-xs text-zinc-400 leading-relaxed">{portal.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Quick Documentation Navigation */}
        <section className={`p-6 rounded-xl border ${isDark ? "bg-zinc-900/30 border-zinc-800" : "bg-white border-zinc-200 shadow-sm"}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>Project Documentation & Roadmap</span>
            </h2>
            <span className="text-xs text-zinc-500 font-mono">Located in /docs/</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
            {[
              { name: "00_MASTER_BLUEPRINT.md", label: "Master Vision & Blueprint" },
              { name: "01_SYSTEM_ARCHITECTURE.md", label: "Monorepo & Software Architecture" },
              { name: "02_DATABASE_SCHEMA.md", label: "PostgreSQL Schema & RADIUS Tables" },
              { name: "03_NETWORK_RADIUS_MIKROTIK_OLT.md", label: "RouterOS & OLT Integration" },
              { name: "04_BILLING_PAYMENTS_AUTOMATION.md", label: "Billing & bKash/Nagad Gateways" },
              { name: "05_GIS_FIBER_FIELD_OPERATIONS.md", label: "FTTH Optical GIS & Field PWA" },
              { name: "06_PORTALS_AND_UI_UX_SPEC.md", label: "Multi-Portal UI/UX Specs" },
              { name: "07_API_AND_SECURITY_SPEC.md", label: "API Standards & TypeScript Types" },
              { name: "08_PHASED_IMPLEMENTATION_ROADMAP.md", label: "Step-by-Step Agent Roadmap" },
            ].map((doc, i) => (
              <div
                key={i}
                className={`p-2.5 rounded-lg border flex items-center justify-between font-mono ${
                  isDark ? "bg-zinc-950 border-zinc-800 text-zinc-300" : "bg-zinc-50 border-zinc-200 text-zinc-700"
                }`}
              >
                <div className="truncate pr-2">
                  <p className="font-semibold truncate">{doc.label}</p>
                  <p className="text-[10px] text-zinc-500 truncate">{doc.name}</p>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
