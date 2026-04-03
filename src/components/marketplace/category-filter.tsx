"use client";

const CATEGORIES = [
  { id: "all", label: "All Skills", icon: "🌐" },
  { id: "ui", label: "UI Specialist", icon: "🎨" },
  { id: "logic", label: "Logic Architect", icon: "🧠" },
  { id: "security", label: "Security Auditor", icon: "🛡️" },
  { id: "data", label: "Data Modeler", icon: "📊" },
];

export function CategoryFilter({ active, onChange }: { active: string; onChange: (id: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {CATEGORIES.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onChange(cat.id)}
          className={`flex items-center gap-2 rounded-full border px-5 py-2 text-xs font-bold transition-all ${
            active === cat.id
              ? "border-brand-500/50 bg-brand-500/10 text-brand-300"
              : "border-white/5 bg-white/5 text-muted-foreground hover:border-white/10 hover:bg-white/10 hover:text-white"
          }`}
        >
          <span>{cat.icon}</span>
          {cat.label}
        </button>
      ))}
    </div>
  );
}
