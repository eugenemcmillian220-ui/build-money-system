"use client";

import { useEffect, useState } from "react";
import { CategoryFilter } from "@/components/marketplace/category-filter";
import { SkillCard } from "@/components/marketplace/skill-card";
import { AgentSkill } from "@/lib/marketplace";

export default function MarketplacePage() {
  const [skills, setSkills] = useState<AgentSkill[]>([]);
  const [category, setCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchSkills() {
      try {
        setLoading(true);
        const url = category === "all" ? "/api/marketplace/skills" : `/api/marketplace/skills?category=${category}`;
        const res = await fetch(url);
        const data = await res.json();
        setSkills(data);
      } catch (e) {
        console.error("Failed to load skills:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchSkills();
  }, [category]);

  const filteredSkills = skills.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.description.toLowerCase().includes(search.toLowerCase())
  );

  async function handleSubscribe(skillId: string) {
    // In a real app, this would call /api/marketplace/subscribe
    alert(`Subscribed to agent skill: ${skillId}. Credits will be deducted from your organization balance.`);
  }

  return (
    <div className="min-h-screen bg-black pb-20 pt-32">
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="mb-16 text-center">
          <h1 className="text-5xl font-black tracking-tight text-white sm:text-7xl">
            Agentic <span className="text-brand-500">App Store</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Browse and subscribe to specialized AI agent skills. Enhance your autonomous engineering team with pixel-perfect UI, hard-coded logic, and deep security auditing.
          </p>
        </div>

        {/* Controls */}
        <div className="mb-12 flex flex-col items-center justify-between gap-8 border-y border-white/5 py-8 md:flex-row">
          <CategoryFilter active={category} onChange={setCategory} />
          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Search skills..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-10 py-3 text-sm text-white outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50"
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">🔍</span>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-64 animate-pulse rounded-2xl bg-white/5" />
            ))}
          </div>
        ) : filteredSkills.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSkills.map((skill) => (
              <SkillCard key={skill.id} skill={skill} onSubscribe={handleSubscribe} />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center">
            <p className="text-lg font-bold text-muted-foreground">No agent skills found in this category.</p>
            <button onClick={() => setCategory("all")} className="mt-4 text-brand-400 hover:underline">
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
