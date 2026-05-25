// src/lib/circuit-breaker.ts
// Circuit breaker for LLM provider chain — state stored in Supabase for cross-instance consistency

import 'server-only';
import { createClient as createSvcClient } from '@supabase/supabase-js';

type CBState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

const FAILURE_THRESHOLD = 3;
const OPEN_DURATION_MS  = 5 * 60 * 1000; // 5 minutes
const FAILURE_WINDOW_MS = 60 * 1000;     // 60 seconds

function getSupabase() {
  return createSvcClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export class CircuitBreaker {
  async isOpen(provider: string): Promise<boolean> {
    try {
      const supabase = getSupabase();
      const { data } = await supabase
        .from('circuit_breaker_state')
        .select('state, open_until')
        .eq('provider', provider)
        .maybeSingle();

      if (!data) return false;

      if (data.state === 'OPEN') {
        if (data.open_until && new Date(data.open_until as string) < new Date()) {
          await supabase
            .from('circuit_breaker_state')
            .update({ state: 'HALF_OPEN', updated_at: new Date().toISOString() })
            .eq('provider', provider);
          return false;
        }
        return true;
      }
      return false;
    } catch {
      // If CB check fails, default to allowing the request
      return false;
    }
  }

  async recordSuccess(provider: string): Promise<void> {
    try {
      const supabase = getSupabase();
      await supabase
        .from('circuit_breaker_state')
        .upsert({
          provider,
          state: 'CLOSED' as CBState,
          failure_count: 0,
          last_failure_at: null,
          open_until: null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'provider' });
    } catch (err) {
      console.warn('[circuit-breaker] recordSuccess failed:', err);
    }
  }

  async recordFailure(provider: string): Promise<void> {
    try {
      const supabase = getSupabase();
      const { data } = await supabase
        .from('circuit_breaker_state')
        .select('failure_count, last_failure_at, state')
        .eq('provider', provider)
        .maybeSingle();

      const now = new Date();
      const lastFailure = data?.last_failure_at ? new Date(data.last_failure_at as string) : null;
      const withinWindow = lastFailure && (now.getTime() - lastFailure.getTime()) < FAILURE_WINDOW_MS;
      const currentCount = withinWindow ? ((data?.failure_count as number) ?? 0) : 0;
      const newCount = currentCount + 1;

      const newState: CBState = newCount >= FAILURE_THRESHOLD ? 'OPEN' : 'CLOSED';
      const openUntil = newState === 'OPEN'
        ? new Date(now.getTime() + OPEN_DURATION_MS).toISOString()
        : null;

      await supabase
        .from('circuit_breaker_state')
        .upsert({
          provider,
          state: newState,
          failure_count: newCount,
          last_failure_at: now.toISOString(),
          open_until: openUntil,
          updated_at: now.toISOString(),
        }, { onConflict: 'provider' });

      if (newState === 'OPEN') {
        console.warn(`[circuit-breaker] ${provider} circuit OPENED — ${newCount} failures in window`);
      }
    } catch (err) {
      console.warn('[circuit-breaker] recordFailure failed:', err);
    }
  }
}

export const circuitBreaker = new CircuitBreaker();
