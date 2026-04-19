import {
  createServerClient,
  type CookieOptions,
} from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { SearchRecord, ProductRecord, Product, FurnitureCategory, RoomStyle, DetectedItem, Dimensions } from '../types';

// ─── Environment helpers ───────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Missing Supabase environment variables');
  }
}

// ─── Server-side client (SSR + cookies) ──────────────────────────────────────

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // Server Component – read-only, ignore set
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options });
        } catch {
          // ignore
        }
      },
    },
  });
}

// ─── Admin client (service role, bypasses RLS) ──────────────────────────────────

export function createSupabaseAdminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ─── DDL: SQL schema (run once via Supabase SQL editor) ──────────────────────────

export // DA-013 FIX: DDL removed — use Supabase CLI migrations instead

// ─── Repository helpers ─────────────────────────────────────────────────────────────

export async function insertSearch(
  payload: Omit<SearchRecord, 'id' | 'created_at'>
): Promise<SearchRecord | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('searches')
    .insert(payload)
    .select()
    .single();
  if (error) {
    console.error('[Supabase] insertSearch error', error);
    return null;
  }
  return data as SearchRecord;
}

export async function getProductsByCategory(
  category: FurnitureCategory,
  limit = 12
): Promise<Product[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('products')
    .select('*')
    .eq('category', category)
    .eq('in_stock', true)
    .order('rating', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return (data as ProductRecord[]).map(rowToProduct);
}

export async function upsertProducts(products: Omit<ProductRecord, 'id' | 'created_at' | 'updated_at'>[]) {
  const admin = createSupabaseAdminClient();
  return admin
    .from('products')
    .upsert(products, { onConflict: 'external_id,store_id' });
}

function rowToProduct(row: ProductRecord): Product {
  return {
    id: row.id,
    externalId: row.external_id,
    storeId: row.store_id,
    storeName: row.store_id,
    storeLogoUrl: `/stores/${row.store_id}.svg`,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    currency: row.currency,
    imageUrl: row.image_url,
    productUrl: row.product_url,
    category: row.category as FurnitureCategory,
    style: row.style,
    colors: row.colors as string[],
    inStock: row.in_stock,
    rating: row.rating,
    reviewCount: row.review_count,
    matchScore: 0,
    arSupported: row.ar_supported,
    dimensions: row.dimensions as Dimensions | undefined,
  };
}
