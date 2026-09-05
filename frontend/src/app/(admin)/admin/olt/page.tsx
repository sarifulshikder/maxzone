"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Zap,
  Plus,
  Wifi,
  WifiOff,
  RefreshCcw,
  Activity,
  Trash2,
  X,
  AlertTriangle,
  CheckCircle2,
  Network,
  Server,
  Gauge,
  Thermometer,
  Ruler,
} from "lucide-react";
import api from "@/lib/api";
import {
  OLTDevice,
  OLTPingResult,
  OLTDetail,
  ONUDevice,
  ONUHealth,
  ApiResponse,
} from "@/types";

// ============================================================
// STYLE HELPERS
// ============================================================
const onuHealthBadge = (health: ONUHealth) => {
  switch (health) {
    case "OPTIMAL":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "GOOD":
      return "bg-sky-500/10 text-sky-400 border-sky-500/20";
    case "WARNING":
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "CRITICAL":
      return "bg-rose-500/10 text-rose-400 border-rose-500/20";
    default:
      return "bg-zinc-800 text-zinc-400 border-zinc-700";
  }
};

const onuStatusBadge = (status: ONUDevice["status"]) => {
  switch (status) {
    case "ONLINE":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "LOS":
      return "bg-rose-500/10 text-rose-400 border-rose-500/20";
    case "DISCOVERED":
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "OFFLINE":
      return "bg-zinc-800 text-zinc-400 border-zinc-700";
    default:
      return "bg-zinc-800 text-zinc-400 border-zinc-700";
  }
};

const formatMetric = (v?: number | null): string => {
  if (v === null || v === undefined) return "—";
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return String(v);
};

// ============================================================
// ADD OLT DIALOG
// ============================================================
interface AddOLTDialogProps {
  onClose: () => void;
  onCreated: (olt: OLTDevice) => void;
}

