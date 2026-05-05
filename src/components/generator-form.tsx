"use client";

import { useState } from "react";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import Link from "next/link";

export function GeneratorForm() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ files: Record<string, string>; description?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, multiFile: true }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Generation failed");
      }

      setResult(data.result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe what you want to build... (e.g., 'A modern SaaS landing page with dark theme, hero section, pricing cards, and FAQ')"
            className="w-full min-h-[140px] bg-black/50 border border-white/10 rounded-xl p-4 text-white placeholder:text-white/30 focus:border-brand-500 focus:outline-none transition-colors resize-none"
            disabled={loading}
          />
          <div className="absolute bottom-3 right-3 flex gap-2">
            <span className="text-[10px] text-white/30 uppercase tracking-wider">
              {prompt.length}/2000
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPrompt("Build a SaaS landing page with dark theme, hero with gradient text, 3 pricing tiers, and testimonials")}
              className="text-[10px] px-3 py-1.5 rounded-full border border-white/10 text-white/50 hover:text-white hover:border-white/30 transition-colors"
            >
              SaaS Landing
            </button>
            <button
              type="button"
              onClick={() => setPrompt("Create a dashboard with sidebar navigation, stats cards, data table with sorting, and a line chart")}
              className="text-[10px] px-3 py-1.5 rounded-full border border-white/10 text-white/50 hover:text-white hover:border-white/30 transition-colors"
            >
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => setPrompt("Build an e-commerce product page with image gallery, size selector, add to cart button, and reviews")}
              className="text-[10px] px-3 py-1.5 rounded-full border border-white/10 text-white/50 hover:text-white hover:border-white/30 transition-colors"
            >
              E-commerce
            </button>
          </div>

          <button
            type="submit"
            disabled={loading || !prompt.trim()}
            className="inline-flex items-center gap-2 bg-brand-500 text-black px-6 py-3 rounded-xl font-black text-sm uppercase tracking-wider hover:bg-brand-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 size={18} />
                Generate
              </>
            )}
          </button>
        </div>
      </form>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-green-400">
            <Sparkles size={18} />
            <span className="font-black uppercase tracking-wider text-sm">Generation Complete</span>
          </div>

          {result.description && (
            <p className="text-white/70 text-sm">{result.description}</p>
          )}

          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-white/50 font-black">Generated Files</p>
            <div className="grid gap-2">
              {Object.keys(result.files).map((filename) => (
                <div
                  key={filename}
                  className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg"
                >
                  <code className="text-sm text-brand-400">{filename}</code>
                  <span className="text-[10px] text-white/50">
                    {result.files[filename].length.toLocaleString()} chars
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Link
              href="/dashboard"
              className="flex-1 text-center py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-bold text-white hover:bg-white/10 transition-colors"
            >
              View in Dashboard
            </Link>
            <Link
              href="/dashboard/projects"
              className="flex-1 text-center py-3 bg-brand-500 text-black rounded-xl text-sm font-black uppercase tracking-wider hover:bg-brand-400 transition-colors"
            >
              Deploy Now
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
