"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import { login, requestAuthOtp, verifyAuthOtp } from "@/lib/auth-actions";
import { isAdminEmail } from "@/lib/admin-emails";
import { KeyRound, Mail, ShieldCheck, ArrowRight, Loader2, Eye, EyeOff } from "lucide-react";

type Mode = "password" | "code";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams?.get("redirectTo");
  const redirectTo =
    rawRedirect && rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
      ? rawRedirect
      : "/dashboard";
  const urlError = searchParams?.get("error");

  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(urlError ?? null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // FIX: Move admin email detection into useEffect — never call setState during render.
  // The original code called setMode() directly in the render body, causing an infinite
  // re-render loop whenever an admin email was entered.
  useEffect(() => {
    if (isAdminEmail(email) && mode === "password") {
      setMode("code");
    }
  }, [email, mode]);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    const fd = new FormData();
    fd.set("email", email);
    fd.set("password", password);
    fd.set("redirectTo", redirectTo);
    const result = await login(fd);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
    // On success, the server action redirects — no explicit router.push needed
  }

  async function handleSendCode() {
    if (!email) { setError("Enter your email first."); return; }
    setLoading(true);
    setError(null);
    setInfo(null);
    const fd = new FormData();
    fd.set("email", email);
    fd.set("mode", "login");
    const result = await requestAuthOtp(fd);
    if (result?.error) {
      setError(result.error);
    } else {
      setCodeSent(true);
      setInfo(result?.success ?? "Verification code sent to your email.");
    }
    setLoading(false);
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData();
    fd.set("email", email);
    fd.set("token", code);
    fd.set("redirectTo", redirectTo);
    const result = await verifyAuthOtp(fd);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.push((result?.redirectTo ?? redirectTo) as Route);
    router.refresh();
  }

  const emailIsAdmin = isAdminEmail(email);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400 font-bold text-lg group-hover:bg-brand-500/30 transition-all">
              S
            </div>
            <span className="text-xl font-semibold text-foreground">Sovereign Forge</span>
          </Link>
          <p className="mt-3 text-muted-foreground text-sm">Sign in to your workspace</p>
        </div>

        {/* Card */}
        <div className="glass-card rounded-2xl p-8">
          {/* Mode tabs */}
          <div className="flex gap-1 p-1 bg-white/5 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => { setMode("password"); setError(null); setInfo(null); }}
              disabled={emailIsAdmin}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                mode === "password"
                  ? "bg-brand-500/20 text-brand-300 shadow-sm"
                  : "text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
              }`}
            >
              <KeyRound size={14} />
              Password
            </button>
            <button
              type="button"
              onClick={() => { setMode("code"); setError(null); setInfo(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                mode === "code"
                  ? "bg-brand-500/20 text-brand-300 shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Mail size={14} />
              Email Code
              {emailIsAdmin && (
                <span className="ml-1 text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">Admin</span>
              )}
            </button>
          </div>

          {/* Error / Info banners */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-2">
              <span className="mt-0.5 shrink-0">⚠</span>
              <span>{error}</span>
            </div>
          )}
          {info && (
            <div className="mb-4 p-3 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-300 text-sm flex items-start gap-2">
              <ShieldCheck size={14} className="mt-0.5 shrink-0" />
              <span>{info}</span>
            </div>
          )}

          {/* Password mode */}
          {mode === "password" && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-11 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-xl transition-all text-sm"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                {loading ? "Signing in…" : "Sign In"}
              </button>
            </form>
          )}

          {/* OTP / Email code mode */}
          {mode === "code" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={codeSent}
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40 transition-all disabled:opacity-50"
                />
              </div>

              {!codeSent ? (
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={loading || !email}
                  className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-xl transition-all text-sm"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                  {loading ? "Sending…" : "Send Verification Code"}
                </button>
              ) : (
                <form onSubmit={handleVerifyCode} className="space-y-4">
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1.5">6-Digit Code</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                      required
                      autoFocus
                      placeholder="000000"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40 transition-all text-center tracking-[0.5em] font-mono text-lg"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || code.length !== 6}
                    className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-xl transition-all text-sm"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                    {loading ? "Verifying…" : "Verify & Sign In"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCodeSent(false); setCode(""); setInfo(null); }}
                    className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
                  >
                    ← Use a different email
                  </button>
                </form>
              )}
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-white/5 text-center text-sm text-muted-foreground">
            No account yet?{" "}
            <Link href="/signup" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
              Create one free
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground/50">
          Production-Hardened · Supabase · Vercel · Railway
        </p>
      </div>
    </div>
  );
}
