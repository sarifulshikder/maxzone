"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Router as RouterIcon,
  Plus,
  Wifi,
  WifiOff,
  RefreshCcw,
  Zap,
  Activity,
  Cpu,
  MemoryStick,
  Users,
  Clock,
  Trash2,
  X,
  AlertTriangle,
  CheckCircle2,
  LogOut,
  HardDrive,
} from "lucide-react";
import api from "@/lib/api";
import { NASRouter, RouterPingResult, RouterStats, ActiveSession, ApiResponse } from "@/types";

// ============================================================
// ADD ROUTER DIALOG
// ============================================================
interface AddRouterDialogProps {
  onClose: () => void;
  onCreated: (router: NASRouter) => void;
}

function AddRouterDialog({ onClose, onCreated }: AddRouterDialogProps) {
  const [form, setForm] = useState({
    name: "",
    ip_address: "",
    api_port: 8728,
    api_username: "admin",
    api_password: "",
    radius_secret: "",
    coa_port: 3799,
    router_os_version: "v7",
    is_simulated: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<ApiResponse<NASRouter>>("/mikrotik/routers", form);
      if (res.data?.success && res.data.data) {
        onCreated(res.data.data);
        onClose();
      } else {
        setError(res.data?.error?.message || "Failed to create router");
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setError(e.response?.data?.error?.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <RouterIcon className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-100">Add MikroTik Router / NAS</h2>
              <p className="text-xs text-zinc-500">Register a RouterOS device or simulation</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center space-x-2 p-3 bg-rose-950/50 border border-rose-800 rounded-xl text-xs text-rose-300">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Router Name *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. CCR-2004 Core Gateway"
                className="w-full px-3 py-2 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">IP Address *</label>
              <input
                type="text"
                required
                value={form.ip_address}
                onChange={e => setForm({ ...form, ip_address: e.target.value })}
                placeholder="10.0.0.1"
                className="w-full px-3 py-2 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">RouterOS Version</label>
              <select
                value={form.router_os_version}
                onChange={e => setForm({ ...form, router_os_version: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="v7">RouterOS v7</option>
                <option value="v6">RouterOS v6</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">API Port</label>
              <input
                type="number"
                value={form.api_port}
                onChange={e => setForm({ ...form, api_port: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">CoA Port</label>
              <input
                type="number"
                value={form.coa_port}
                onChange={e => setForm({ ...form, coa_port: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">API Username</label>
              <input
                type="text"
                value={form.api_username}
                onChange={e => setForm({ ...form, api_username: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">API Password</label>
              <input
                type="password"
                value={form.api_password}
                onChange={e => setForm({ ...form, api_password: e.target.value })}
                placeholder={form.is_simulated ? "(optional for simulation)" : ""}
                className="w-full px-3 py-2 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">RADIUS Secret *</label>
              <input
                type="text"
                required
                value={form.radius_secret}
                onChange={e => setForm({ ...form, radius_secret: e.target.value })}
                placeholder="shared radius secret key"
                className="w-full px-3 py-2 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-100 font-mono placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Simulation Mode Toggle */}
            <div className="col-span-2">
              <label className="flex items-center space-x-3 cursor-pointer">
                <div
                  onClick={() => setForm({ ...form, is_simulated: !form.is_simulated })}
                  className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${form.is_simulated ? "bg-emerald-500" : "bg-zinc-700"}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${form.is_simulated ? "translate-x-5" : "translate-x-0.5"}`} />
                </div>
                <div>
                  <span className="text-xs font-medium text-zinc-200">Simulation Mode</span>
                  <p className="text-[11px] text-zinc-500">Use synthetic data — no real hardware required</p>
                </div>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2 border-t border-zinc-800">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-100 bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700 rounded-xl transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-zinc-950 bg-emerald-500 hover:bg-emerald-400 rounded-xl transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              {loading && <RefreshCcw className="w-3.5 h-3.5 animate-spin" />}
              <span>{loading ? "Adding Router..." : "Add Router"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// ROUTER STATS DRAWER
// ============================================================
interface RouterStatsDrawerProps {
  router: NASRouter;
  stats: RouterStats | null;
  loading: boolean;
  onClose: () => void;
  onDisconnect: (session: ActiveSession) => void;
}

function RouterStatsDrawer({ router, stats, loading, onClose, onDisconnect }: RouterStatsDrawerProps) {
  const formatBytes = (bytes: number): string => {
    if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)} GB`;
    if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(2)} MB`;
    return `${(bytes / 1e3).toFixed(0)} KB`;
  };

  const memUsedMB = stats ? Math.round((stats.resource.total_memory_bytes - stats.resource.free_memory_bytes) / (1024 * 1024)) : 0;
  const memTotalMB = stats ? Math.round(stats.resource.total_memory_bytes / (1024 * 1024)) : 0;
  const memPercent = memTotalMB > 0 ? Math.round((memUsedMB / memTotalMB) * 100) : 0;
  const cpuPercent = stats?.resource.cpu_load ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-zinc-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-xl bg-zinc-950 border-l border-zinc-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 shrink-0">
          <div>
            <div className="flex items-center space-x-2">
              <div className={`w-2.5 h-2.5 rounded-full ${router.last_status === "ONLINE" ? "bg-emerald-400 animate-pulse" : "bg-rose-400"}`} />
              <h2 className="text-sm font-bold text-zinc-100">{router.name}</h2>
              {router.is_simulated && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono">SIM</span>
              )}
            </div>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">{router.ip_address} • RouterOS {router.router_os_version.toUpperCase()}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-900 rounded-xl">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <RefreshCcw className="w-6 h-6 text-emerald-400 animate-spin" />
              <p className="text-xs text-zinc-500 font-mono">Fetching live telemetry...</p>
            </div>
          ) : stats ? (
            <>
              {/* System Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5 space-y-1">
                  <p className="text-[10px] font-mono text-zinc-500 uppercase">Board</p>
                  <p className="text-xs font-bold text-zinc-100">{stats.resource.board_name}</p>
                  <p className="text-[11px] text-zinc-400">{stats.resource.version}</p>
                </div>
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5 space-y-1">
                  <p className="text-[10px] font-mono text-zinc-500 uppercase">Uptime</p>
                  <p className="text-xs font-bold text-emerald-400 font-mono">{stats.resource.uptime}</p>
                  <p className="text-[11px] text-zinc-400">{stats.resource.architecture_name} • {stats.resource.cpu_count} cores</p>
                </div>
              </div>

              {/* CPU Gauge */}
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Cpu className="w-4 h-4 text-sky-400" />
                    <span className="text-xs font-medium text-zinc-300">CPU Load</span>
                  </div>
                  <span className={`text-sm font-bold font-mono ${cpuPercent > 70 ? "text-rose-400" : cpuPercent > 40 ? "text-amber-400" : "text-emerald-400"}`}>
                    {cpuPercent}%
                  </span>
                </div>
                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${cpuPercent > 70 ? "bg-rose-500" : cpuPercent > 40 ? "bg-amber-500" : "bg-emerald-500"}`}
                    style={{ width: `${cpuPercent}%` }}
                  />
                </div>
              </div>

              {/* Memory Gauge */}
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MemoryStick className="w-4 h-4 text-violet-400" />
                    <span className="text-xs font-medium text-zinc-300">Memory</span>
                  </div>
                  <span className="text-xs font-mono text-zinc-300">
                    {memUsedMB} MB <span className="text-zinc-600">/ {memTotalMB} MB</span>
                  </span>
                </div>
                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${memPercent > 80 ? "bg-rose-500" : memPercent > 60 ? "bg-amber-500" : "bg-violet-500"}`}
                    style={{ width: `${memPercent}%` }}
                  />
                </div>
                <p className="text-[11px] text-zinc-500 font-mono">{memPercent}% used</p>
              </div>

              {/* HDD */}
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <HardDrive className="w-4 h-4 text-orange-400" />
                  <span className="text-xs font-medium text-zinc-300">Flash Storage</span>
                </div>
                <span className="text-xs font-mono text-zinc-300">
                  {Math.round((stats.resource.total_memory_bytes - stats.resource.free_hdd_bytes) / (1024 * 1024))} / {Math.round(stats.resource.total_hdd_bytes / (1024 * 1024))} MB
                </span>
              </div>

              {/* Active PPPoE Sessions */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-bold text-zinc-100">Active PPPoE Sessions</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                      {stats.sessions.length} online
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  {stats.sessions.map((session) => (
                    <div key={session.id} className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5 flex items-center justify-between">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-semibold text-zinc-100 font-mono">{session.username}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">{session.rate_limit}</span>
                        </div>
                        <div className="flex items-center space-x-3 text-[11px] text-zinc-500 font-mono">
                          <span>{session.ip_address}</span>
                          <span>•</span>
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{session.uptime}</span>
                          </span>
                        </div>
                        <div className="flex items-center space-x-3 text-[11px] text-zinc-600 font-mono">
                          <span>↓ {formatBytes(session.bytes_in)}</span>
                          <span>↑ {formatBytes(session.bytes_out)}</span>
                          {session.mac_address && <span>{session.mac_address}</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => onDisconnect(session)}
                        className="ml-3 p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg border border-transparent hover:border-rose-500/20 transition-all shrink-0"
                        title="Disconnect session"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 space-y-3 text-zinc-500">
              <WifiOff className="w-10 h-10 text-zinc-700" />
              <p className="text-xs">Failed to fetch router telemetry</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ROUTER ROW CARD
// ============================================================
interface RouterCardProps {
  router: NASRouter;
  onViewStats: (router: NASRouter) => void;
  onDelete: (router: NASRouter) => void;
  onPing: (router: NASRouter) => Promise<void>;
  pingResult: RouterPingResult | null;
  pinging: boolean;
}

function RouterCard({ router, onViewStats, onDelete, onPing, pingResult, pinging }: RouterCardProps) {
  const statusColor = router.last_status === "ONLINE"
    ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
    : router.last_status === "OFFLINE"
    ? "text-rose-400 bg-rose-500/10 border-rose-500/20"
    : "text-zinc-400 bg-zinc-800 border-zinc-700";

  return (
    <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-4 hover:border-zinc-700 transition-colors">
      {/* Router Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
            <RouterIcon className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-zinc-100">{router.name}</h3>
              {router.is_simulated && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono">SIM</span>
              )}
            </div>
            <p className="text-xs text-zinc-500 font-mono">{router.ip_address} • RouterOS {router.router_os_version.toUpperCase()} • CoA :{router.coa_port}</p>
          </div>
        </div>
        <span className={`text-[10px] font-mono font-bold px-2 py-1 rounded-full border ${statusColor}`}>
          {router.last_status}
        </span>
      </div>

      {/* Ping Result */}
      {pingResult && (
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-zinc-950/60 rounded-xl p-2.5 text-center">
            <p className="text-[10px] text-zinc-500 uppercase font-mono">Latency</p>
            <p className="text-xs font-bold text-emerald-400 font-mono">{pingResult.latency_ms} ms</p>
          </div>
          <div className="bg-zinc-950/60 rounded-xl p-2.5 text-center">
            <p className="text-[10px] text-zinc-500 uppercase font-mono">CPU</p>
            <p className="text-xs font-bold text-sky-400 font-mono">{pingResult.cpu_load_percent}%</p>
          </div>
          <div className="bg-zinc-950/60 rounded-xl p-2.5 text-center">
            <p className="text-[10px] text-zinc-500 uppercase font-mono">RAM</p>
            <p className="text-xs font-bold text-violet-400 font-mono">{pingResult.memory_used_mb}M</p>
          </div>
          <div className="bg-zinc-950/60 rounded-xl p-2.5 text-center">
            <p className="text-[10px] text-zinc-500 uppercase font-mono">Sessions</p>
            <p className="text-xs font-bold text-emerald-400 font-mono">{pingResult.active_ppp_sessions}</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center space-x-2 pt-1 border-t border-zinc-800">
        <button
          onClick={() => onPing(router)}
          disabled={pinging}
          className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 rounded-xl transition-all disabled:opacity-50"
        >
          {pinging ? <RefreshCcw className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5" />}
          <span>{pinging ? "Testing..." : "Test Connection"}</span>
        </button>

        <button
          onClick={() => onViewStats(router)}
          className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/15 border border-sky-500/20 rounded-xl transition-all"
        >
          <Activity className="w-3.5 h-3.5" />
          <span>View Stats</span>
        </button>

        <div className="flex-1" />

        <button
          onClick={() => onDelete(router)}
          className="p-1.5 text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg border border-transparent hover:border-rose-500/20 transition-all"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================
export default function MikrotikPage() {
  const [routers, setRouters] = useState<NASRouter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [pingResults, setPingResults] = useState<Record<string, RouterPingResult>>({});
  const [pingingIds, setPingingIds] = useState<Set<string>>(new Set());
  const [drawerRouter, setDrawerRouter] = useState<NASRouter | null>(null);
  const [drawerStats, setDrawerStats] = useState<RouterStats | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [disconnectToast, setDisconnectToast] = useState<{ username: string; success: boolean } | null>(null);

  const fetchRouters = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<ApiResponse<NASRouter[]>>("/mikrotik/routers");
      if (res.data?.success && res.data.data) {
        setRouters(res.data.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRouters(); }, [fetchRouters]);

  const handlePing = async (router: NASRouter) => {
    setPingingIds(prev => new Set(prev).add(router.id));
    try {
      const res = await api.post<ApiResponse<RouterPingResult>>(`/mikrotik/routers/${router.id}/ping`);
      if (res.data?.success && res.data.data) {
        setPingResults(prev => ({ ...prev, [router.id]: res.data!.data! }));
        setRouters(prev => prev.map(r => r.id === router.id ? { ...r, last_status: "ONLINE" } : r));
      }
    } catch {
      setRouters(prev => prev.map(r => r.id === router.id ? { ...r, last_status: "OFFLINE" } : r));
    } finally {
      setPingingIds(prev => { const s = new Set(prev); s.delete(router.id); return s; });
    }
  };

  const handleViewStats = async (router: NASRouter) => {
    setDrawerRouter(router);
    setDrawerStats(null);
    setDrawerLoading(true);
    try {
      const res = await api.get<ApiResponse<RouterStats>>(`/mikrotik/routers/${router.id}/stats`);
      if (res.data?.success && res.data.data) {
        setDrawerStats(res.data.data);
      }
    } catch {
      // ignore
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleDisconnect = async (session: ActiveSession) => {
    if (!drawerRouter) return;
    try {
      await api.post("/mikrotik/sessions/disconnect", {
        nas_id: drawerRouter.id,
        username: session.username,
        user_ip: session.ip_address,
      });
      setDrawerStats(prev => prev ? {
        ...prev,
        sessions: prev.sessions.filter(s => s.id !== session.id)
      } : null);
      setDisconnectToast({ username: session.username, success: true });
    } catch {
      setDisconnectToast({ username: session.username, success: false });
    }
    setTimeout(() => setDisconnectToast(null), 4000);
  };

  const handleDelete = async (router: NASRouter) => {
    if (!confirm(`Delete router "${router.name}" (${router.ip_address})? This will also remove its FreeRADIUS NAS client entry.`)) return;
    try {
      await api.delete(`/mikrotik/routers/${router.id}`);
      setRouters(prev => prev.filter(r => r.id !== router.id));
    } catch {
      // ignore
    }
  };

  const onlineCount = routers.filter(r => r.last_status === "ONLINE").length;
  const simCount = routers.filter(r => r.is_simulated).length;

  return (
    <div className="space-y-6">
      {/* Disconnect Toast */}
      {disconnectToast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center space-x-2 px-4 py-3 rounded-xl border shadow-2xl text-sm animate-in fade-in slide-in-from-top-4 ${
          disconnectToast.success
            ? "bg-emerald-950/90 border-emerald-800 text-emerald-200"
            : "bg-rose-950/90 border-rose-800 text-rose-200"
        }`}>
          {disconnectToast.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{disconnectToast.success
            ? `Session for ${disconnectToast.username} disconnected via CoA`
            : `Failed to disconnect ${disconnectToast.username}`
          }</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400">Phase 2</span>
            <span className="text-xs text-zinc-600">Network Infrastructure</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Routers &amp; NAS</h1>
          <p className="text-sm text-zinc-400 mt-1">MikroTik RouterOS API • FreeRADIUS CoA (RFC 3576) • PPPoE Session Control</p>
        </div>

        <button
          onClick={() => setShowAddDialog(true)}
          className="flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold text-zinc-950 bg-emerald-500 hover:bg-emerald-400 rounded-xl transition-colors shadow-lg shadow-emerald-500/10"
        >
          <Plus className="w-4 h-4" />
          <span>Add Router</span>
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Routers", value: routers.length, icon: RouterIcon, color: "text-zinc-300" },
          { label: "Online", value: onlineCount, icon: Wifi, color: "text-emerald-400" },
          { label: "Offline/Unknown", value: routers.length - onlineCount, icon: WifiOff, color: "text-rose-400" },
          { label: "Simulation Mode", value: simCount, icon: Zap, color: "text-amber-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-500">{label}</p>
              <p className={`text-2xl font-extrabold font-mono ${color}`}>{value}</p>
            </div>
            <Icon className={`w-6 h-6 ${color} opacity-60`} />
          </div>
        ))}
      </div>

      {/* Router List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <RefreshCcw className="w-6 h-6 text-emerald-400 animate-spin" />
          <p className="text-xs text-zinc-500 font-mono">Loading routers...</p>
        </div>
      ) : routers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4 border-2 border-dashed border-zinc-800 rounded-2xl">
          <RouterIcon className="w-12 h-12 text-zinc-700" />
          <div className="text-center">
            <p className="text-sm font-semibold text-zinc-400">No routers registered</p>
            <p className="text-xs text-zinc-600 mt-1">Add a MikroTik router or simulation device to get started</p>
          </div>
          <button
            onClick={() => setShowAddDialog(true)}
            className="flex items-center space-x-2 px-4 py-2 text-xs font-semibold text-zinc-950 bg-emerald-500 hover:bg-emerald-400 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Your First Router</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {routers.map(router => (
            <RouterCard
              key={router.id}
              router={router}
              onViewStats={handleViewStats}
              onDelete={handleDelete}
              onPing={handlePing}
              pingResult={pingResults[router.id] ?? null}
              pinging={pingingIds.has(router.id)}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      {showAddDialog && (
        <AddRouterDialog
          onClose={() => setShowAddDialog(false)}
          onCreated={router => setRouters(prev => [router, ...prev])}
        />
      )}

      {drawerRouter && (
        <RouterStatsDrawer
          router={drawerRouter}
          stats={drawerStats}
          loading={drawerLoading}
          onClose={() => { setDrawerRouter(null); setDrawerStats(null); }}
          onDisconnect={handleDisconnect}
        />
      )}
    </div>
  );
}
