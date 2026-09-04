"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  ShieldCheck,
  Package as PackageIcon,
  Phone,
  Mail,
  MapPin,
  Router as RouterIcon,
} from "lucide-react";
import api from "@/lib/api";
import { Customer360Detail, ApiResponse } from "@/types";

export interface CustomerDrawerProps {
  customerId: string;
  onClose: () => void;
}

export function CustomerDrawer({ customerId, onClose }: CustomerDrawerProps) {
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

export default CustomerDrawer;
