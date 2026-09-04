"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  X,
  Phone,
  Mail,
  MapPin,
  Router as RouterIcon,
  Package as PackageIcon,
  ShieldCheck,
  ChevronRight,
  Trash2,
} from "lucide-react";
import api from "@/lib/api";
import {
  CustomerListItem,
  Customer360Detail,
  Package,
  NASRouter,
  ApiResponse,
} from "@/types";

// ============================================================
// ADD CUSTOMER MODAL
// ============================================================
interface AddCustomerDialogProps {
  onClose: () => void;
  onCreated: () => void;
}

function AddCustomerDialog({ onClose, onCreated }: AddCustomerDialogProps) {
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

// ============================================================
// CUSTOMER 360 SLIDE-OUT DRAWER
// ============================================================
interface Customer360DrawerProps {
  customerId: string;
  onClose: () => void;
}

function Customer360Drawer({ customerId, onClose }: Customer360DrawerProps) {
  const [detail, setDetail] = useState<Customer360Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "radius" | "network">("overview");

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<ApiResponse<Customer360Detail>>(`/customers/${customerId}`);
      if (res.data?.success && res.data.data) {
        setDetail(res.data.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  if (loading || !detail) {
    return (
      <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-zinc-900 border-l border-zinc-800 shadow-2xl z-50 flex items-center justify-center p-6 text-xs text-zinc-400">
        Loading Customer 360 diagnostics...
      </div>
    );
  }

  const { customer, service_account, package: pkg, router, radius_check, radius_reply } = detail;

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-zinc-900 border-l border-zinc-800 shadow-2xl z-50 flex flex-col">
      {/* Drawer Topbar */}
      <div className="p-6 border-b border-zinc-800 flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-mono text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              {customer.customer_code}
            </span>
            <h2 className="text-base font-bold text-zinc-100">
              {customer.user ? `${customer.user.first_name} ${customer.user.last_name || ""}` : "Customer Details"}
            </h2>
          </div>
          <span className="text-xs text-zinc-500 mt-0.5 block font-mono">
            PPPoE Username: <strong className="text-zinc-300">{service_account.username}</strong>
          </span>
        </div>
        <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 px-6 pt-3 border-b border-zinc-800 shrink-0">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-3 py-2 text-xs font-semibold border-b-2 transition ${
            activeTab === "overview"
              ? "border-emerald-500 text-emerald-400"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Customer Overview
        </button>
        <button
          onClick={() => setActiveTab("radius")}
          className={`px-3 py-2 text-xs font-semibold border-b-2 transition flex items-center space-x-1.5 ${
            activeTab === "radius"
              ? "border-emerald-500 text-emerald-400"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>RADIUS AAA Tab</span>
        </button>
        <button
          onClick={() => setActiveTab("network")}
          className={`px-3 py-2 text-xs font-semibold border-b-2 transition ${
            activeTab === "network"
              ? "border-emerald-500 text-emerald-400"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          NAS & Network
        </button>
      </div>

      {/* Drawer Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {activeTab === "overview" && (
          <div className="space-y-4">
            {/* Status Card */}
            <div className="p-4 bg-zinc-950/60 border border-zinc-800 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Service Status</span>
                <span className="inline-flex items-center space-x-1.5 mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{service_account.status}</span>
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Expires At</span>
                <span className="text-xs font-mono text-zinc-200 block mt-1">
                  {new Date(service_account.expires_at).toLocaleDateString()} (
                  {new Date(service_account.expires_at).toLocaleTimeString()})
                </span>
              </div>
            </div>

            {/* Plan Card */}
            <div className="p-4 bg-zinc-950/60 border border-zinc-800 rounded-2xl space-y-3">
              <span className="text-xs font-semibold text-zinc-300 block">Subscription Package</span>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                    <PackageIcon className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-zinc-100">{pkg.name}</h4>
                    <span className="text-xs text-zinc-500 font-mono">{pkg.rate_limit_string}</span>
                  </div>
                </div>
                <span className="text-base font-bold text-zinc-100 font-mono">
                  ৳ {pkg.price} <span className="text-xs text-zinc-500 font-normal">/ mo</span>
                </span>
              </div>
            </div>

            {/* Contact Details */}
            <div className="p-4 bg-zinc-950/60 border border-zinc-800 rounded-2xl space-y-3">
              <span className="text-xs font-semibold text-zinc-300 block">Contact Information</span>
              <div className="space-y-2 text-xs">
                <div className="flex items-center space-x-2 text-zinc-400">
                  <Phone className="w-4 h-4 text-zinc-500" />
                  <span className="font-mono text-zinc-200">{customer.user?.phone || "--"}</span>
                </div>
                <div className="flex items-center space-x-2 text-zinc-400">
                  <Mail className="w-4 h-4 text-zinc-500" />
                  <span className="text-zinc-200">{customer.user?.email || "--"}</span>
                </div>
                <div className="flex items-start space-x-2 text-zinc-400">
                  <MapPin className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                  <span className="text-zinc-200">{customer.address_line1}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "radius" && (
          <div className="space-y-5">
            <div className="p-3.5 bg-emerald-950/20 border border-emerald-800/40 rounded-xl text-xs text-emerald-300 flex items-start space-x-2">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                These attributes are active in PostgreSQL FreeRADIUS tables and verified for MikroTik AAA auth.
              </span>
            </div>

            {/* RadCheck Table */}
            <div>
              <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>radcheck Attributes (Credentials Check)</span>
                <span className="font-mono text-[10px] text-zinc-500">FreeRADIUS 3.x</span>
              </h3>
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-zinc-900 text-zinc-400 font-mono text-[11px] border-b border-zinc-800">
                    <tr>
                      <th className="px-3 py-2">Username</th>
                      <th className="px-3 py-2">Attribute</th>
                      <th className="px-3 py-2">Op</th>
                      <th className="px-3 py-2">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800 font-mono">
                    {radius_check.map(rc => (
                      <tr key={rc.id} className="text-zinc-300">
                        <td className="px-3 py-2 text-zinc-400">{rc.username}</td>
                        <td className="px-3 py-2 text-indigo-400 font-semibold">{rc.attribute}</td>
                        <td className="px-3 py-2 text-zinc-500">{rc.op}</td>
                        <td className="px-3 py-2 text-emerald-400 font-bold bg-zinc-900/50">{rc.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* RadReply Table */}
            <div>
              <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>radreply Attributes (Rate Limit & PPP Response)</span>
                <span className="font-mono text-[10px] text-zinc-500">FreeRADIUS 3.x</span>
              </h3>
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-zinc-900 text-zinc-400 font-mono text-[11px] border-b border-zinc-800">
                    <tr>
                      <th className="px-3 py-2">Username</th>
                      <th className="px-3 py-2">Attribute</th>
                      <th className="px-3 py-2">Op</th>
                      <th className="px-3 py-2">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800 font-mono">
                    {radius_reply.map(rr => (
                      <tr key={rr.id} className="text-zinc-300">
                        <td className="px-3 py-2 text-zinc-400">{rr.username}</td>
                        <td className="px-3 py-2 text-amber-400 font-semibold">{rr.attribute}</td>
                        <td className="px-3 py-2 text-zinc-500">{rr.op}</td>
                        <td className="px-3 py-2 text-emerald-400 font-bold bg-zinc-900/50">{rr.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "network" && (
          <div className="space-y-4">
            <div className="p-4 bg-zinc-950/60 border border-zinc-800 rounded-2xl space-y-3">
              <span className="text-xs font-semibold text-zinc-300 block">Gateway NAS Router</span>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <RouterIcon className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-zinc-100">{router.name}</h4>
                    <span className="text-xs text-zinc-500 font-mono">{router.ip_address}</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-zinc-800 text-zinc-300 rounded border border-zinc-700">
                  {router.router_os_version}
                </span>
              </div>
            </div>

            <div className="p-4 bg-zinc-950/60 border border-zinc-800 rounded-2xl space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-zinc-800">
                <span className="text-zinc-500">Assigned IP Address:</span>
                <span className="text-zinc-200 font-bold">{service_account.static_ip || "Dynamic from IP Pool"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800">
                <span className="text-zinc-500">Service Protocol:</span>
                <span className="text-indigo-400">{service_account.service_type}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-zinc-500">MAC / Calling Station:</span>
                <span className="text-zinc-400">{service_account.last_calling_station_id || "Unbound"}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// MAIN CUSTOMERS MANAGEMENT PAGE
// ============================================================
export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<ApiResponse<{ items: CustomerListItem[]; total: number }>>("/customers", {
        params: {
          search: search || undefined,
          status: statusFilter,
        },
      });
      if (res.data?.success && res.data.data) {
        setCustomers(res.data.data.items || []);
        setTotal(res.data.data.total || 0);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete customer "${name}"? This removes subscriber profile and RADIUS check/reply credentials.`)) return;
    try {
      await api.delete(`/customers/${id}`);
      setCustomers(prev => prev.filter(c => c.id !== id));
      showToast(`Subscriber "${name}" deleted`);
    } catch {
      showToast("Failed to delete customer");
    }
  };

  const activeCount = customers.filter(c => c.status === "ACTIVE").length;
  const graceCount = customers.filter(c => c.status === "GRACE").length;

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
            <span>Customer & Subscriber Management</span>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
              Phase 3
            </span>
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            PPPoE subscriber lifecycle, FreeRADIUS AAA synchronization, and Customer 360 profile inspection
          </p>
        </div>

        <button
          onClick={() => setDialogOpen(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-emerald-600/20 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Customer</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl">
          <span className="text-xs text-zinc-500 font-medium block mb-2">Total Subscribers</span>
          <span className="text-2xl font-bold text-zinc-100">{total}</span>
        </div>
        <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl">
          <span className="text-xs text-zinc-500 font-medium block mb-2">Active PPPoE</span>
          <span className="text-2xl font-bold text-emerald-400">{activeCount}</span>
        </div>
        <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl">
          <span className="text-xs text-zinc-500 font-medium block mb-2">In Grace Period</span>
          <span className="text-2xl font-bold text-amber-400">{graceCount}</span>
        </div>
        <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl">
          <span className="text-xs text-zinc-500 font-medium block mb-2">Expired</span>
          <span className="text-2xl font-bold text-zinc-500">
            {customers.filter(c => c.status === "EXPIRED").length}
          </span>
        </div>
      </div>

      {/* Search & Status Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-zinc-900/60 border border-zinc-800 rounded-2xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, phone, username, code..."
            className="w-full pl-9 pr-3 py-1.5 bg-zinc-950/60 border border-zinc-700/80 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center space-x-1.5 w-full sm:w-auto overflow-x-auto">
          {["ALL", "ACTIVE", "GRACE", "EXPIRED", "SUSPENDED"].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition shrink-0 ${
                statusFilter === st
                  ? "bg-emerald-600 text-white"
                  : "bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/80"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Customer Virtualized / Card Table */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-zinc-500">Loading subscribers...</div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-zinc-300">No Customers Found</h3>
            <p className="text-xs text-zinc-500 mt-1 mb-4">
              Get started by provisioning your first broadband subscriber.
            </p>
            <button
              onClick={() => setDialogOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition"
            >
              Add First Customer
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-zinc-950/70 border-b border-zinc-800 text-zinc-400 font-mono text-[11px]">
                <tr>
                  <th className="px-4 py-3">Code / Name</th>
                  <th className="px-4 py-3">PPPoE User</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Package / Speed</th>
                  <th className="px-4 py-3">Router</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Expires</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {customers.map(c => (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedCustomerId(c.id)}
                    className="hover:bg-zinc-800/50 cursor-pointer transition group"
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-[11px] text-zinc-500 block">{c.customer_code}</span>
                      <span className="font-semibold text-zinc-100 block">{c.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-emerald-400 font-medium bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-800/30">
                        {c.username}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-zinc-300 block">{c.phone}</span>
                      <span className="text-[11px] text-zinc-500 block">{c.zone_area || "Zone A"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-zinc-200 block">{c.package_name}</span>
                      <span className="font-mono text-[10px] text-zinc-400 block">{c.package_speed}</span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{c.router_name || "CCR Core"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          c.status === "ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : c.status === "GRACE"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-zinc-400">
                      {new Date(c.expires_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => setSelectedCustomerId(c.id)}
                          className="p-1.5 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 rounded-lg"
                          title="Customer 360"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id, c.name)}
                          className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 rounded-lg"
                          title="Delete subscriber"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Customer Dialog */}
      {dialogOpen && (
        <AddCustomerDialog
          onClose={() => setDialogOpen(false)}
          onCreated={() => {
            fetchCustomers();
            showToast("Subscriber successfully provisioned & synced to FreeRADIUS");
          }}
        />
      )}

      {/* Customer 360 Drawer */}
      {selectedCustomerId && (
        <Customer360Drawer
          customerId={selectedCustomerId}
          onClose={() => setSelectedCustomerId(null)}
        />
      )}
    </div>
  );
}