function AddOLTDialog({ onClose, onCreated }: AddOLTDialogProps) {
  const [form, setForm] = useState({
    name: "",
    vendor: "HUAWEI",
    model: "",
    ip_address: "",
    snmp_version: "v2c",
    snmp_port: 161,
    snmp_community: "public",
    snmp_username: "",
    snmp_auth_protocol: "md5",
    snmp_auth_password: "",
    snmp_priv_protocol: "aes",
    snmp_priv_password: "",
    is_simulated: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const payload: Record<string, unknown> = {
      ...form,
      snmp_auth_protocol: form.snmp_version === "v3" ? form.snmp_auth_protocol : "",
      snmp_auth_password: form.snmp_version === "v3" ? form.snmp_auth_password : "",
      snmp_priv_protocol: form.snmp_version === "v3" ? form.snmp_priv_protocol : "",
      snmp_priv_password: form.snmp_version === "v3" ? form.snmp_priv_password : "",
      snmp_community: form.snmp_version === "v2c" ? form.snmp_community : "",
    };
    try {
      const res = await api.post<ApiResponse<OLTDevice>>("/olt/devices", payload);
      if (res.data?.success && res.data.data) {
        onCreated(res.data.data);
        onClose();
      } else {
        setError(res.data?.error?.message || "Failed to create OLT");
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
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-100">Add OLT Device</h2>
              <p className="text-xs text-zinc-500">Register a GPON/EPON OLT over SNMP</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center space-x-2 p-3 bg-rose-950/50 border border-rose-800 rounded-xl text-xs text-rose-300">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Device Name *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. OLT-BD-X1 Primary"
                className="w-full px-3 py-2 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Vendor *</label>
              <select
                value={form.vendor}
                onChange={e => setForm({ ...form, vendor: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="HUAWEI">Huawei</option>
                <option value="ZTE">ZTE</option>
                <option value="VSOL">VSOL</option>
                <option value="BDCOM">BDCOM</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Model</label>
              <input
                type="text"
                value={form.model}
                onChange={e => setForm({ ...form, model: e.target.value })}
                placeholder="e.g. MA5800-X7"
                className="w-full px-3 py-2 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">IP Address *</label>
              <input
                type="text"
                required
                value={form.ip_address}
                onChange={e => setForm({ ...form, ip_address: e.target.value })}
                placeholder="10.20.0.1"
                className="w-full px-3 py-2 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">SNMP Version</label>
              <select
                value={form.snmp_version}
                onChange={e => setForm({ ...form, snmp_version: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="v2c">v2c</option>
                <option value="v3">v3</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">SNMP Port</label>
              <input
                type="number"
                value={form.snmp_port}
                onChange={e => setForm({ ...form, snmp_port: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {form.snmp_version === "v2c" ? (
              <div className="col-span-2">
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Community String</label>
                <input
                  type="text"
                  value={form.snmp_community}
                  onChange={e => setForm({ ...form, snmp_community: e.target.value })}
                  placeholder="public"
                  className="w-full px-3 py-2 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            ) : (
              <>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">SNMP Username</label>
                  <input
                    type="text"
                    value={form.snmp_username}
                    onChange={e => setForm({ ...form, snmp_username: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Auth Protocol</label>
                  <select
                    value={form.snmp_auth_protocol}
                    onChange={e => setForm({ ...form, snmp_auth_protocol: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="md5">MD5</option>
                    <option value="sha">SHA</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Auth Password</label>
                  <input
                    type="password"
                    value={form.snmp_auth_password}
                    onChange={e => setForm({ ...form, snmp_auth_password: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Privacy Protocol</label>
                  <select
                    value={form.snmp_priv_protocol}
                    onChange={e => setForm({ ...form, snmp_priv_protocol: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="aes">AES</option>
                    <option value="des">DES</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Privacy Password</label>
                  <input
                    type="password"
                    value={form.snmp_priv_password}
                    onChange={e => setForm({ ...form, snmp_priv_password: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </>
            )}

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
              <span>{loading ? "Adding OLT..." : "Add OLT"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// ONU ROW
// ============================================================
interface ONURowProps {
  onu: ONUDevice;
  onAuthorize?: (onu: ONUDevice) => void;
  showAuthorize?: boolean;
}

function ONURow({ onu, onAuthorize, showAuthorize }: ONURowProps) {
  return (
    <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 flex items-center justify-between">
      <div className="flex items-center space-x-3 min-w-0">
        <span className={`w-2 h-2 rounded-full shrink-0 ${onu.status === "ONLINE" ? "bg-emerald-400" : onu.status === "LOS" ? "bg-rose-400" : onu.status === "DISCOVERED" ? "bg-amber-400" : "bg-zinc-600"}`} />
        <div className="min-w-0">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-zinc-100 font-mono">{onu.serial_number}</span>
            {onu.name && <span className="text-[11px] text-zinc-400 truncate">{onu.name}</span>}
          </div>
          <div className="flex items-center space-x-3 text-[11px] text-zinc-500 font-mono mt-0.5">
            <span className="flex items-center space-x-1"><Gauge className="w-3 h-3" /><span>Rx {formatMetric(onu.rx_power_db)} dBm</span></span>
            <span className="flex items-center space-x-1"><Thermometer className="w-3 h-3" /><span>{formatMetric(onu.temperature_c)}°C</span></span>
            <span className="flex items-center space-x-1"><Ruler className="w-3 h-3" /><span>{formatMetric(onu.distance_m)}m</span></span>
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-2 shrink-0">
        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full border ${onuStatusBadge(onu.status)}`}>
          {onu.status}
        </span>
        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full border ${onuHealthBadge(onu.health)}`}>
          {onu.health}
        </span>
        {showAuthorize && onAuthorize && !onu.registered && (
          <button
            onClick={() => onAuthorize(onu)}
            className="px-2.5 py-1 text-[10px] font-semibold text-zinc-950 bg-emerald-500 hover:bg-emerald-400 rounded-lg transition-colors flex items-center space-x-1"
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>Authorize</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// OLT DETAIL DRAWER
// ============================================================
interface OLTDetailDrawerProps {
  detail: OLTDetail | null;
  loading: boolean;
  onClose: () => void;
  onAuthorize: (onu: ONUDevice) => void;
  authorizingId: string | null;
}

function OLTDetailDrawer({ detail, loading, onClose, onAuthorize, authorizingId }: OLTDetailDrawerProps) {
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-zinc-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-3xl bg-zinc-950 border-l border-zinc-800 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 shrink-0">
          <div>
            <div className="flex items-center space-x-2">
              <div className={`w-2.5 h-2.5 rounded-full ${detail?.olt.last_status === "ONLINE" ? "bg-emerald-400 animate-pulse" : "bg-rose-400"}`} />
              <h2 className="text-sm font-bold text-zinc-100">{detail?.olt.name ?? "OLT"}</h2>
              {detail?.olt.is_simulated && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono">SIM</span>
              )}
            </div>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">
              {detail?.olt.ip_address} • {detail?.olt.vendor} {detail?.olt.model} • SNMP {detail?.olt.snmp_version.toUpperCase()} :{detail?.olt.snmp_port}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-900 rounded-xl">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <RefreshCcw className="w-6 h-6 text-emerald-400 animate-spin" />
              <p className="text-xs text-zinc-500 font-mono">Fetching PON telemetry...</p>
            </div>
          ) : detail ? (
            <>
              {/* Summary */}
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5">
                  <p className="text-[10px] font-mono text-zinc-500 uppercase">Total ONUs</p>
                  <p className="text-lg font-extrabold font-mono text-zinc-100">{detail.total_onus}</p>
                </div>
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5">
                  <p className="text-[10px] font-mono text-zinc-500 uppercase">Unregistered</p>
                  <p className="text-lg font-extrabold font-mono text-amber-400">{detail.unregistered_onus}</p>
                </div>
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5">
                  <p className="text-[10px] font-mono text-zinc-500 uppercase">PON Ports</p>
                  <p className="text-lg font-extrabold font-mono text-zinc-100">{detail.ports.length}</p>
                </div>
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5">
                  <p className="text-[10px] font-mono text-zinc-500 uppercase">Last Polled</p>
                  <p className="text-sm font-bold font-mono text-zinc-100 mt-1">
                    {detail.olt.last_polled_at
                      ? new Date(detail.olt.last_polled_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
                      : "—"}
                  </p>
                </div>
              </div>

              {/* PON Ports */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Network className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-bold text-zinc-100">PON Ports</span>
                  </div>
                </div>
                <div className="space-y-3">
                  {detail.ports.map(port => {
                    const online = port.onus.filter(o => o.status === "ONLINE").length;
                    const los = port.onus.filter(o => o.status === "LOS").length;
                    const critical = port.onus.filter(o => o.health === "CRITICAL").length;
                    const warning = port.onus.filter(o => o.health === "WARNING").length;
                    return (
                      <div key={port.id} className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Server className="w-4 h-4 text-sky-400" />
                            <span className="text-sm font-bold font-mono text-zinc-100">{port.name}</span>
                          </div>
                          <div className="flex items-center space-x-2 text-[11px] font-mono">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">{online} online</span>
                            {los > 0 && <span className="px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400">{los} LOS</span>}
                            <span className="px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400">{port.onboarded_onts}/{port.max_onts} ONUs</span>
                          </div>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                            style={{ width: `${port.max_onts > 0 ? Math.min(100, (port.onboarded_onts / port.max_onts) * 100) : 0}%` }}
                          />
                        </div>
                        {critical > 0 || warning > 0 ? (
                          <p className="text-[11px] font-mono text-zinc-500">
                            <span className={critical > 0 ? "text-rose-400" : "text-amber-400"}>
                              {critical > 0 ? `${critical} CRITICAL` : `${warning} WARNING`}
                            </span>{" "}
                            optical signal(s) on this port
                          </p>
                        ) : null}
                        {port.onus.length > 0 && (
                          <div className="space-y-2">
                            {port.onus.slice(0, 4).map(onu => (
                              <ONURow key={onu.id} onu={onu} />
                            ))}
                            {port.onus.length > 4 && (
                              <p className="text-[11px] text-zinc-600 font-mono">+ {port.onus.length - 4} more ONUs on this port</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Discovery Queue */}
              {detail.discovered_queue.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span className="text-sm font-bold text-zinc-100">Discovery Queue</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
                        {detail.discovered_queue.length} unregistered
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {detail.discovered_queue.map(onu => (
                      <ONURow
                        key={onu.id}
                        onu={onu}
                        showAuthorize
                        onAuthorize={onAuthorize}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 space-y-3 text-zinc-500">
              <WifiOff className="w-10 h-10 text-zinc-700" />
              <p className="text-xs">Failed to fetch OLT telemetry</p>
            </div>
          )}
        </div>
        {authorizingId && (
          <div className="shrink-0 px-5 py-3 border-t border-zinc-800 flex items-center space-x-2 text-xs text-emerald-400">
            <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
            <span className="font-mono">Authorizing ONU {authorizingId}...</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// OLT CARD
// ============================================================
interface OLTDeviceCardProps {
  olt: OLTDevice;
  onInspect: (olt: OLTDevice) => void;
  onDelete: (olt: OLTDevice) => void;
  onPing: (olt: OLTDevice) => Promise<void>;
  onPoll: (olt: OLTDevice) => Promise<void>;
  pingResult: OLTPingResult | null;
  pinging: boolean;
  polling: boolean;
}

function OLTDeviceCard({ olt, onInspect, onDelete, onPing, onPoll, pingResult, pinging, polling }: OLTDeviceCardProps) {
  const statusColor =
    olt.last_status === "ONLINE"
      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
      : olt.last_status === "OFFLINE"
      ? "text-rose-400 bg-rose-500/10 border-rose-500/20"
      : olt.last_status === "ERROR"
      ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
      : "text-zinc-400 bg-zinc-800 border-zinc-700";

  return (
    <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-4 hover:border-zinc-700 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
            <Zap className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-zinc-100">{olt.name}</h3>
              {olt.is_simulated && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono">SIM</span>
              )}
            </div>
            <p className="text-xs text-zinc-500 font-mono">
              {olt.ip_address} • {olt.vendor} {olt.model} • SNMP {olt.snmp_version.toUpperCase()} :{olt.snmp_port}
            </p>
          </div>
        </div>
        <span className={`text-[10px] font-mono font-bold px-2 py-1 rounded-full border ${statusColor}`}>
          {olt.last_status}
        </span>
      </div>

      <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono">
        <span>OID profile: {olt.oid_profile || "default"}</span>
        <span>{olt.last_polled_at ? `Last polled ${new Date(olt.last_polled_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}` : "Never polled"}</span>
      </div>

      {pingResult && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-zinc-950/60 rounded-xl p-2.5 text-center">
            <p className="text-[10px] text-zinc-500 uppercase font-mono">Latency</p>
            <p className="text-xs font-bold text-emerald-400 font-mono">{pingResult.latency_ms?.toFixed(2) ?? "—"} ms</p>
          </div>
          <div className="bg-zinc-950/60 rounded-xl p-2.5 text-center">
            <p className="text-[10px] text-zinc-500 uppercase font-mono">Version</p>
            <p className="text-xs font-bold text-sky-400 font-mono truncate">{pingResult.software_version}</p>
          </div>
          <div className="bg-zinc-950/60 rounded-xl p-2.5 text-center">
            <p className="text-[10px] text-zinc-500 uppercase font-mono">Uptime</p>
            <p className="text-xs font-bold text-violet-400 font-mono truncate">{pingResult.uptime}</p>
          </div>
        </div>
      )}

      <div className="flex items-center space-x-2 pt-1 border-t border-zinc-800">
        <button
          onClick={() => onPing(olt)}
          disabled={pinging}
          className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 rounded-xl transition-all disabled:opacity-50"
        >
          {pinging ? <RefreshCcw className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5" />}
          <span>{pinging ? "Testing..." : "Test Connection"}</span>
        </button>

        <button
          onClick={() => onPoll(olt)}
          disabled={polling}
          className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/15 border border-cyan-500/20 rounded-xl transition-all disabled:opacity-50"
        >
          {polling ? <RefreshCcw className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
          <span>{polling ? "Polling..." : "Poll Ports"}</span>
        </button>

        <button
          onClick={() => onInspect(olt)}
          className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/15 border border-sky-500/20 rounded-xl transition-all"
        >
          <Network className="w-3.5 h-3.5" />
          <span>View ONUs</span>
        </button>

        <div className="flex-1" />

        <button
          onClick={() => onDelete(olt)}
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
export default function OLTPage() {
  const [olts, setOlts] = useState<OLTDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [pingResults, setPingResults] = useState<Record<string, OLTPingResult>>({});
  const [pingingIds, setPingingIds] = useState<Set<string>>(new Set());
  const [pollingIds, setPollingIds] = useState<Set<string>>(new Set());
  const [drawerOltId, setDrawerOltId] = useState<string | null>(null);
  const [drawerDetail, setDrawerDetail] = useState<OLTDetail | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [authorizingId, setAuthorizingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; success: boolean } | null>(null);

  const fetchOlts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<ApiResponse<OLTDevice[]>>("/olt/devices");
      if (res.data?.success && res.data.data) {
        setOlts(res.data.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOlts(); }, [fetchOlts]);

  const handlePing = async (olt: OLTDevice) => {
    setPingingIds(prev => new Set(prev).add(olt.id));
    try {
      const res = await api.post<ApiResponse<OLTPingResult>>(`/olt/devices/${olt.id}/ping`);
      if (res.data?.success && res.data.data) {
        setPingResults(prev => ({ ...prev, [olt.id]: res.data!.data! }));
        setOlts(prev => prev.map(o => o.id === olt.id ? { ...o, last_status: "ONLINE" } : o));
      }
    } catch {
      setOlts(prev => prev.map(o => o.id === olt.id ? { ...o, last_status: "OFFLINE" } : o));
    } finally {
      setPingingIds(prev => { const s = new Set(prev); s.delete(olt.id); return s; });
    }
  };

  const openDrawer = async (olt: OLTDevice, forcePoll = false) => {
    setDrawerOltId(olt.id);
    setDrawerDetail(null);
    setDrawerLoading(true);
    if (forcePoll) {
      setPollingIds(prev => new Set(prev).add(olt.id));
    }
    try {
      if (forcePoll) {
        const res = await api.post<ApiResponse<OLTDetail>>(`/olt/devices/${olt.id}/poll`);
        if (res.data?.success && res.data.data) {
          setDrawerDetail(res.data.data);
          setOlts(prev => prev.map(o => o.id === olt.id ? { ...o, last_status: res.data!.data!.olt.last_status, last_polled_at: res.data!.data!.olt.last_polled_at } : o));
        }
      } else {
        const res = await api.get<ApiResponse<OLTDetail>>(`/olt/devices/${olt.id}/detail`);
        if (res.data?.success && res.data.data) {
          setDrawerDetail(res.data.data);
        }
      }
    } catch {
      // keep drawer empty -> error state
    } finally {
      setDrawerLoading(false);
      if (forcePoll) {
        setPollingIds(prev => { const s = new Set(prev); s.delete(olt.id); return s; });
      }
    }
  };

  const handlePoll = (olt: OLTDevice) => openDrawer(olt, true);
  const handleInspect = (olt: OLTDevice) => openDrawer(olt, false);

  const handleAuthorize = async (onu: ONUDevice) => {
    if (!drawerOltId) return;
    setAuthorizingId(onu.id);
    try {
      await api.post(`/olt/devices/${drawerOltId}/onus/${onu.id}/authorize`);
      setDrawerDetail(prev => prev ? {
        ...prev,
        unregistered_onus: Math.max(0, prev.unregistered_onus - 1),
        discovered_queue: prev.discovered_queue.filter(o => o.id !== onu.id),
      } : prev);
      setToast({ message: `${onu.serial_number} authorized on OLT`, success: true });
    } catch {
      setToast({ message: `Failed to authorize ${onu.serial_number}`, success: false });
    } finally {
      setAuthorizingId(null);
      setTimeout(() => setToast(null), 4000);
    }
  };

  const handleDelete = async (olt: OLTDevice) => {
    if (!confirm(`Delete OLT "${olt.name}" (${olt.ip_address})? This also removes its PON ports and discovered ONUs.`)) return;
    try {
      await api.delete(`/olt/devices/${olt.id}`);
      setOlts(prev => prev.filter(o => o.id !== olt.id));
      if (drawerOltId === olt.id) {
        setDrawerOltId(null);
        setDrawerDetail(null);
      }
    } catch {
      // ignore
    }
  };

  const onlineCount = olts.filter(o => o.last_status === "ONLINE").length;
  const simCount = olts.filter(o => o.is_simulated).length;

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center space-x-2 px-4 py-3 rounded-xl border shadow-2xl text-sm animate-in fade-in slide-in-from-top-4 ${
          toast.success
            ? "bg-emerald-950/90 border-emerald-800 text-emerald-200"
            : "bg-rose-950/90 border-rose-800 text-rose-200"
        }`}>
          {toast.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400">Phase 6</span>
            <span className="text-xs text-zinc-600">GPON/EPON Fiber Management</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">OLT &amp; PON</h1>
          <p className="text-sm text-zinc-400 mt-1">SNMP v2c/v3 Discovery • PON Port Utilization • Optical Signal Health</p>
        </div>

        <button
          onClick={() => setShowAddDialog(true)}
          className="flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold text-zinc-950 bg-emerald-500 hover:bg-emerald-400 rounded-xl transition-colors shadow-lg shadow-emerald-500/10"
        >
          <Plus className="w-4 h-4" />
          <span>Add OLT</span>
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total OLTs", value: olts.length, icon: Server, color: "text-zinc-300" },
          { label: "Online", value: onlineCount, icon: Wifi, color: "text-emerald-400" },
          { label: "Offline/Unknown", value: olts.length - onlineCount, icon: WifiOff, color: "text-rose-400" },
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

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <RefreshCcw className="w-6 h-6 text-emerald-400 animate-spin" />
          <p className="text-xs text-zinc-500 font-mono">Loading OLTs...</p>
        </div>
      ) : olts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4 border-2 border-dashed border-zinc-800 rounded-2xl">
          <Server className="w-12 h-12 text-zinc-700" />
          <div className="text-center">
            <p className="text-sm font-semibold text-zinc-400">No OLT devices registered</p>
            <p className="text-xs text-zinc-600 mt-1">Add a GPON/EPON OLT or simulation device to get started</p>
          </div>
          <button
            onClick={() => setShowAddDialog(true)}
            className="flex items-center space-x-2 px-4 py-2 text-xs font-semibold text-zinc-950 bg-emerald-500 hover:bg-emerald-400 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Your First OLT</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {olts.map(olt => (
            <OLTDeviceCard
              key={olt.id}
              olt={olt}
              onInspect={handleInspect}
              onDelete={handleDelete}
              onPing={handlePing}
              onPoll={handlePoll}
              pingResult={pingResults[olt.id] ?? null}
              pinging={pingingIds.has(olt.id)}
              polling={pollingIds.has(olt.id)}
            />
          ))}
        </div>
      )}

      {showAddDialog && (
        <AddOLTDialog
          onClose={() => setShowAddDialog(false)}
          onCreated={olt => { setOlts(prev => [olt, ...prev]); setToast({ message: `${olt.name} registered`, success: true }); setTimeout(() => setToast(null), 4000); }}
        />
      )}

      {drawerOltId && (
        <OLTDetailDrawer
          detail={drawerDetail}
          loading={drawerLoading}
          onClose={() => { setDrawerOltId(null); setDrawerDetail(null); }}
          onAuthorize={handleAuthorize}
          authorizingId={authorizingId}
        />
      )}
    </div>
  );
}