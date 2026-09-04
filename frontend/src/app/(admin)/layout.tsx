"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/shared/Sidebar";
import Header from "@/components/shared/Header";
import { useAuth } from "@/context/AuthContext";
import { Network } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, token, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !token && !user) {
      router.push("/login?redirect=/admin/dashboard");
    }
  }, [isLoading, token, user, router]);

  // Loading Screen while resolving session
  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-4 animate-pulse">
          <Network className="w-6 h-6 text-zinc-950 font-black" />
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
            Loading Admin Shell...
          </span>
        </div>
      </div>
    );
  }

  // Not authenticated screen (prior to redirect)
  if (!user && !token) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 text-xs font-mono text-zinc-500">
        Redirecting to login...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col antialiased">
      {/* Sidebar navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area (Offset for lg screen sidebar: 64 = 16rem) */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Sticky Header */}
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
          {children}
        </main>

        {/* Global Admin Shell Footer */}
        <footer className="border-t border-zinc-900 bg-zinc-950/50 py-3 px-6 text-center text-[11px] font-mono text-zinc-600">
          <span>Maxzone ISP-ERP &copy; 2026</span>
          <span className="mx-2">•</span>
          <span>Role: <strong className="text-emerald-400">{user?.role || "SUPER_ADMIN"}</strong></span>
          <span className="mx-2">•</span>
          <span>Engine: <span className="text-zinc-400">Go 1.23 + Next.js 15</span></span>
        </footer>
      </div>
    </div>
  );
}
