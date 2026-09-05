"use client";

import React, { useState } from "react";
import {
  Radar,
  Gauge,
  ListTodo,
  Crosshair,
  RefreshCcw,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Wrench,
} from "lucide-react";
import api from "@/lib/api";
import { NearestBoxResult, ONUSignal, FieldTask, ApiResponse } from "@/types";

const DEFAULT_TECH_LOCATION: [number, number] = [23.733, 90.417];

// ============================================================
// SIGNAL GAUGE (half-circle dial)
// ============================================================
function SignalGauge({ signal }: { signal: ONUSignal }) {
  const min = -30;
  const max = 0;
  const rx = signal.rx_power_db ?? -45;
  const clamped = Math.min(max, Math.max(min, rx));
  const angle = 180 - ((clamped - min) / (max - min)) * 180;

  const colorFor = (health: string) => {
    switch (health) {
      case "OPTIMAL": return "#10b981";
      case "GOOD": return "#38bdf8";
      case "WARNING": return "#f59e0b";
      case "CRITICAL": return "#f43f5e";
      default: return "#71717a";
    }
  };
  const color = colorFor(signal.health);

  const arcPath = (startDeg: number, endDeg: number, radius: number) => {
    const polar = (deg: number, r: number) => {
      const rad = (deg * Math.PI) / 180;
      return [80 + r * Math.cos(rad), 88 - r * Math.sin(rad)] as const;
    };
    const [sx, sy] = polar(startDeg, radius);
    const [ex, ey] = polar(endDeg, radius);
    return `M ${sx} ${sy} A ${radius} ${radius} 0 ${endDeg - startDeg > 180 ? 1 : 0} 1 ${ex} ${ey}`;
  };

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 160 100" className="w-full max-w-[240px]">
        {/* track */}
        <path d={arcPath(0, 180, 64)} fill="none" stroke="#27272a" strokeWidth="10" strokeLinecap="round" />
        {/* live arc */}
        <path d={arcPath(angle, 180, 64)} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" />
        {/* needle */}
        <line x1="80" y1="88" x2={80 + 58 * Math.cos((angle * Math.PI) / 180)} y2={88 - 58 * Math.sin((angle * Math.PI) / 180)} stroke="#fafafa" strokeWidth="3" strokeLinecap="round" />
        <circle cx="80" cy="88" r="5" fill={color} />
        {/* scale labels */}
        <text x="12" y="82" fill="#52525b" fontSize="8" fontFamily="monospace">-30</text>
        <text x="130" y="82" fill="#52525b" fontSize="8" fontFamily="monospace">0</text>
        <text x="68" y="54" fill={color} fontSize="14" fontWeight="800" fontFamily="monospace">
          {signal.rx_power_db != null ? `${signal.rx_power_db.toFixed(1)} dBm` : "—"}
        </text>
      </svg>
      <div className="flex items-center space-x-2 mt-2">
        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
          signal.health === "OPTIMAL" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
          : signal.health === "GOOD" ? "bg-sky-500/10 text-sky-400 border-sky-500/20"
          : signal.health === "WARNING" ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
          : signal.health === "CRITICAL" ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
          : "bg-zinc-800 text-zinc-400 border-zinc-700"
        }`}>
          {signal.health}
        </span>
        <span className="text-[10px] font-mono text-zinc-500">{signal.serial_number}</span>
      </div>
    </div>
  );
}

// ============================================================
// MAIN DASHBOARD
// ============================================================
export default function FieldDashboardPage() {
  const [locating, setLocating] = useState(false);
  const [nearest, setNearest] = useState<NearestBoxResult | null>(null);
  const [locError, setLocError] = useState<string | null>(null);

  const [mac, setMac] = useState("");
  const [loadingSignal, setLoadingSignal] = useState(false);
  const [signal, setSignal] = useState<ONUSignal | null>(null);
  const [signalError, setSignalError] = useState<string | null>(null);

  const [tasks, setTasks] = useState<FieldTask[] | null>(null);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksLoaded, setTasksLoaded] = useState(false);

  const getLocation = (): Promise<[number, number]> =>
    new Promise(resolve => {
      if (typeof navigator !== "undefined" && navigator.geolocation) {
        const timer = setTimeout(() => resolve(DEFAULT_TECH_LOCATION), 5000);
        navigator.geolocation.getCurrentPosition(
          pos => { clearTimeout(timer); resolve([pos.coords.latitude, pos.coords.longitude]); },
          () => { clearTimeout(timer); resolve(DEFAULT_TECH_LOCATION); },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
        );
      } else {
        resolve(DEFAULT_TECH_LOCATION);
      }
    });

  const handleFindNearest = async () => {
    setLocating(true);
    setLocError(null);
    setNearest(null);
    try {
      const [lat, lng] = await getLocation();
      const res = await api.post<ApiResponse<NearestBoxResult>>("/gis/nearest-box", { latitude: lat, longitude: lng });
      if (res.data?.success && res.data.data) {
        setNearest(res.data.data);
      } else {
        setLocError(res.data?.error?.message || "Failed to locate nearest box");
      }
    } catch {
      setLocError("Network error while locating nearest box");
    } finally {
      setLocating(false);
    }
  };

  const handleSignalCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingSignal(true);
    setSignalError(null);
    setSignal(null);
    try {
      const res = await api.get<ApiResponse<ONUSignal>>(`/gis/onu-signal?mac=${encodeURIComponent(mac)}`);
      if (res.data?.success && res.data.data) {
        setSignal(res.data.data);
      } else {
        setSignalError(res.data?.error?.message || "ONU not found for that MAC");
      }
    } catch {
      setSignalError("ONU not found — check the MAC address");
    } finally {
      setLoadingSignal(false);
    }
  };

  const handleLoadTasks = async () => {
    setTasksLoading(true);
    try {
      const res = await api.get<ApiResponse<FieldTask[]>>("/gis/tasks");
      if (res.data?.success) {
        setTasks(res.data.data ?? []);
        setTasksLoaded(true);
      }
    } catch {
      setTasksLoaded(true);
      setTasks([]);
    } finally {
      setTasksLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* === FIND NEAREST BOX === */}
      <section className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
              <Radar className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-zinc-100">Find Nearest Box</h2>
              <p className="text-[10px] text-zinc-500">GPS radar for the closest TJ box</p>
            </div>
          </div>
          <button
            onClick={handleFindNearest}
            disabled={locating}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-950 bg-sky-500 hover:bg-sky-400 rounded-xl transition-colors disabled:opacity-50"
          >
            {locating ? <RefreshCcw className="w-3.5 h-3.5 animate-spin" /> : <Crosshair className="w-3.5 h-3.5" />}
            <span>{locating ? "Locating..." : "Find"}</span>
          </button>
        </div>

        {locError && (
          <div className="flex items-center space-x-2 p-2.5 bg-rose-950/50 border border-rose-800 rounded-xl text-[11px] text-rose-300">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>{locError}</span>
          </div>
        )}

        {nearest && (
          <div className="flex items-center space-x-4 p-3 bg-zinc-950/60 border border-sky-500/20 rounded-xl">
            <div className="relative w-16 h-16 shrink-0">
              <Radar className="w-16 h-16 text-sky-500/30" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse" />
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-zinc-100">{nearest.box.name}</p>
              <p className="text-xl font-extrabold font-mono text-sky-400">
                {nearest.distance_m.toFixed(0)} m away
              </p>
              <p className="text-[10px] font-mono text-zinc-500 mt-0.5">
                {nearest.box.ports_used}/{nearest.box.max_ports} ports used • {nearest.box.available} available
              </p>
            </div>
          </div>
        )}
      </section>

      {/* === LIVE SIGNAL METER === */}
      <section className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Gauge className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-zinc-100">Live Signal Meter</h2>
            <p className="text-[10px] text-zinc-500">Optical reading by ONU MAC address</p>
          </div>
        </div>

        <form onSubmit={handleSignalCheck} className="flex space-x-2">
          <input
            type="text"
            value={mac}
            onChange={e => setMac(e.target.value)}
            placeholder="e.g. E0:9F:2C:0A:EF:5A"
            className="flex-1 px-3 py-2 bg-zinc-950/60 border border-zinc-700 rounded-xl text-xs text-zinc-100 placeholder-zinc-600 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <button
            type="submit"
            disabled={loadingSignal || !mac.trim()}
            className="px-3 py-2 text-xs font-semibold text-zinc-950 bg-emerald-500 hover:bg-emerald-400 rounded-xl transition-colors disabled:opacity-40"
          >
            {loadingSignal ? "..." : "Read"}
          </button>
        </form>

        {signalError && (
          <p className="flex items-center space-x-1.5 text-[11px] text-rose-400">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{signalError}</span>
          </p>
        )}

        {signal && (
          <div className="space-y-2">
            <SignalGauge signal={signal} />
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-zinc-950/60 rounded-xl p-2">
                <p className="text-[9px] text-zinc-500 uppercase font-mono">TX</p>
                <p className="text-[11px] font-bold font-mono text-zinc-200">{signal.tx_power_db != null ? `${signal.tx_power_db.toFixed(1)} dBm` : "—"}</p>
              </div>
              <div className="bg-zinc-950/60 rounded-xl p-2">
                <p className="text-[9px] text-zinc-500 uppercase font-mono">Temp</p>
                <p className="text-[11px] font-bold font-mono text-zinc-200">{signal.temperature_c != null ? `${signal.temperature_c.toFixed(1)}°C` : "—"}</p>
              </div>
              <div className="bg-zinc-950/60 rounded-xl p-2">
                <p className="text-[9px] text-zinc-500 uppercase font-mono">Status</p>
                <p className="text-[11px] font-bold font-mono text-emerald-400">{signal.status}</p>
              </div>
            </div>
            <p className="text-[10px] font-mono text-zinc-500 text-center">
              {signal.olt_name} • {signal.pon_port}
            </p>
          </div>
        )}
      </section>

      {/* === TASK QUEUE === */}
      <section className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <ListTodo className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-zinc-100">Task Queue</h2>
              <p className="text-[10px] text-zinc-500">Network nodes flagged for service</p>
            </div>
          </div>
          <button
            onClick={handleLoadTasks}
            disabled={tasksLoading}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 rounded-xl transition-colors disabled:opacity-50"
          >
            {tasksLoading ? <RefreshCcw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCcw className="w-3.5 h-3.5" />}
            <span>Load</span>
          </button>
        </div>

        {tasksLoaded && !tasksLoading && (
          tasks && tasks.length > 0 ? (
            <div className="space-y-2">
              {tasks.map(task => (
                <div key={task.id} className="flex items-center justify-between bg-zinc-950/60 border border-zinc-800 rounded-xl p-3">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      task.type === "BOX" ? "bg-sky-500/10 border border-sky-500/20" : "bg-amber-500/10 border border-amber-500/20"
                    }`}>
                      {task.type === "BOX"
                        ? <MapPin className={`w-3.5 h-3.5 ${task.type === "BOX" ? "text-sky-400" : "text-amber-400"}`} />
                        : <Wrench className="w-3.5 h-3.5 text-amber-400" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-zinc-100">{task.name}</p>
                      <p className="text-[10px] font-mono text-zinc-500 truncate">{task.address || task.code}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] font-mono text-zinc-400">{task.ports_used}/{task.max_ports}</p>
                    <p className="text-[9px] font-mono text-amber-400 uppercase">Needs work</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="flex items-center space-x-2 text-[11px] text-emerald-400 p-2">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Field clean — no nodes awaiting service</span>
            </p>
          )
        )}
      </section>
    </div>
  );
}