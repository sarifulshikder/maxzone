"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Package as PackageIcon,
  Plus,
  Zap,
  Trash2,
  X,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Wifi,
  Radio,
  Edit2,
  Search,
} from "lucide-react";
import api from "@/lib/api";
import { Package, ApiResponse } from "@/types";

// ============================================================
// ADD / EDIT PACKAGE DIALOG
// ============================================================
interface PackageDialogProps {
  pkg?: Package | null;
  onClose: () => void;
  onSaved: (pkg: Package) => void;
}

function PackageDialog({ pkg, onClose, onSaved }: PackageDialogProps) {
  const [name, setName] = useState(pkg?.name || "");
  const [serviceType, setServiceType] = useState(pkg?.service_type || "PPPOE");
  const [downloadMbps, setDownloadMbps] = useState(pkg ? Math.round(pkg.download_speed_kbps / 1024) : 30);
  const [uploadMbps, setUploadMbps] = useState(pkg ? Math.round(pkg.upload_speed_kbps / 1024) : 30);
  const [validityDays, setValidityDays] = useState(pkg?.validity_days || 30);
  const [price, setPrice] = useState(pkg?.price || 1000);
  const [wholesalePrice, setWholesalePrice] = useState(pkg?.wholesale_price || 700);
  const [customRateLimit, setCustomRateLimit] = useState(pkg?.rate_limit_string || "");
  const [useBurst, setUseBurst] = useState(false);
  const [burstDownMbps, setBurstDownMbps] = useState(45);
  const [burstUpMbps, setBurstUpMbps] = useState(45);
  const [burstTime, setBurstTime] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-generate rate limit string preview
  const previewRateLimit = () => {
    if (customRateLimit) return customRateLimit;
    if (useBurst) {
      return `${uploadMbps}M/${downloadMbps}M ${burstUpMbps}M/${burstDownMbps}M ${Math.round(uploadMbps * 0.7)}M/${Math.round(downloadMbps * 0.7)}M ${burstTime}/${burstTime} 8`;
    }
    return `${uploadMbps}M/${downloadMbps}M`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      name,
      service_type: serviceType,
      download_speed_kbps: downloadMbps * 1024,
      upload_speed_kbps: uploadMbps * 1024,
      rate_limit_string: customRateLimit || previewRateLimit(),
      validity_days: Number(validityDays),
      price: Number(price),
      wholesale_price: Number(wholesalePrice),
    };

    try {
      if (pkg) {
        const res = await api.put<ApiResponse<Package>>(`/packages/${pkg.id}`, payload);
        if (res.data?.success && res.data.data) {
          onSaved(res.data.data);
          onClose();
        } else {
          setError(res.data?.error?.message || "Failed to update package");
        }
      } else {
        const res = await api.post<ApiResponse<Package>>("/packages", payload);
        if (res.data?.success && res.data.data) {
          onSaved(res.data.data);
          onClose();
        } else {
          setError(res.data?.error?.message || "Failed to create package");
        }
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setError(e.response?.data?.error?.message || "Network error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <PackageIcon className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-100">
                {pkg ? "Edit Bandwidth Package" : "Create Bandwidth Package"}
              </h2>
              <p className="text-xs text-zinc-500">Configure speed profiles and RADIUS rate limits</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="flex items-center space-x-2 p-3 bg-rose-950/50 border border-rose-800 rounded-xl text-xs text-rose-300">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Package Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. 30 Mbps Fiber Blast"
                className="w-full px-3 py-2 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Service Type</label>
              <select
                value={serviceType}
                onChange={e => setServiceType(e.target.value as 'PPPOE' | 'HOTSPOT' | 'STATIC')}
                className="w-full px-3 py-2 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="PPPOE">PPPoE Broadband</option>
                <option value="HOTSPOT">Hotspot Captive</option>
                <option value="STATIC">Static IP / Corporate</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Validity (Days)</label>
              <input
                type="number"
                min="1"
                required
                value={validityDays}
                onChange={e => setValidityDays(Number(e.target.value))}
                className="w-full px-3 py-2 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Download Speed (Mbps) *</label>
              <input
                type="number"
                min="1"
                required
                value={downloadMbps}
                onChange={e => setDownloadMbps(Number(e.target.value))}
                className="w-full px-3 py-2 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Upload Speed (Mbps) *</label>
              <input
                type="number"
                min="1"
                required
                value={uploadMbps}
                onChange={e => setUploadMbps(Number(e.target.value))}
                className="w-full px-3 py-2 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Retail Price (৳ BDT) *</label>
              <input
                type="number"
                min="0"
                step="50"
                required
                value={price}
                onChange={e => setPrice(Number(e.target.value))}
                className="w-full px-3 py-2 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Wholesale Price (৳ BDT)</label>
              <input
                type="number"
                min="0"
                step="50"
                value={wholesalePrice}
                onChange={e => setWholesalePrice(Number(e.target.value))}
                className="w-full px-3 py-2 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Burst Configuration Preview */}
          <div className="p-4 bg-zinc-950/70 border border-zinc-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-300">Burst Mode (Speed Booster)</span>
              <button
                type="button"
                onClick={() => setUseBurst(!useBurst)}
                className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition ${
                  useBurst
                    ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                    : "bg-zinc-800 text-zinc-400 border-zinc-700"
                }`}
              >
                {useBurst ? "Enabled" : "Disabled"}
              </button>
            </div>

            {useBurst && (
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800/80">
                <div>
                  <label className="block text-[11px] text-zinc-500 mb-1">Burst Down</label>
                  <input
                    type="number"
                    value={burstDownMbps}
                    onChange={e => setBurstDownMbps(Number(e.target.value))}
                    className="w-full px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-500 mb-1">Burst Up</label>
                  <input
                    type="number"
                    value={burstUpMbps}
                    onChange={e => setBurstUpMbps(Number(e.target.value))}
                    className="w-full px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-500 mb-1">Duration (s)</label>
                  <input
                    type="number"
                    value={burstTime}
                    onChange={e => setBurstTime(Number(e.target.value))}
                    className="w-full px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-100 font-mono"
                  />
                </div>
              </div>
            )}

            {/* Generated Rate-Limit Preview */}
            <div className="pt-2 border-t border-zinc-800 space-y-2">
              <span className="text-[11px] text-zinc-500 block">
                RADIUS <code className="text-zinc-400">Mikrotik-Rate-Limit</code> Attribute
              </span>
              <div className="p-2 bg-zinc-900 border border-zinc-800 rounded font-mono text-xs text-emerald-400 select-all">
                {previewRateLimit()}
              </div>
              <div>
                <label className="text-[11px] text-zinc-500 block mb-1">
                  Custom Override (Optional)
                </label>
                <input
                  type="text"
                  value={customRateLimit}
                  onChange={e => setCustomRateLimit(e.target.value)}
                  placeholder="e.g. 30M/30M or leave blank for auto"
                  className="w-full px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-200 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition flex items-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Saving...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{pkg ? "Update Package" : "Create Package"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// MAIN PACKAGES MANAGEMENT PAGE
// ============================================================
export default function PackagesPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPkg, setEditingPkg] = useState<Package | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const fetchPackages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<ApiResponse<Package[]>>("/packages");
      if (res.data?.success && res.data.data) {
        setPackages(res.data.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  const handleDelete = async (pkg: Package) => {
    if (!confirm(`Delete package "${pkg.name}"? Active customers on this package will remain unchanged.`)) return;
    try {
      await api.delete(`/packages/${pkg.id}`);
      setPackages(prev => prev.filter(p => p.id !== pkg.id));
      showToast(`Package "${pkg.name}" removed`);
    } catch {
      showToast("Failed to delete package");
    }
  };

  const filteredPackages = packages.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.rate_limit_string.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === "ALL" || p.service_type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-2 px-4 py-3 bg-zinc-900 border border-zinc-700 text-zinc-100 rounded-xl shadow-2xl text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 tracking-tight flex items-center space-x-2">
            <span>Packages & Bandwidth Profiles</span>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full">
              Phase 3
            </span>
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Configure subscriber bandwidth speed tiers, burst policies, and FreeRADIUS rate-limiting strings
          </p>
        </div>

        <button
          onClick={() => {
            setEditingPkg(null);
            setDialogOpen(true);
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-indigo-600/20 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create Package</span>
        </button>
      </div>

      {/* Metric summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-500 font-medium">Total Packages</span>
            <PackageIcon className="w-4 h-4 text-zinc-400" />
          </div>
          <span className="text-2xl font-bold text-zinc-100">{packages.length}</span>
        </div>
        <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-500 font-medium">PPPoE Fiber</span>
            <Wifi className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-2xl font-bold text-zinc-100">
            {packages.filter(p => p.service_type === "PPPOE").length}
          </span>
        </div>
        <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-500 font-medium">Hotspot Profiles</span>
            <Radio className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-2xl font-bold text-zinc-100">
            {packages.filter(p => p.service_type === "HOTSPOT").length}
          </span>
        </div>
        <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-500 font-medium">Avg Retail Price</span>
            <DollarSign className="w-4 h-4 text-indigo-400" />
          </div>
          <span className="text-2xl font-bold text-zinc-100 font-mono">
            ৳ {packages.length ? Math.round(packages.reduce((acc, p) => acc + p.price, 0) / packages.length) : 0}
          </span>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-zinc-900/60 border border-zinc-800 rounded-2xl">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search packages by name or speed..."
            className="w-full pl-9 pr-3 py-1.5 bg-zinc-950/60 border border-zinc-700/80 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center space-x-1.5 w-full sm:w-auto overflow-x-auto">
          {["ALL", "PPPOE", "HOTSPOT", "STATIC"].map(st => (
            <button
              key={st}
              onClick={() => setFilterType(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition shrink-0 ${
                filterType === st
                  ? "bg-indigo-600 text-white"
                  : "bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/80"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Package Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-zinc-500 bg-zinc-900/40 border border-zinc-800 rounded-2xl">
          Loading bandwidth packages...
        </div>
      ) : filteredPackages.length === 0 ? (
        <div className="p-12 text-center bg-zinc-900/40 border border-zinc-800 rounded-2xl">
          <PackageIcon className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-zinc-300">No Packages Found</h3>
          <p className="text-xs text-zinc-500 mt-1 mb-4">Create your first bandwidth subscription package to begin onboarding subscribers.</p>
          <button
            onClick={() => {
              setEditingPkg(null);
              setDialogOpen(true);
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition"
          >
            Create First Package
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPackages.map(pkg => {
            const downM = Math.round(pkg.download_speed_kbps / 1024);
            const upM = Math.round(pkg.upload_speed_kbps / 1024);
            const margin = pkg.price - pkg.wholesale_price;

            return (
              <div
                key={pkg.id}
                className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700/80 rounded-2xl p-5 flex flex-col justify-between transition group"
              >
                <div>
                  {/* Card top */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-bold text-zinc-100">{pkg.name}</h3>
                        <span className="px-2 py-0.5 text-[10px] font-semibold bg-zinc-800 text-zinc-300 rounded-full border border-zinc-700">
                          {pkg.service_type}
                        </span>
                      </div>
                      <span className="text-xs text-zinc-500 font-mono mt-0.5 block">
                        Validity: {pkg.validity_days} Days
                      </span>
                    </div>

                    <div className="flex items-center space-x-1 opacity-80 group-hover:opacity-100 transition">
                      <button
                        onClick={() => {
                          setEditingPkg(pkg);
                          setDialogOpen(true);
                        }}
                        className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg"
                        title="Edit package"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(pkg)}
                        className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 rounded-lg"
                        title="Delete package"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Speed Badges */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="p-2.5 bg-zinc-950/60 border border-zinc-800 rounded-xl">
                      <span className="text-[10px] text-zinc-500 font-medium block">DOWNLOAD</span>
                      <span className="text-base font-extrabold text-indigo-400 font-mono">
                        {downM} <span className="text-xs font-medium text-zinc-400">Mbps</span>
                      </span>
                    </div>
                    <div className="p-2.5 bg-zinc-950/60 border border-zinc-800 rounded-xl">
                      <span className="text-[10px] text-zinc-500 font-medium block">UPLOAD</span>
                      <span className="text-base font-extrabold text-cyan-400 font-mono">
                        {upM} <span className="text-xs font-medium text-zinc-400">Mbps</span>
                      </span>
                    </div>
                  </div>

                  {/* RADIUS Rate Limit String */}
                  <div className="p-2.5 bg-zinc-950/80 border border-zinc-800/80 rounded-xl mb-4">
                    <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1">
                      <span className="flex items-center space-x-1">
                        <Zap className="w-3 h-3 text-amber-400" />
                        <span>Mikrotik-Rate-Limit</span>
                      </span>
                      <span className="font-mono text-zinc-400">FreeRADIUS</span>
                    </div>
                    <div className="font-mono text-xs text-emerald-400 select-all truncate">
                      {pkg.rate_limit_string}
                    </div>
                  </div>
                </div>

                {/* Pricing & Margins */}
                <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-zinc-500 block">RETAIL PRICE</span>
                    <span className="text-lg font-bold text-zinc-100 font-mono">
                      ৳ {pkg.price}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-zinc-500 block">WHOLESALE / MARGIN</span>
                    <span className="text-xs text-zinc-400 font-mono">
                      ৳ {pkg.wholesale_price} <span className="text-emerald-400 font-semibold">(+৳{margin})</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog */}
      {dialogOpen && (
        <PackageDialog
          pkg={editingPkg}
          onClose={() => {
            setDialogOpen(false);
            setEditingPkg(null);
          }}
          onSaved={saved => {
            setPackages(prev => {
              const idx = prev.findIndex(p => p.id === saved.id);
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = saved;
                return next;
              }
              return [saved, ...prev];
            });
            showToast(`Package "${saved.name}" saved successfully`);
          }}
        />
      )}
    </div>
  );
}
