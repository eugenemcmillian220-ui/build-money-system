"use client";

import React, { useState, useEffect } from "react";
import { Activity, AlertCircle, BarChart3, Clock, LayoutGrid, Zap } from "lucide-react";
import { getErrorClusters, resolveCluster } from "@/lib/actions/pulse-actions";
import type { ErrorCluster } from "@/lib/actions/pulse-actions.types";


export function PulseDashboard() {
  const [clusters, setClusters] = useState<ErrorCluster[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getErrorClusters("00000000-0000-0000-0000-000000000000");
        setClusters(data);
      } catch (err) {
        console.error("Failed to load Pulse data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleResolve = async (clusterId: string) => {
    try {
      await resolveCluster(clusterId);
      setClusters(prev => prev.filter(c => c.id !== clusterId));
    } catch (err) {
      console.error("Failed to resolve cluster:", err);
    }
  };

  const stats = [
    { name: "Total Events", value: "12,401", change: "+14.2%", icon: Activity, color: "text-blue-400" },
    { name: "Error Clusters", value: clusters.length, change: clusters.length > 5 ? "High" : "Stable", icon: AlertCircle, color: "text-red-400" },
    { name: "Active Sessions", value: "842", change: "+2.1%", icon: LayoutGrid, color: "text-purple-400" },
    { name: "Avg Latency", value: "142ms", change: "-12ms", icon: Zap, color: "text-yellow-400" },
  ];

  return (
    <div className="p-6 space-y-8 bg-black text-white min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
            Sovereign Pulse
          </h1>
          <p className="text-zinc-500 mt-1">Real-time observability and neural impact telemetry.</p>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 bg-zinc-900 rounded-full border border-zinc-800">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium">Live Feed</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.name} className="p-6 bg-zinc-900/50 rounded-2xl border border-zinc-800 hover:border-zinc-700 transition-all group">
            <div className="flex items-center justify-between mb-4">
              <stat.icon className={`w-6 h-6 ${stat.color} group-hover:scale-110 transition-transform`} />
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-800 ${stat.change.startsWith("+") ? "text-green-400" : stat.change.startsWith("-") ? "text-green-400" : "text-zinc-400"}`}>
                {stat.change}
              </span>
            </div>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-sm text-zinc-500 mt-1">{stat.name}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Critical Error Clusters */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              Critical Error Clusters
            </h2>
            <button className="text-sm text-blue-400 hover:underline">View All</button>
          </div>
          <div className="space-y-3">
            {loading ? (
              <div className="animate-pulse space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-24 bg-zinc-900 rounded-xl" />)}
              </div>
            ) : clusters.length === 0 ? (
              <div className="p-12 text-center bg-zinc-900/30 rounded-2xl border border-dashed border-zinc-800">
                <p className="text-zinc-500 italic">No critical error clusters detected. System is healthy.</p>
              </div>
            ) : (
              clusters.map((cluster) => (
                <div key={cluster.id} className="p-4 bg-zinc-900/80 rounded-xl border border-zinc-800 hover:bg-zinc-900 transition-all">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-red-900/50 text-red-400 border border-red-800">
                          {cluster.errorType}
                        </span>
                        <span className="text-sm font-mono text-zinc-300 line-clamp-1">{cluster.errorMessage}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-zinc-500">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(cluster.lastOccurrenceAt).toLocaleTimeString()}</span>
                        <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> {cluster.occurrenceCount} occurrences</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleResolve(cluster.id)}
                      className="px-3 py-1 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 rounded-lg border border-zinc-700 transition-colors"
                    >
                      Resolve
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Conversion Funnel / Health */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-400" />
            Conversion Funnel
          </h2>
          <div className="p-6 bg-zinc-900/50 rounded-2xl border border-zinc-800 space-y-6">
            {[
              { label: "Intent Input", count: 12040, percent: 100 },
              { label: "Design Synthesis", count: 8420, percent: 70 },
              { label: "Schema Forging", count: 5210, percent: 43 },
              { label: "Manifestation", count: 1240, percent: 10 },
            ].map((step) => (
              <div key={step.label} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">{step.label}</span>
                  <span className="font-mono">{step.count.toLocaleString()}</span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-1000`}
                    style={{ width: `${step.percent}%` }}
                  />
                </div>
              </div>
            ))}
            <div className="pt-4 border-t border-zinc-800 text-center">
              <div className="text-2xl font-bold text-green-400">10.3%</div>
              <div className="text-xs text-zinc-500 uppercase tracking-widest">Global Manifestation Rate</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
