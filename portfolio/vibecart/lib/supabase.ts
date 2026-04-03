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

export const SCHEMA_SQL = `
-- Enable RLS on all tables

create table if not exists public.searches (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete set null,
  image_url    text not null,
  room_style   text not null,
  detected_items jsonb not null default '[]',
  color_palette  jsonb not null default '[]',
  confidence   float4 not null default 0,
  created_at   timestamptz not null default now()
);

alter table public.searches enable row level security;

create policy "Users can read their own searches"
  on public.searches for select
  using (user_id = auth.uid() or user_id is null);

create policy "Anyone can insert searches"
  on public.searches for insert
  with check (true);

create table if not exists public.products (
  id           uuid primary key default gen_random_uuid(),
  external_id  text not null,
  store_id     text not null,
  name         text not null,
  description  text not null default '',
  price        numeric(10,2) not null,
  currency     text not null default 'USD',
  image_url    text not null,
  product_url  text not null,
  category     text not null,
  style        text not null,
  colors       jsonb not null default '[]',
  in_stock     boolean not null default true,
  rating       float4 not null default 0,
  review_count int not null default 0,
  ar_supported boolean not null default false,
  dimensions   jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (external_id, store_id)
);

alter table public.products enable row level security;

create policy "Products are publicly readable"
  on public.products for select
  using (true);

create policy "Only service role can mutate products"
  on public.products for all
  using (auth.role() = 'service_role');

create table if not exists public.carts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade,
  items        jsonb not null default '[]',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.carts enable row level security;

create policy "Users manage their own cart"
  on public.carts for all
  using (user_id = auth.uid());
`;

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
