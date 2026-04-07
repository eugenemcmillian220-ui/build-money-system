"use client";

import { useState, useEffect } from "react";

interface PendingAction {
  id: string;
  agent_id: string;
  action_type: string;
  risk_score: number;
  status: string;
  created_at: string;
}

export function ApprovalsTab() {
  const [actions, setActions] = useState<PendingAction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock fetching for demo purposes
    setActions([
      { id: "1", agent_id: "sre", action_type: "deploy_infra", risk_score: 0.85, status: "pending", created_at: new Date().toISOString() },
      { id: "2", agent_id: "architect", action_type: "hire_agent", risk_score: 0.72, status: "pending", created_at: new Date().toISOString() },
    ]);
    setLoading(false);
  }, []);

  const handleResolve = async (id: string) => {
    setActions(prev => prev.filter(a => a.id !== id));
    // In production: await fetch('/api/governance', { method: 'POST', body: JSON.stringify({ actionId: id, status: _status }) });
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Scanning governance gates...</div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-white">Governance Gates</h2>
          <p className="text-muted-foreground text-sm">High-risk agent actions requiring human verification.</p>
        </div>
        <div className="px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black uppercase tracking-widest">
          {actions.length} Pending Actions
        </div>
      </div>

      <div className="grid gap-4">
        {actions.length === 0 ? (
          <div className="p-12 border border-dashed border-white/10 rounded-3xl text-center">
            <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">System Clear — No Pending Approvals</p>
          </div>
        ) : (
          actions.map(action => (
            <div key={action.id} className="p-6 rounded-3xl border border-white/10 bg-white/5 flex items-center justify-between group hover:border-blue-500/30 transition-all">
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-xl">
                  {action.agent_id === 'sre' ? '🛠️' : '📐'}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-black uppercase text-blue-400 tracking-widest">{action.agent_id} Agent</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/20 font-bold uppercase">Risk: {(action.risk_score * 100).toFixed(0)}%</span>
                  </div>
                  <h4 className="text-lg font-bold text-white uppercase tracking-tight">{action.action_type.replace('_', ' ')}</h4>
                  <p className="text-xs text-muted-foreground">Requested {new Date(action.created_at).toLocaleTimeString()}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  onClick={() => handleResolve(action.id)}
                  className="px-6 py-3 rounded-xl border border-white/10 text-xs font-black uppercase tracking-widest hover:bg-red-500 hover:text-white hover:border-red-500 transition-all"
                >
                  Reject
                </button>
                <button 
                  onClick={() => handleResolve(action.id)}
                  className="px-6 py-3 rounded-xl bg-white text-black text-xs font-black uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all shadow-xl shadow-white/5"
                >
                  Approve Action
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
