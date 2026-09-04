"use client";

import React, { useState, useEffect } from "react";
import { Users, AlertTriangle, CheckCircle2, X } from "lucide-react";
import api from "@/lib/api";
import { Package, NASRouter, Customer360Detail, ApiResponse } from "@/types";

export interface AddCustomerDialogProps {
  onClose: () => void;
  onCreated: () => void;
}

export function AddCustomerDialog({ onClose, onCreated }: AddCustomerDialogProps) {
  const [packages, setPackages] = useState<Package[]>([]);
  const [routers, setRouters] = useState<NASRouter[]>([]);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    address_line1: "",
    zone_area: "Zone A - Central",
    nid_passport: "",
    billing_type: "PREPAID",
    billing_cycle: "CALENDAR_MONTH",
    username: "",
    password: "",
    package_id: "",
    nas_id: "",
    static_ip: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch packages & routers for dropdowns
    api.get<ApiResponse<Package[]>>("/packages").then(res => {
      if (res.data?.success && res.data.data) {
        setPackages(res.data.data);
        if (res.data.data.length > 0) {
          setForm(prev => ({ ...prev, package_id: res.data.data![0].id }));
        }
      }
    });

    api.get<ApiResponse<NASRouter[]>>("/mikrotik/routers").then(res => {
      if (res.data?.success && res.data.data) {
        setRouters(res.data.data);
        if (res.data.data.length > 0) {
          setForm(prev => ({ ...prev, nas_id: res.data.data![0].id }));
        }
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      ...form,
      static_ip: form.static_ip ? form.static_ip : undefined,
    };

    try {
      const res = await api.post<ApiResponse<Customer360Detail>>("/customers", payload);
      if (res.data?.success) {
        onCreated();
        onClose();
      } else {
        setError(res.data?.error?.message || "Failed to onboard customer");
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
      <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-100">Add New Subscriber (Customer Onboarding)</h2>
              <p className="text-xs text-zinc-500">
                Provisions subscriber profile and synchronizes credentials to FreeRADIUS
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          {error && (
            <div className="flex items-center space-x-2 p-3 bg-rose-950/50 border border-rose-800 rounded-xl text-xs text-rose-300">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Personal Info */}
          <div>
            <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-3">
              1. Subscriber Profile & Contact
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">First Name *</label>
                <input
                  type="text"
                  required
                  value={form.first_name}
                  onChange={e => setForm({ ...form, first_name: e.target.value })}
                  placeholder="e.g. Karim"
                  className="w-full px-3 py-2 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Last Name</label>
                <input
                  type="text"
                  value={form.last_name}
                  onChange={e => setForm({ ...form, last_name: e.target.value })}
                  placeholder="e.g. Ahmed"
                  className="w-full px-3 py-2 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Phone Number *</label>
                <input
                  type="text"
                  required
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  placeholder="01711223344"
                  className="w-full px-3 py-2 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Email (Optional)</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="karim@example.com"
                  className="w-full px-3 py-2 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Installation Address *</label>
                <input
                  type="text"
                  required
                  value={form.address_line1}
                  onChange={e => setForm({ ...form, address_line1: e.target.value })}
                  placeholder="Flat 4B, House 12, Road 4, Sector 7, Uttara"
                  className="w-full px-3 py-2 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Zone / Area</label>
                <input
                  type="text"
                  value={form.zone_area}
                  onChange={e => setForm({ ...form, zone_area: e.target.value })}
                  placeholder="Zone A"
                  className="w-full px-3 py-2 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">NID / Passport</label>
                <input
                  type="text"
                  value={form.nid_passport}
                  onChange={e => setForm({ ...form, nid_passport: e.target.value })}
                  placeholder="199226926..."
                  className="w-full px-3 py-2 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: PPPoE / RADIUS Credentials */}
          <div className="pt-2 border-t border-zinc-800">
            <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-3">
              2. PPPoE & FreeRADIUS AAA Provisioning
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">PPPoE Username *</label>
                <input
                  type="text"
                  required
                  value={form.username}
                  onChange={e => setForm({ ...form, username: e.target.value })}
                  placeholder="karim_fiber"
                  className="w-full px-3 py-2 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">PPPoE Password *</label>
                <input
                  type="text"
                  required
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="pass123"
                  className="w-full px-3 py-2 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Assigned Package *</label>
                <select
                  value={form.package_id}
                  onChange={e => setForm({ ...form, package_id: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {packages.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.rate_limit_string}) - ৳ {p.price}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Edge NAS Router *</label>
                <select
                  value={form.nas_id}
                  onChange={e => setForm({ ...form, nas_id: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {routers.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.ip_address})
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Static IP (Optional)</label>
                <input
                  type="text"
                  value={form.static_ip}
                  onChange={e => setForm({ ...form, static_ip: e.target.value })}
                  placeholder="e.g. 10.10.20.100 (Leave empty for dynamic IP pool)"
                  className="w-full px-3 py-2 bg-zinc-950/60 border border-zinc-700 rounded-xl text-sm text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
              className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition flex items-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Onboarding...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Provision Subscriber</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddCustomerDialog;
