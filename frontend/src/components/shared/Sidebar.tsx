"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Router as RouterIcon,
  Zap,
  Package,
  Briefcase,
  CreditCard,
  MapPin,
  LifeBuoy,
  Settings,
  Network,
  Radio
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

const navItems = [
  {
    name: "Dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
    badge: "Live",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  {
    name: "Customers",
    href: "/admin/customers",
    icon: Users,
    badge: "Live",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  {
    name: "Routers & NAS",
    href: "/admin/mikrotik",
    icon: RouterIcon,
    badge: "Live",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  {
    name: "OLT & PON",
    href: "/admin/olt",
    icon: Zap,
    badge: "Phase 6",
  },
  {
    name: "Packages",
    href: "/admin/packages",
    icon: Package,
    badge: "Live",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  {
    name: "Resellers",
    href: "/admin/resellers",
    icon: Briefcase,
    badge: "Live",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  {
    name: "Billing & Pay",
    href: "/admin/billing",
    icon: CreditCard,
    badge: "Live",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  {
    name: "GIS Fiber Map",
    href: "/admin/gis",
    icon: MapPin,
    badge: "Phase 7",
  },
  {
    name: "Helpdesk NOC",
    href: "/admin/support",
    icon: LifeBuoy,
    badge: "Phase 8",
  },
  {
    name: "System Settings",
    href: "/admin/settings",
    icon: Settings,
    badge: null,
  },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm z-40 lg:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-64 bg-zinc-950 border-r border-zinc-800/80 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-zinc-800/80 flex items-center justify-between">
          <Link href="/admin/dashboard" className="flex items-center space-x-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <Network className="w-5 h-5 text-zinc-950 font-black" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
                  MAXZONE
                </span>
                <span className="text-[10px] uppercase font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                  ERP
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 font-mono">Super Admin Console</p>
            </div>
          </Link>

          {/* Close button on mobile */}
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-lg"
              aria-label="Close menu"
            >
              ✕
            </button>
          )}
        </div>

        {/* Navigation Modules */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-thin scrollbar-thumb-zinc-800">
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Core Modules
          </div>

          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/admin/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/80 border border-transparent"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? "text-emerald-400" : "text-zinc-500 group-hover:text-zinc-300"
                    }`}
                  />
                  <span>{item.name}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                      item.badgeColor ||
                      (isActive
                        ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                        : "bg-zinc-900 text-zinc-500 border-zinc-800")
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* System Status Footer */}
        <div className="p-3 border-t border-zinc-800/80 bg-zinc-900/30">
          <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-1.5 text-zinc-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-mono text-[11px]">FreeRADIUS AAA</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-400">ONLINE</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-1.5 text-zinc-400">
                <Radio className="w-3 h-3 text-cyan-400" />
                <span className="font-mono text-[11px]">MikroTik CoA</span>
              </span>
              <span className="text-[10px] font-mono text-cyan-400">PORT 3799</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
