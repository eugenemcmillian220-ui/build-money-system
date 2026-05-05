"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { requestAuthOtp, signup, verifyAuthOtp } from "@/lib/auth-actions";
import { isAdminEmail, normalizeEmail } from "@/lib/admin-emails";
import { KeyRound, Mail, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";

type Mode = "password" | "code";

function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(password)) return "Password must include an uppercase letter";
  if (!/[a-z]/.test(password)) return "Password must include a lowercase letter";
  if (!/[0-9]/.test(password)) return "Password must include a number";
  return null;
}

export default function SignupPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const emailIsAdmin = isAdminEmail(email);
  if (emailIsAdmin && mode === "password") setMode("code");

  async function handlePasswordSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const pwErr = validatePassword(password);
    if (pwErr) {
      setError(pwErr);
      return;
    }
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
      setSuccess(result?.success ?? "Verification code sent.");
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
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="absolute left-1/2 top-0 -z-10 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-brand-500/10 blur-[120px]" />
      <div className="absolute bottom-0 left-0 -z-10 h-[400px] w-[400px] rounded-full bg-accent/10 blur-[120px]" />

      <div className="w-full max-w-md">
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
          <p className="mt-3 text-muted-foreground text-sm">Create your free workspace</p>
        </div>

        <div className="glass-card rounded-3xl p-8">
          {error && (
            <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              ⚠️ {error}
            </div>
          )}
          {success && !codeSent && (
            <div className="mb-6 rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400">
              {success}
            </div>
          )}
          {codeSent && (
            <div className="mb-6 rounded-xl border border-brand-500/30 bg-brand-500/5 px-4 py-3 text-sm text-brand-200">
              📬 We sent a 6-digit code to <b>{email}</b>. Enter it below to finish sign-up.
            </div>
          )}

          {!emailIsAdmin && (
            <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-black/30 p-1 border border-white/5">
              <button
                type="button"
                onClick={() => {
                  setMode("password");
                  setCodeSent(false);
                  setError(null);
                  setSuccess(null);
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
                  setSuccess(null);
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
                Admin email — account will be created with a 6-digit verification code
                (required for every future sign-in). No password is stored.
              </span>
            </div>
          )}

          {mode === "password" && !emailIsAdmin ? (
            <form onSubmit={handlePasswordSignup} className="space-y-5">
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none placeholder:text-muted-foreground/50 focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all"
                  placeholder="8+ chars, 1 upper, 1 lower, 1 number"
                />
              </Field>
              <SubmitButton loading={loading}>CREATE ACCOUNT</SubmitButton>
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
                VERIFY & ACTIVATE ACCOUNT
              </SubmitButton>
              <button
                type="button"
                onClick={() => {
                  setCodeSent(false);
                  setCode("");
                  setSuccess(null);
                }}
                className="w-full text-center text-xs font-bold text-muted-foreground hover:text-white"
              >
                ← use a different email
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-bold text-brand-400 hover:text-brand-300 transition-colors"
            >
              Sign in
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
