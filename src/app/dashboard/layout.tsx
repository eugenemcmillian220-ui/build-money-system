"use client";

import { Sidebar } from "@/components/dashboard/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-brand-500/30">
      <Sidebar />
      <main className="lg:ml-64 transition-all duration-300">
        {children}
      </main>
    </div>
  );
}
