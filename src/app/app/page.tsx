import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { GeneratorForm } from "@/components/generator-form";
import { signOut } from "@/lib/auth-actions";
import Link from "next/link";

export default async function AppPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <main className="relative mx-auto min-h-dvh max-w-7xl overflow-hidden px-6 py-10 lg:px-8">
      {/* Background Orbs */}
      <div className="absolute left-1/2 top-0 -z-10 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-brand-500/10 blur-[120px]" />

      {/* Top Nav */}
      <header className="mb-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-black text-xl tracking-tighter">
          <span className="h-8 w-8 rounded-lg bg-brand-500 flex items-center justify-center text-white text-sm font-black">A</span>
          <span className="text-gradient">AppBuilder</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="glass-card inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs font-bold text-white transition-all hover:border-brand-500/50"
          >
            📊 Dashboard
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-full border border-white/10 bg-white/5 px-5 py-2 text-xs font-bold text-muted-foreground transition-all hover:text-white hover:bg-white/10"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      {/* Hero */}
      <div className="mb-12 text-center">
        <div className="animate-glow mb-6 inline-flex items-center gap-3 rounded-full border border-brand-500/30 bg-brand-500/5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-brand-300">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
          </span>
          AI Generation Engine · Phase 7 Active
        </div>
        <h1 className="text-5xl font-black tracking-tight sm:text-7xl">
          <span className="text-gradient">Build Anything.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
          Describe your vision. Our AI swarm will manifest it into production-ready code instantly.
        </p>
      </div>

      {/* Generator Card */}
      <div className="mx-auto max-w-4xl">
        <div className="glass-card overflow-hidden rounded-3xl p-1 shadow-2xl">
          <div className="rounded-[22px] bg-background/50 p-6 md:p-10">
            <GeneratorForm />
          </div>
        </div>
      </div>

      <footer className="mt-20 border-t border-border/50 pt-8 text-center text-xs tracking-widest text-muted-foreground">
        LOGGED IN AS {user.email?.toUpperCase()} · PHASE 7 ELITE SUITE
      </footer>
    </main>
  );
}
