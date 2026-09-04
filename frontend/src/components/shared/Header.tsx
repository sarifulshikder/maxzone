"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  Search, 
  Bell, 
  Menu, 
  Sun, 
  Moon, 
  LogOut, 
  ShieldCheck, 
  ChevronDown,
  Command,
  Activity,
  CheckCircle2,
  ExternalLink
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

interface HeaderProps {
  onToggleSidebar: () => void;
}

export default function Header({ onToggleSidebar }: HeaderProps) {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDark, setIsDark] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    const root = document.documentElement;
    if (isDark) {
      root.classList.remove("dark");
      root.classList.add("light");
    } else {
      root.classList.remove("light");
      root.classList.add("dark");
    }
  };

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/80 px-4 sm:px-6 flex items-center justify-between">
      {/* Left: Mobile Toggle & Quick Search */}
      <div className="flex items-center space-x-4 flex-1 max-w-xl">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 rounded-xl"
          aria-label="Toggle navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Quick Search Bar */}
        <div className="relative w-full hidden sm:block">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Global Search: User, IP, MAC, Phone (Cmd+K)"
            className="w-full pl-9 pr-12 py-2 bg-zinc-900/90 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-mono"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-zinc-500 bg-zinc-800 rounded border border-zinc-700">
              <Command className="w-2.5 h-2.5" /> K
            </kbd>
          </div>
        </div>
      </div>

      {/* Right Action Controls */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Core System Health indicator badge */}
        <div className="hidden md:flex items-center space-x-2 px-2.5 py-1 rounded-full bg-emerald-950/50 border border-emerald-800/60 text-emerald-400 text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-mono text-[11px] font-medium">SYS: ALL SYSTEMS NORMAL</span>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle color theme"
          className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 rounded-xl border border-zinc-800 transition-colors"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 rounded-xl border border-zinc-800 transition-colors relative"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full" />
          </button>

          {/* Notifications Dropdown */}
          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-4 text-xs space-y-3 z-50">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="font-bold text-zinc-200">System Notifications</span>
                <span className="text-[10px] font-mono text-emerald-400">1 New</span>
              </div>
              <div className="space-y-2">
                <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
                  <div className="flex items-center space-x-1.5 text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Phase 1 Authentication Initialized</span>
                  </div>
                  <p className="text-zinc-400 text-[11px]">
                    Super Admin authenticated via Go JWT service with DB session persistence.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center space-x-2.5 pl-2 pr-2.5 py-1.5 bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-800 rounded-xl transition-all"
            aria-label="User profile menu"
          >
            {/* Avatar */}
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-zinc-950 font-bold text-xs shadow-sm">
              {user?.first_name ? user.first_name[0] : "A"}
            </div>

            {/* Name & Role */}
            <div className="text-left hidden sm:block">
              <div className="text-xs font-semibold text-zinc-200 leading-tight">
                {user ? `${user.first_name} ${user.last_name || ""}` : "System Admin"}
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-[10px] font-mono text-emerald-400 font-semibold uppercase">
                  {user?.role || "SUPER_ADMIN"}
                </span>
              </div>
            </div>

            <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
          </button>

          {/* User Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2">
              {/* User Details */}
              <div className="p-3 border-b border-zinc-800 mb-1 space-y-1">
                <p className="text-xs font-bold text-zinc-100">
                  {user ? `${user.first_name} ${user.last_name || ""}` : "System Administrator"}
                </p>
                <p className="text-[11px] font-mono text-zinc-400 truncate">
                  {user?.email || "admin@maxzone.local"}
                </p>
                <div className="pt-1.5 flex items-center space-x-1.5">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center space-x-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>{user?.role || "SUPER_ADMIN"}</span>
                  </span>
                </div>
              </div>

              {/* Menu items */}
              <div className="space-y-0.5">
                <Link
                  href="/admin/dashboard"
                  onClick={() => setDropdownOpen(false)}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/60 rounded-xl transition-colors"
                >
                  <Activity className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Admin Dashboard</span>
                </Link>

                <Link
                  href="/"
                  onClick={() => setDropdownOpen(false)}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/60 rounded-xl transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                  <span>System Diagnostics</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-colors mt-1 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-400" />
                  <span className="font-medium">Logout Session</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
