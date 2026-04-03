"use client";

import { useEffect, useState } from "react";

interface Transaction {
  id: string;
  from_agent: string;
  to_agent: string;
  amount: number;
  transaction_type: string;
  description: string;
  created_at: string;
}

export function EconomyDashboard({ orgId }: { orgId: string }) {
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // In a real app, these would be API calls
        // For now, we simulate or use a client-side supabase call if available
        setLoading(true);
        // Simulated data for visualization
        setBalance(84.25);
        setTransactions([
          {
            id: "1",
            from_agent: "System",
            to_agent: "Architect",
            amount: 2.0,
            transaction_type: "hiring",
            description: "Hiring Architect for SaaS Project",
            created_at: new Date().toISOString()
          },
          {
            id: "2",
            from_agent: "Architect",
            to_agent: "Developer",
            amount: 1.5,
            transaction_type: "hiring",
            description: "Hiring Developer for Frontend logic",
            created_at: new Date().toISOString()
          },
          {
            id: "3",
            from_agent: "Developer",
            to_agent: "QA",
            amount: 1.0,
            transaction_type: "hiring",
            description: "Hiring QA for bug fix verification",
            created_at: new Date().toISOString()
          }
        ]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [orgId]);

  if (loading) return <div className="animate-pulse h-64 bg-white/5 rounded-2xl" />;

  return (
    <div className="space-y-6">
      {/* Balance Card */}
      <div className="glass-card overflow-hidden rounded-2xl p-8 text-center relative">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 to-accent/10 -z-10" />
        <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-2">Available Credits</p>
        <h2 className="text-5xl font-black text-white tabular-nums">
          {balance.toFixed(2)} <span className="text-brand-400 text-2xl">CR</span>
        </h2>
        <button className="mt-6 rounded-xl bg-white/10 px-6 py-2 text-xs font-bold text-white hover:bg-white/20 transition-all">
          TOP UP CREDITS
        </button>
      </div>

      {/* Ledger */}
      <div className="glass-card rounded-2xl border border-white/5 bg-black/20 overflow-hidden">
        <div className="border-b border-white/5 px-6 py-4">
          <h3 className="text-sm font-bold text-white">Agent Ledger</h3>
        </div>
        <div className="divide-y divide-white/5">
          {transactions.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-colors">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-brand-400 uppercase">{tx.from_agent}</span>
                  <span className="text-[10px] text-muted-foreground"> hired </span>
                  <span className="text-xs font-black text-accent uppercase">{tx.to_agent}</span>
                </div>
                <p className="text-xs text-muted-foreground">{tx.description}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-red-400">-{tx.amount.toFixed(2)}</p>
                <p className="text-[10px] text-muted-foreground">{new Date(tx.created_at).toLocaleTimeString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
