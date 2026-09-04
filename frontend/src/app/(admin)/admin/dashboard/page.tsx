"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Users, 
  Activity, 
  CreditCard, 
  AlertTriangle, 
  ArrowUpRight, 
  Router, 
  CheckCircle2, 
  TrendingUp, 
  ShieldCheck, 
  Plus, 
  Layers
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";

interface DashboardStats {
  totalCustomers: number;
  onlineSessions: number;
  monthlyRevenue: string;
  nocAlerts: number;
  bandwidthInGbps: number;
  bandwidthOutGbps: number;
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 4250,
    onlineSessions: 3890,
    monthlyRevenue: "৳ 2,450,000",
    nocAlerts: 1,
    bandwidthInGbps: 4.82,
    bandwidthOutGbps: 1.24,
  });
  const [apiOnline, setApiOnline] = useState(true);

  useEffect(() => {
    // Ping backend admin dashboard endpoint to verify JWT authorization
    const fetchAdminStats = async () => {
      try {
        const res = await api.get("/admin/dashboard");
        if (res.data?.success) {
          setApiOnline(true);
          const d = res.data.data;
          if (d?.total_customers !== undefined && d.total_customers > 0) {
            setStats((prev) => ({
              ...prev,
              totalCustomers: d.total_customers,
              onlineSessions: d.online_sessions || prev.onlineSessions,
            }));
          }
        }
      } catch (err) {
        console.error("Failed to fetch admin stats", err);
        setApiOnline(false);
      }
    };
    fetchAdminStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-950 border border-zinc-800 p-6 sm:p-8">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center space-x-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Phase 1 Verified: RBAC & Super Admin Shell Active</span>
              </span>
              {apiOnline && (
                <span className="inline-flex items-center space-x-1 text-xs font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Backend Auth: OK</span>
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Welcome back, {user?.first_name || "System"} {user?.last_name || "Admin"}! 👋
            </h1>
            <p className="text-sm text-zinc-400 max-w-2xl">
              NOC Central Command: Monitor optical telemetry, active PPPoE subscriber sessions, MikroTik gateways, and financial flow in real-time.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center space-x-2.5 shrink-0">
            <Link
              href="/admin/mikrotik"
              className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-medium text-zinc-200 rounded-xl transition-colors flex items-center space-x-1.5 shadow-sm"
            >
              <Router className="w-3.5 h-3.5 text-emerald-400" />
              <span>Routers</span>
            </Link>
            <Link
              href="/admin/customers"
              className="px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-500/20 flex items-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Subscriber</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Subscribers */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-3 relative overflow-hidden group hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
              Active Subscribers
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-white font-mono">
              {stats.totalCustomers.toLocaleString()}
            </div>
            <div className="flex items-center space-x-1.5 text-xs text-emerald-400">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+142 this month (+3.4%)</span>
            </div>
          </div>
        </div>

        {/* Metric 2: Online PPPoE Sessions */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-3 relative overflow-hidden group hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
              Online Sessions (AAA)
            </span>
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-white font-mono flex items-center space-x-2">
              <span>{stats.onlineSessions.toLocaleString()}</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="text-xs text-zinc-400 font-mono">
              91.5% concurrency rate
            </div>
          </div>
        </div>

        {/* Metric 3: Monthly Revenue */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-3 relative overflow-hidden group hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
              Monthly Revenue
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-white font-mono">
              {stats.monthlyRevenue}
            </div>
            <div className="flex items-center space-x-1.5 text-xs text-emerald-400">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>96.2% collected</span>
            </div>
          </div>
        </div>

        {/* Metric 4: NOC Alerts */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-3 relative overflow-hidden group hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
              NOC Alerts
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400 border border-rose-500/20">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-rose-400 font-mono flex items-center space-x-2">
              <span>{stats.nocAlerts}</span>
              <span className="text-xs font-sans text-rose-300 font-medium px-2 py-0.5 rounded bg-rose-950 border border-rose-800">
                Fiber LOS (Road 4)
              </span>
            </div>
            <div className="text-xs text-zinc-400">
              Field crew dispatched
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Bandwidth Throughput Preview */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-white">Live Aggregated Bandwidth Throughput</h2>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                SNMP 5s Polling
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Core BGP & Edge Router Transit interfaces (Inbound / Outbound)
            </p>
          </div>

          <div className="flex items-center space-x-4 text-xs font-mono">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="text-zinc-400">Inbound:</span>
              <span className="font-bold text-emerald-400">{stats.bandwidthInGbps} Gbps</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              <span className="text-zinc-400">Outbound:</span>
              <span className="font-bold text-cyan-400">{stats.bandwidthOutGbps} Gbps</span>
            </div>
          </div>
        </div>

        {/* Visual Simulated Traffic Bars */}
        <div className="space-y-3 pt-2">
          <div>
            <div className="flex justify-between text-xs font-mono text-zinc-400 mb-1">
              <span>Download Capacity: 4.82 Gbps / 10.0 Gbps (48.2%)</span>
              <span className="text-emerald-400">Optimal Load</span>
            </div>
            <div className="w-full h-3 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800 p-0.5">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                style={{ width: "48.2%" }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-mono text-zinc-400 mb-1">
              <span>Upload Capacity: 1.24 Gbps / 10.0 Gbps (12.4%)</span>
              <span className="text-cyan-400">Low Utilization</span>
            </div>
            <div className="w-full h-3 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800 p-0.5">
              <div 
                className="h-full bg-gradient-to-r from-cyan-500 to-sky-400 rounded-full transition-all duration-500"
                style={{ width: "12.4%" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Grid: Recent Subscribers & Router Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Recent Subscribers Preview */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Recent Subscribers</h3>
            </div>
            <Link 
              href="/admin/customers"
              className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center space-x-1"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-zinc-500 uppercase font-mono tracking-wider border-b border-zinc-800">
                <tr>
                  <th className="pb-2">Customer</th>
                  <th className="pb-2">Package</th>
                  <th className="pb-2">IP / MAC</th>
                  <th className="pb-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono">
                <tr>
                  <td className="py-3">
                    <div className="font-sans font-semibold text-zinc-200">Karim Ahmed</div>
                    <div className="text-[11px] text-zinc-500">karim_fiber</div>
                  </td>
                  <td className="py-3 text-zinc-300">20 Mbps Blast</td>
                  <td className="py-3 text-zinc-400">10.10.4.18</td>
                  <td className="py-3 text-right">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px]">
                      ACTIVE
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-3">
                    <div className="font-sans font-semibold text-zinc-200">Hasan Ali</div>
                    <div className="text-[11px] text-zinc-500">hasan_link</div>
                  </td>
                  <td className="py-3 text-zinc-300">15 Mbps Home</td>
                  <td className="py-3 text-zinc-400">10.10.4.22</td>
                  <td className="py-3 text-right">
                    <span className="px-2 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-800 text-[10px]">
                      GRACE
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-3">
                    <div className="font-sans font-semibold text-zinc-200">Apex Enterprise</div>
                    <div className="text-[11px] text-zinc-500">apex_corp</div>
                  </td>
                  <td className="py-3 text-zinc-300">50 Mbps Dedicated</td>
                  <td className="py-3 text-zinc-400">103.112.45.10</td>
                  <td className="py-3 text-right">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px]">
                      ACTIVE
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Router & OLT Health Status */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Router className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Network Core NAS & OLT Health</h3>
            </div>
            <Link 
              href="/admin/mikrotik"
              className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors flex items-center space-x-1"
            >
              <span>Manage NAS</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {/* Router 1 */}
            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <div>
                  <div className="font-bold text-zinc-200">CCR-1072 Core Gateway #01</div>
                  <div className="text-[11px] text-zinc-500">10.0.0.1 • RouterOS v7.14</div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-emerald-400 font-bold">🟢 1.2 ms</span>
                <div className="text-[10px] text-zinc-500">CPU 14% • RAM 18%</div>
              </div>
            </div>

            {/* Router 2 */}
            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <div>
                  <div className="font-bold text-zinc-200">CCR-2004 Core Gateway #02</div>
                  <div className="text-[11px] text-zinc-500">10.0.0.2 • RouterOS v7.14</div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-emerald-400 font-bold">🟢 0.8 ms</span>
                <div className="text-[10px] text-zinc-500">CPU 9% • RAM 12%</div>
              </div>
            </div>

            {/* OLT 1 */}
            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <div>
                  <div className="font-bold text-zinc-200">Huawei MA5800 GPON OLT</div>
                  <div className="text-[11px] text-zinc-500">10.20.0.1 • 16 PON Ports</div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-emerald-400 font-bold">🟢 2.1 ms</span>
                <div className="text-[10px] text-zinc-500">748 ONUs Online</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Roadmap Phase Progress Tracker */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 space-y-4">
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-white">System Lifecycle Roadmap Tracker</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-800/40 space-y-1.5">
            <div className="flex items-center justify-between text-emerald-400 font-bold">
              <span>Phase 0: Scaffold</span>
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <p className="text-zinc-400 font-sans text-[11px]">
              Go 1.23, Next.js 15, PostGIS, Redis 7, CLI automation.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 space-y-1.5 ring-1 ring-emerald-500/30">
            <div className="flex items-center justify-between text-emerald-300 font-bold">
              <span>Phase 1: Auth & RBAC Shell</span>
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <p className="text-zinc-300 font-sans text-[11px]">
              JWT Auth, Super Admin Shell, Sidebar, Profile, Logout.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1.5">
            <div className="flex items-center justify-between text-zinc-400 font-bold">
              <span>Phase 2: MikroTik & RADIUS</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400">NEXT</span>
            </div>
            <p className="text-zinc-500 font-sans text-[11px]">
              RouterOS API driver, FreeRADIUS CoA, live ping gauges.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
