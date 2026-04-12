"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
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
  X
} from "lucide-react";
import { useState } from "react";

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "AI Terminal", href: "/dashboard/terminal", icon: Terminal },
    { name: "Projects", href: "/dashboard/projects", icon: Package },
    { name: "Billing", href: "/dashboard/billing", icon: CreditCard },
    { name: "Governance", href: "/dashboard/governance", icon: ShieldCheck },
    { name: "Marketplace", href: "/marketplace", icon: Globe },
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

          <nav className="flex-1 space-y-1">
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
          </nav>

          <div className="mt-auto pt-6 border-t border-white/5 px-2">
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
          </div>
        </div>
      </aside>
    </>
  );
}
