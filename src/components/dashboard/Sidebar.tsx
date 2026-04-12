"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { signOut } from "@/lib/auth-actions";
import {
  LayoutDashboard,
  Terminal,
  Package,
  CreditCard,
  ShieldCheck,
  Zap,
  Globe,
  Settings,
  Menu,
  X,
  LogOut,
  Book,
  LayoutGrid
} from "lucide-react";


import { useState } from "react";

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Blueprints", href: "/dashboard/blueprints", icon: Package },
    { name: "Guide", href: "/dashboard/guide", icon: Book },
    { name: "AI Terminal", href: "/dashboard/terminal", icon: Terminal },
    { name: "Projects", href: "/dashboard/projects", icon: Package },
    { name: "Billing", href: "/dashboard/billing", icon: CreditCard },
  ];

  const phaseLinks = [
    { id: 1, name: "Ph 1: Component", href: "/dashboard/phases/1" },
    { id: 2, name: "Ph 2: SQL Forge", href: "/dashboard/phases/2" },
    { id: 3, name: "Ph 3: Deploy", href: "/dashboard/phases/3" },
    { id: 4, name: "Ph 4: Sentinel", href: "/dashboard/phases/4" },
    { id: 5, name: "Ph 5: Growth", href: "/dashboard/phases/5" },
    { id: 6, name: "Ph 6: Revenue", href: "/dashboard/phases/6" },
    { id: 7, name: "Ph 7: Healer", href: "/dashboard/phases/7" },
    { id: 8, name: "Ph 8: DevOS", href: "/dashboard/phases/8" },
    { id: 9, name: "Ph 9: Vision", href: "/dashboard/phases/9" },
    { id: 10, name: "Ph 10: Economy", href: "/dashboard/phases/10" },
    { id: 11, name: "Ph 11: Hype", href: "/dashboard/phases/11" },
    { id: 12, name: "Ph 12: Governance", href: "/dashboard/phases/12" },
    { id: 13, name: "Ph 13: VC Deals", href: "/dashboard/phases/13" },
    { id: 14, name: "Ph 14: Diplomacy", href: "/dashboard/phases/14" },
    { id: 15, name: "Ph 15: Hive Mind", href: "/dashboard/phases/15" },
    { id: 16, name: "Ph 16: M&A", href: "/dashboard/phases/16" },
    { id: 17, name: "Ph 17: Legal Vault", href: "/dashboard/phases/17" },
    { id: 18, name: "Ph 18: R&D Scout", href: "/dashboard/phases/18" },
    { id: 19, name: "Ph 19: Forge", href: "/dashboard/phases/19" },
    { id: 20, name: "Ph 20: Lifecycle", href: "/dashboard/phases/20" },
    { id: 21, name: "Ph 21: Overseer", href: "/dashboard/phases/21" },
  ];

  return (
    <>
      {/* Mobile Toggle */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white/5 border border-white/10 rounded-xl"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-black/50 backdrop-blur-xl border-r border-white/10 transform transition-transform duration-300 lg:translate-x-0
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="flex flex-col h-full p-6">
          <div className="mb-10 px-2">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
                <Zap size={18} className="text-white" fill="currentColor" />
              </div>
              <span className="font-black text-xl tracking-tighter uppercase italic">Sovereign</span>
            </Link>
          </div>

          <nav className="flex-1 space-y-8 overflow-y-auto custom-scrollbar pr-2">
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href as Route}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all
                      ${isActive ? "bg-white text-black shadow-lg" : "text-muted-foreground hover:text-white hover:bg-white/5"}
                    `}
                  >
                    <Icon size={18} />
                    {item.name}
                  </Link>
                );
              })}
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 px-4">
                <LayoutGrid size={14} className="text-brand-400" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Forge Phases</span>
              </div>
              <div className="space-y-1">
                {phaseLinks.map((phase) => {
                  const isActive = pathname === phase.href;
                  return (
                    <Link
                      key={phase.id}
                      href={phase.href as Route}
                      className={`
                        block px-4 py-2 rounded-lg text-[11px] font-bold transition-all
                        ${isActive ? "text-brand-400 bg-brand-500/5" : "text-muted-foreground hover:text-white hover:bg-white/5"}
                      `}
                    >
                      {phase.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          </nav>

          <div className="mt-auto pt-6 border-t border-white/5 space-y-1 px-2">
            <Link
              href="/dashboard/settings"
              className={`
                flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all
                ${pathname === "/dashboard/settings" ? "bg-white text-black shadow-lg" : "text-muted-foreground hover:text-white hover:bg-white/5"}
              `}
            >
              <Settings size={18} />
              <span className="uppercase tracking-widest text-[10px]">Settings</span>
            </Link>

            <button
              onClick={() => signOut()}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-400/60 hover:text-red-400 hover:bg-red-500/5 transition-all"
            >
              <LogOut size={18} />
              <span className="uppercase tracking-widest text-[10px]">Logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
