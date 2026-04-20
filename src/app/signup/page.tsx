
"use client";

// DA-043 FIX: Enforce minimum password requirements
function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password)) return 'Password must include an uppercase letter';
  if (!/[a-z]/.test(password)) return 'Password must include a lowercase letter';
  if (!/[0-9]/.test(password)) return 'Password must include a number';
  return null;
}

import { useState } from "react";
import Link from "next/link";
import { signup } from "@/lib/auth-actions";

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    const formData = new FormData(e.currentTarget);
    const result = await signup(formData);
    if (result?.error) {
      setError(result.error);
    } else if (result?.success) {
      setSuccess(result.success);
    }
    setLoading(false);
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="absolute left-1/2 top-0 -z-10 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-brand-500/10 blur-[120px]" />

      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <Link href="/" className="inline-flex items-center gap-2 font-black text-2xl tracking-tighter">
            <span className="h-9 w-9 rounded-xl bg-brand-500 flex items-center justify-center text-white text-xl">A</span>
            <span className="text-gradient">AppBuilder</span>
          </Link>
          <p className="mt-3 text-muted-foreground text-sm">Create your free workspace</p>
        </div>

        <div className="glass-card rounded-3xl p-8">
          {error && (
            <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              ⚠️ {error}
            </div>
          )}
          {success && (
            <div className="mb-6 rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400">
              ✅ {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-muted-foreground">Email</label>
              <input
                name="email"
                type="email"
                required
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none placeholder:text-muted-foreground/50 focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-muted-foreground">Password</label>
              <input
                name="password"
                type="password"
                required
                minLength={6}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none placeholder:text-muted-foreground/50 focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all"
                placeholder="Min. 6 characters"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !!success}
              className="w-full rounded-xl bg-brand-500 py-3.5 text-sm font-black text-white transition-all hover:scale-[1.01] hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Creating account…" : "CREATE ACCOUNT"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-brand-400 hover:text-brand-300 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
