"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { requestAuthOtp, signup, verifyAuthOtp } from "@/lib/auth-actions";
import { isAdminEmail } from "@/lib/admin-emails";
import { KeyRound, Mail, ShieldCheck, ArrowRight, Loader2, Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react";

type Mode = "password" | "code";

interface PasswordStrength {
  score: number; // 0-4
  checks: { label: string; pass: boolean }[];
}

function checkPasswordStrength(password: string): PasswordStrength {
  const checks = [
    { label: "8+ characters", pass: password.length >= 8 },
    { label: "Uppercase letter", pass: /[A-Z]/.test(password) },
    { label: "Lowercase letter", pass: /[a-z]/.test(password) },
    { label: "Number", pass: /[0-9]/.test(password) },
  ];
  return { score: checks.filter((c) => c.pass).length, checks };
}

function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(password)) return "Password must include an uppercase letter";
  if (!/[a-z]/.test(password)) return "Password must include a lowercase letter";
  if (!/[0-9]/.test(password)) return "Password must include a number";
  return null;
}

const STRENGTH_COLORS = ["bg-red-500", "bg-orange-500", "bg-amber-500", "bg-green-400", "bg-emerald-400"];
const STRENGTH_LABELS = ["", "Weak", "Fair", "Good", "Strong"];

export default function SignupPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showChecks, setShowChecks] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // FIX: useEffect for admin email mode switching — never setState during render
  useEffect(() => {
    if (isAdminEmail(email) && mode === "password") {
      setMode("code");
    }
  }, [email, mode]);

  const emailIsAdmin = isAdminEmail(email);
  const pwStrength = checkPasswordStrength(password);

  async function handlePasswordSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const pwErr = validatePassword(password);
    if (pwErr) { setError(pwErr); return; }
    setLoading(true);
    const fd = new FormData();
    fd.set("email", email);
    fd.set("password", password);
    const result = await signup(fd);
    if (result?.error) setError(result.error);
    else if (result?.success) setSuccess(result.success);
    setLoading(false);
  }

  async function handleSendCode() {
    if (!email) { setError("Enter your email first."); return; }
    setLoading(true);
    setError(null);
    setSuccess(null);
    const fd = new FormData();
    fd.set("email", email);
    fd.set("mode", "signup");
    const result = await requestAuthOtp(fd);
    if (result?.error) setError(result.error);
    else {
      setCodeSent(true);
      setSuccess(result?.success ?? "Verification code sent to your email.");
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
    fd.set("redirectTo", "/dashboard");
    const result = await verifyAuthOtp(fd);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
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
          <p className="mt-3 text-muted-foreground text-sm">Create your free workspace</p>
        </div>

        <div className="glass-card rounded-2xl p-8">
          {/* Mode tabs */}
          <div className="flex gap-1 p-1 bg-white/5 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => { setMode("password"); setError(null); setSuccess(null); }}
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
              onClick={() => { setMode("code"); setError(null); setSuccess(null); }}
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

          {/* Error / Success banners */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-2">
              <span className="mt-0.5 shrink-0">⚠</span>
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm flex items-start gap-2">
              <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Password mode */}
          {mode === "password" && (
            <form onSubmit={handlePasswordSignup} className="space-y-4">
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
                    onChange={(e) => { setPassword(e.target.value); setShowChecks(true); }}
                    required
                    autoComplete="new-password"
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

                {/* Strength meter */}
                {showChecks && password.length > 0 && (
                  <div className="mt-2 space-y-2">
                    <div className="flex gap-1">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-all ${
                            i < pwStrength.score ? STRENGTH_COLORS[pwStrength.score] : "bg-white/10"
                          }`}
                        />
                      ))}
                    </div>
                    {pwStrength.score > 0 && (
                      <p className="text-xs text-muted-foreground">{STRENGTH_LABELS[pwStrength.score]}</p>
                    )}
                    <div className="grid grid-cols-2 gap-1">
                      {pwStrength.checks.map((c) => (
                        <div key={c.label} className={`flex items-center gap-1.5 text-xs ${c.pass ? "text-green-400" : "text-muted-foreground/60"}`}>
                          {c.pass ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                          {c.label}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || pwStrength.score < 4}
                className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-xl transition-all text-sm"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                {loading ? "Creating account…" : "Create Account"}
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
                    {loading ? "Verifying…" : "Verify & Create Account"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCodeSent(false); setCode(""); setSuccess(null); }}
                    className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
                  >
                    ← Use a different email
                  </button>
                </form>
              )}
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-white/5 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
              Sign in
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
