"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "@/lib/auth-actions";
import { supabase } from "@/lib/supabase/client";
import { isAdminEmail } from "@/lib/admin-emails";
import {
  LayoutDashboard,
  Terminal,
  Package,
  CreditCard,
  ShieldCheck,
  Zap,
  Settings,
  Menu,
  X,
  LogOut,
  Book,
  Gavel,
  Activity,
  ChevronRight,
  Crown,
} from "lucide-react";

interface PhaseCategory {
  id: string;
  label: string;
  phases: { id: number; name: string }[];
}

const PHASE_GROUPS: PhaseCategory[] = [
  {
    id: "foundation",
    label: "Foundation",
    phases: [
      { id: 1, name: "Component Forge" },
      { id: 2, name: "SQL Forge" },
      { id: 3, name: "Deployment" },
      { id: 4, name: "Sentinel" },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    phases: [
      { id: 5, name: "Growth Lab" },
      { id: 6, name: "Revenue Engine" },
      { id: 7, name: "Healer" },
      { id: 8, name: "DevOS Sandbox" },
      { id: 9, name: "Vision" },
    ],
  },
  {
    id: "economy",
    label: "Economy & Hype",
    phases: [
      { id: 10, name: "Sovereign Economy" },
      { id: 11, name: "Hype Agent" },
      { id: 12, name: "Governance" },
    ],
  },
  {
    id: "capital",
    label: "Capital & Expansion",
    phases: [
      { id: 13, name: "VC Deals" },
      { id: 14, name: "Diplomacy" },
      { id: 15, name: "Hive Mind" },
      { id: 16, name: "M&A Broker" },
    ],
  },
  {
    id: "sovereignty",
    label: "Sovereignty",
    phases: [
      { id: 17, name: "Legal Vault" },
      { id: 18, name: "R&D Scout" },
      { id: 19, name: "Sovereign DAO" },
      { id: 20, name: "Lifecycle" },
      { id: 21, name: "Overseer" },
    ],
  },
  {
    id: "federation",
    label: "Federation",
    phases: [
      { id: 22, name: "Swarm Mesh" },
      { id: 23, name: "Sovereign Pulse" },
      { id: 24, name: "Self-Evolution" },
      { id: 25, name: "Neural Link" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
  }, []);

  const admin = isAdminEmail(email);

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Blueprints", href: "/dashboard/blueprints", icon: Package },
    { name: "Guide", href: "/dashboard/guide", icon: Book },
    { name: "AI Terminal", href: "/dashboard/terminal", icon: Terminal },
    { name: "Projects", href: "/dashboard/projects", icon: Package },
    { name: "QA Audit", href: "/dashboard/qa", icon: ShieldCheck },
    { name: "Governance", href: "/dashboard/governance", icon: Gavel },
    { name: "Sovereign Pulse", href: "/dashboard/pulse", icon: Activity },
    { name: "Billing", href: "/dashboard/billing", icon: CreditCard },
  ];

  // Auto-open the group that contains the active phase.
  useEffect(() => {
    const match = PHASE_GROUPS.find((g) =>
      g.phases.some((p) => pathname === `/dashboard/phases/${p.id}`),
    );
    if (match) setOpenGroup(match.id);
  }, [pathname]);

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white/5 border border-white/10 rounded-xl"
        aria-label={isOpen ? "Close menu" : "Open menu"}
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-black/50 backdrop-blur-xl border-r border-white/10 transform transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full p-6">
          <div className="mb-8 px-2">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
                <Zap size={18} className="text-white" fill="currentColor" />
              </div>
              <span className="font-black text-xl tracking-tighter uppercase italic">Sovereign</span>
            </Link>
            {admin && (
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-brand-500/40 bg-brand-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-brand-300">
                <Crown size={10} />
                Admin · Free
              </div>
            )}
          </div>

          <nav className="flex-1 space-y-6 overflow-y-auto custom-scrollbar pr-2">
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href as Route}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      isActive
                        ? "bg-white text-black shadow-lg"
                        : "text-muted-foreground hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Icon size={18} />
                    {item.name}
                  </Link>
                );
              })}
            </div>

            <div>
              <div className="flex items-center justify-between px-4 pb-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                  25 Phases
                </span>
                <span className="text-[9px] font-black text-brand-400">ALL LIVE</span>
              </div>
              <div className="space-y-1">
                {PHASE_GROUPS.map((group) => {
                  const isGroupOpen = openGroup === group.id;
                  const containsActive = group.phases.some(
                    (p) => pathname === `/dashboard/phases/${p.id}`,
                  );
                  return (
                    <div key={group.id}>
                      <button
                        onClick={() =>
                          setOpenGroup(isGroupOpen ? null : group.id)
                        }
                        className={`w-full flex items-center justify-between px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${
                          isGroupOpen || containsActive
                            ? "text-brand-300 bg-brand-500/5"
                            : "text-muted-foreground hover:text-white hover:bg-white/5"
                        }`}
                        aria-expanded={isGroupOpen}
                      >
                        <span>{group.label}</span>
                        <ChevronRight
                          size={12}
                          className={`transition-transform ${isGroupOpen ? "rotate-90" : ""}`}
                        />
                      </button>
                      {isGroupOpen && (
                        <div className="mt-1 ml-3 border-l border-white/5 pl-3 space-y-0.5">
                          {group.phases.map((p) => {
                            const href = `/dashboard/phases/${p.id}` as Route;
                            const isActive = pathname === href;
                            return (
                              <Link
                                key={p.id}
                                href={href}
                                className={`flex items-center justify-between gap-2 pl-3 pr-2 py-1.5 rounded-md text-[11px] font-bold transition-all ${
                                  isActive
                                    ? "text-brand-300 bg-brand-500/10"
                                    : "text-muted-foreground hover:text-white hover:bg-white/5"
                                }`}
                              >
                                <span className="truncate">{p.name}</span>
                                <span className="text-[9px] font-black text-white/30">
                                  {String(p.id).padStart(2, "0")}
                                </span>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </nav>

          <div className="mt-auto pt-6 border-t border-white/5 space-y-1 px-2">
            {email && (
              <div className="px-4 pb-2 text-[10px] font-bold text-muted-foreground/60 truncate">
                {email}
              </div>
            )}
            <Link
              href="/dashboard/settings"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                pathname === "/dashboard/settings"
                  ? "bg-white text-black shadow-lg"
                  : "text-muted-foreground hover:text-white hover:bg-white/5"
              }`}
            >
              <Settings size={18} />
              <span className="uppercase tracking-widest text-[10px]">Settings</span>
            </Link>

            <form action={signOut}>
              <button
                type="submit"
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-400/60 hover:text-red-400 hover:bg-red-500/5 transition-all"
              >
                <LogOut size={18} />
                <span className="uppercase tracking-widest text-[10px]">Logout</span>
              </button>
            </form>
          </div>
        </div>
      </aside>
    </>
  );
}
