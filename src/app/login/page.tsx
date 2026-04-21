"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import { login, requestAuthOtp, verifyAuthOtp } from "@/lib/auth-actions";
import { isAdminEmail, normalizeEmail } from "@/lib/admin-emails";
import { KeyRound, Mail, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";

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
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const emailIsAdmin = isAdminEmail(email);
  // Auto-force code mode the instant an admin email is entered.
  if (emailIsAdmin && mode === "password") {
    setMode("code");
  }

  async function handlePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
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
  }

  async function handleSendCode() {
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
      setInfo(result?.success ?? "Verification code sent.");
    }
    setLoading(false);
  }

  async function handleVerifyCode(e: React.FormEvent<HTMLFormElement>) {
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

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="absolute left-1/2 top-0 -z-10 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-brand-500/10 blur-[120px]" />
      <div className="absolute bottom-0 right-0 -z-10 h-[400px] w-[400px] rounded-full bg-accent/10 blur-[120px]" />

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-10 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-black text-2xl tracking-tighter"
          >
            <span className="h-9 w-9 rounded-xl bg-brand-500 flex items-center justify-center text-white text-xl">
              A
            </span>
            <span className="text-gradient">Sovereign Forge</span>
          </Link>
          <p className="mt-3 text-muted-foreground text-sm">Sign in to your workspace</p>
        </div>

        <div className="glass-card rounded-3xl p-8">
          {(error || urlError) && (
            <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              ⚠️ {error ?? "Authentication failed. Please try again."}
            </div>
          )}
          {info && (
            <div className="mb-6 rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400">
              {info}
            </div>
          )}

          {/* Mode toggle — hidden for admin emails (code-only). */}
          {!emailIsAdmin && (
            <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-black/30 p-1 border border-white/5">
              <button
                type="button"
                onClick={() => {
                  setMode("password");
                  setCodeSent(false);
                  setError(null);
                  setInfo(null);
                }}
                className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-black uppercase tracking-widest transition-all ${
                  mode === "password"
                    ? "bg-brand-500 text-white shadow-lg shadow-brand-500/30"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                <KeyRound size={14} />
                Password
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("code");
                  setError(null);
                  setInfo(null);
                }}
                className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-black uppercase tracking-widest transition-all ${
                  mode === "code"
                    ? "bg-brand-500 text-white shadow-lg shadow-brand-500/30"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                <Mail size={14} />
                Email Code
              </button>
            </div>
          )}

          {emailIsAdmin && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-brand-500/30 bg-brand-500/5 px-4 py-3 text-xs font-bold text-brand-200">
              <ShieldCheck size={16} className="mt-0.5 flex-shrink-0" />
              <span>
                Admin account detected — every sign-in requires a fresh 6-digit verification
                code emailed to you. Password login is disabled for this account.
              </span>
            </div>
          )}

          {mode === "password" && !emailIsAdmin ? (
            <form onSubmit={handlePasswordSubmit} className="space-y-5">
              <Field label="Email">
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(normalizeEmail(e.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none placeholder:text-muted-foreground/50 focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all"
                  placeholder="you@company.com"
                />
              </Field>
              <Field label="Password">
                <input
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none placeholder:text-muted-foreground/50 focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all"
                  placeholder="••••••••"
                />
              </Field>
              <SubmitButton loading={loading}>SIGN IN</SubmitButton>
            </form>
          ) : !codeSent ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSendCode();
              }}
              className="space-y-5"
            >
              <Field label="Email">
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(normalizeEmail(e.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none placeholder:text-muted-foreground/50 focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all"
                  placeholder="you@company.com"
                />
              </Field>
              <SubmitButton loading={loading}>
                <Mail size={14} />
                SEND VERIFICATION CODE
                <ArrowRight size={14} />
              </SubmitButton>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-5">
              <Field label="6-digit code">
                <input
                  name="token"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-center text-2xl font-black tracking-[0.8em] text-white outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all"
                  placeholder="000000"
                  autoFocus
                />
              </Field>
              <SubmitButton loading={loading}>
                <ShieldCheck size={14} />
                VERIFY & SIGN IN
              </SubmitButton>
              <button
                type="button"
                onClick={() => {
                  setCodeSent(false);
                  setCode("");
                  setInfo(null);
                }}
                className="w-full text-center text-xs font-bold text-muted-foreground hover:text-white"
              >
                ← use a different email
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            No account yet?{" "}
            <Link
              href="/signup"
              className="font-bold text-brand-400 hover:text-brand-300 transition-colors"
            >
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function SubmitButton({
  loading,
  children,
}: {
  loading: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-3.5 text-sm font-black text-white transition-all hover:scale-[1.01] hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.99]"
    >
      {loading ? (
        <>
          <Loader2 size={14} className="animate-spin" />
          WORKING…
        </>
      ) : (
        children
      )}
    </button>
  );
}
