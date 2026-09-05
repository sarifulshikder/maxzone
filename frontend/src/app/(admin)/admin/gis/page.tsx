"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  MapPin,
  RefreshCcw,
  Network,
  Share2,
  Boxes,
  Cable,
  Server,
  AlertTriangle,
} from "lucide-react";
import api from "@/lib/api";
import { GISMapData, ApiResponse } from "@/types";
import LeafletMap, { TIA598_COLORS } from "@/components/gis/LeafletMap";

export default function GisPage() {
  const [data, setData] = useState<GISMapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMap = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<ApiResponse<GISMapData>>("/gis/map");
      if (res.data?.success && res.data.data) {
        setData(res.data.data);
      }
    } catch {
      setError("Failed to load fiber map data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMap(); }, [fetchMap]);

  const usedColors = new Set((data?.cables ?? []).map(c => c.jacket_color));
  const splicerCount = data?.splitters.length ?? 0;
  const boxCount = data?.boxes.length ?? 0;
  const cableCount = data?.cables.length ?? 0;
  const oltCount = data?.olts.length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400">Phase 7</span>
            <span className="text-xs text-zinc-600">FTTH Spatial Intelligence</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">GIS Fiber Map</h1>
          <p className="text-sm text-zinc-400 mt-1">Central Office • Optical Splitters • TJ Boxes • TIA-598 Color-Coded Fiber Spine</p>
        </div>

        <button
          onClick={fetchMap}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold text-zinc-950 bg-emerald-500 hover:bg-emerald-400 rounded-xl transition-colors shadow-lg shadow-emerald-500/10 disabled:opacity-50"
        >
          <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span>{loading ? "Refreshing..." : "Refresh Map"}</span>
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Central Offices", value: oltCount, icon: Server, color: "text-emerald-400" },
          { label: "Optical Splitters", value: splicerCount, icon: Boxes, color: "text-amber-400" },
          { label: "TJ Boxes", value: boxCount, icon: MapPin, color: "text-sky-400" },
          { label: "Fiber Segments", value: cableCount, icon: Cable, color: "text-violet-400" },
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
          <p className="text-xs text-zinc-500 font-mono">Loading fiber topology...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3 border-2 border-dashed border-rose-900 rounded-2xl text-rose-400">
          <AlertTriangle className="w-10 h-10" />
          <p className="text-xs font-mono">{error}</p>
          <p className="text-[11px] text-zinc-600">Check that the backend is running and you are logged in</p>
        </div>
      ) : data ? (
        <div className="relative">
          <LeafletMap
            olts={data.olts}
            splitters={data.splitters}
            boxes={data.boxes}
            cables={data.cables}
            height="calc(100vh - 16rem)"
          />

          {/* Legend overlay */}
          <div className="absolute top-3 right-3 z-[1000] w-48 bg-zinc-950/90 backdrop-blur-sm border border-zinc-800 rounded-xl p-3 space-y-2 shadow-2xl">
            <div className="flex items-center space-x-2">
              <Network className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] font-bold text-zinc-200">TIA-598 Jacket Colors</span>
            </div>
            {Object.entries(TIA598_COLORS)
              .filter(([name]) => usedColors.has(name))
              .map(([name, hex]) => (
                <div key={name} className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                  <span className="flex items-center space-x-2">
                    <span className="w-3 h-1.5 rounded-full" style={{ backgroundColor: hex }} />
                    <span>{name}</span>
                  </span>
                  <span className="text-zinc-600">{cableCountByColor(data.cables, name)} seg</span>
                </div>
              ))}
            <div className="pt-1 border-t border-zinc-800 space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
                <span className="flex items-center space-x-1.5"><Share2 className="w-3 h-3" /> Feeder</span>
                <span className="text-zinc-600">solid</span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
                <span className="flex items-center space-x-1.5"><Share2 className="w-3 h-3" /> Distribution</span>
                <span className="text-zinc-600">dashed</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function cableCountByColor(cables: GISMapData["cables"], color: string): number {
  return cables.filter(c => c.jacket_color === color).length;
}