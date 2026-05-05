'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { VisionResponse, Product, CartItem, ProductMatchResult } from '../../types';

// ─── AR Preview Modal ──────────────────────────────────────────────────────────

function ARPreviewModal({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-lg overflow-hidden shadow-2xl shadow-violet-950/40"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          {/* AR overlay simulation */}
          <div className="relative overflow-hidden bg-neutral-800 h-72">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.imageUrl}
              alt={product.name}
              className="h-full w-full object-cover"
            />
            {/* AR Grid overlay */}
            <div className="absolute inset-0 ar-pulse"
              style={{
                backgroundImage: 'linear-gradient(rgba(124,58,237,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.15) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              }}
            />
            {/* AR corner markers */}
            {['top-4 left-4', 'top-4 right-4', 'bottom-4 left-4', 'bottom-4 right-4'].map((pos) => (
              <div key={pos} className={`absolute ${pos} h-6 w-6`}>
                <div className="h-full w-full border-l-2 border-t-2 border-violet-400" />
              </div>
            ))}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-violet-600/90 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
              📐 AR Preview Mode
            </div>
            {/* Dimension overlay */}
            {product.dimensions && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3 rounded-xl bg-black/70 px-4 py-2 backdrop-blur-sm">
                <span className="text-xs text-neutral-300">
                  W {product.dimensions.widthCm}cm
                </span>
                <span className="text-neutral-600">·</span>
                <span className="text-xs text-neutral-300">
                  D {product.dimensions.depthCm}cm
                </span>
                <span className="text-neutral-600">·</span>
                <span className="text-xs text-neutral-300">
                  H {product.dimensions.heightCm}cm
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-bold text-white">{product.name}</h3>
              <p className="mt-1 text-sm text-neutral-400">{product.description}</p>
            </div>
            <span className="shrink-0 text-xl font-black text-violet-300">
              ${product.price.toFixed(2)}
            </span>
          </div>
          <div className="mt-4 rounded-xl bg-violet-900/20 border border-violet-800/30 px-4 py-3 text-xs text-violet-300">
            🔮 In a real AR app, this product would be placed into your room using WebXR or ARKit/ARCore.
          </div>
          <button
            onClick={onClose}
            className="btn-secondary mt-4 w-full"
          >
            Close AR Preview
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Product Card ──────────────────────────────────────────────────────────────

function ProductCard({
  product,
  onAddToCart,
  onARPreview,
  inCart,
}: {
  product: Product;
  onAddToCart: (p: Product) => void;
  onARPreview: (p: Product) => void;
  inCart: boolean;
}) {
  return (
    <div className="card group flex flex-col overflow-hidden transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-violet-950/20">
      {/* Image */}
      <div className="relative overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.imageUrl}
          alt={product.name}
          className="h-44 w-full object-cover transition-transform group-hover:scale-105"
        />
        {/* Match score badge */}
        <div className="absolute top-2 left-2 rounded-full bg-black/70 px-2 py-0.5 text-xs font-bold text-violet-300 backdrop-blur-sm">
          {product.matchScore}% match
        </div>
        {/* AR badge */}
        {product.arSupported && (
          <button
            onClick={() => onARPreview(product)}
            className="absolute top-2 right-2 rounded-full bg-violet-600/90 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur-sm hover:bg-violet-500 transition-colors"
          >
            📐 AR
          </button>
        )}
        {/* Out of stock */}
        {!product.inStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <span className="rounded-full bg-neutral-800 px-3 py-1 text-xs font-semibold text-neutral-400">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        {/* Store */}
        <div className="mb-2 flex items-center gap-2">
          <span className="badge bg-neutral-800 text-neutral-400">{product.storeName}</span>
          <span className="badge bg-neutral-800/50 text-neutral-500 capitalize">{product.style}</span>
        </div>

        {/* Name */}
        <h3 className="font-semibold text-white text-sm leading-snug line-clamp-2">{product.name}</h3>
        <p className="mt-1 text-xs text-neutral-500 line-clamp-2">{product.description}</p>

        {/* Rating */}
        <div className="mt-2 flex items-center gap-1">
          <div className="flex">
            {Array.from({ length: 5 }).map((_, i) => (
              <svg
                key={i}
                className={`h-3 w-3 ${i < Math.round(product.rating) ? 'text-amber-400' : 'text-neutral-700'}`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <span className="text-xs text-neutral-500">({product.reviewCount})</span>
        </div>

        {/* Color swatches */}
        <div className="mt-2 flex gap-1">
          {product.colors.slice(0, 4).map((c) => (
            <div
              key={c}
              className="h-4 w-4 rounded-full border border-neutral-700"
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
        </div>

        {/* Price + CTA */}
        <div className="mt-auto pt-4 flex items-center justify-between gap-2">
          <span className="text-lg font-black text-white">${product.price.toFixed(2)}</span>
          <button
            disabled={!product.inStock}
            onClick={() => onAddToCart(product)}
            className={[
              'rounded-xl px-3 py-1.5 text-xs font-semibold transition-all active:scale-95',
              inCart
                ? 'bg-green-600/20 text-green-400 border border-green-600/30'
                : 'bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed',
            ].join(' ')}
          >
            {inCart ? '✓ Added' : '+ Cart'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Loading Skeleton ──────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="card overflow-hidden">
      <div className="shimmer h-44 w-full" />
      <div className="p-4 space-y-3">
        <div className="shimmer h-3 w-1/3 rounded" />
        <div className="shimmer h-4 w-3/4 rounded" />
        <div className="shimmer h-3 w-full rounded" />
        <div className="shimmer h-3 w-2/3 rounded" />
        <div className="shimmer h-8 w-1/3 rounded-xl mt-4" />
      </div>
    </div>
  );
}

// ─── Cart Panel ────────────────────────────────────────────────────────────────

function CartPanel({
  cart,
  onRemove,
  onCheckout,
  checkingOut,
}: {
  cart: CartItem[];
  onRemove: (id: string) => void;
  onCheckout: () => void;
  checkingOut: boolean;
}) {
  const total = cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  if (cart.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 w-80 card shadow-2xl shadow-black/50 overflow-hidden">
      <div className="border-b border-neutral-800 px-4 py-3 flex items-center justify-between">
        <span className="font-bold text-white">
          🛒 Cart ({cart.reduce((s, i) => s + i.quantity, 0)})
        </span>
        <span className="font-black text-violet-300">${total.toFixed(2)}</span>
      </div>
      <div className="max-h-48 overflow-y-auto divide-y divide-neutral-800">
        {cart.map((item) => (
          <div key={item.product.id} className="flex items-center gap-3 px-4 py-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.product.imageUrl}
              alt={item.product.name}
              className="h-10 w-10 rounded-lg object-cover shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-neutral-200 truncate">{item.product.name}</p>
              <p className="text-xs text-neutral-500">${item.product.price.toFixed(2)}</p>
            </div>
            <button
              onClick={() => onRemove(item.product.id)}
              className="text-neutral-600 hover:text-red-400 transition-colors shrink-0"
              aria-label="Remove item"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <div className="p-3">
        <button
          onClick={onCheckout}
          disabled={checkingOut}
          className="btn-primary w-full"
        >
          {checkingOut ? (
            <span className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              Redirecting…
            </span>
          ) : (
            '💳 Checkout with Stripe'
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Results Page ──────────────────────────────────────────────────────────────

export default function ResultsPage() {
  const router = useRouter();
  const [data, setData] = useState<VisionResponse | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [arProduct, setArProduct] = useState<Product | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  useEffect(() => {
    const raw = sessionStorage.getItem('vibecart_results');
    if (!raw) {
      router.push('/');
      return;
    }
    try {
      setData(JSON.parse(raw));
    } catch {
      router.push('/');
    }
  }, [router]);

  const addToCart = useCallback((product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) return prev;
      return [...prev, { product, quantity: 1 }];
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  }, []);

  const handleCheckout = useCallback(async () => {
    if (cart.length === 0) return;
    setCheckingOut(true);
    setCheckoutError(null);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          successUrl: `${window.location.origin}/checkout/success`,
          cancelUrl: `${window.location.origin}/results`,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error ?? 'Checkout failed');
      }
      window.location.href = json.url;
    } catch (err: unknown) {
      setCheckoutError(err instanceof Error ? err.message : 'Checkout failed');
      setCheckingOut(false);
    }
  }, [cart]);

  if (!data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  const { analysis, products: matchResults } = data;

  // Flatten all products for filtering
  const allProducts = matchResults.flatMap((r: ProductMatchResult) => r.products);
  const categories = ['all', ...Array.from(new Set(allProducts.map((p) => p.category)))];

  const filtered =
    activeFilter === 'all'
      ? allProducts
      : allProducts.filter((p) => p.category === activeFilter);

  const cartIds = new Set(cart.map((i) => i.product.id));

  return (
    <>
      {arProduct && (
        <ARPreviewModal product={arProduct} onClose={() => setArProduct(null)} />
      )}

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <button
              onClick={() => router.push('/')}
              className="mb-3 flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              ← New Search
            </button>
            <h1 className="text-3xl font-extrabold text-white">
              Your Room Results
            </h1>
            <p className="mt-1 text-neutral-400">
              Detected{' '}
              <span className="font-semibold text-violet-300">
                {analysis.roomStyle}
              </span>{' '}
              style · {analysis.detectedItems.length} items found ·{' '}
              {allProducts.length} products matched
            </p>
          </div>

          {/* Color palette */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500">Palette:</span>
            {analysis.colorPalette.map((c) => (
              <div
                key={c}
                className="h-7 w-7 rounded-full border-2 border-neutral-700 shadow"
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
        </div>

        {/* Detected items chips */}
        <div className="mb-6 flex flex-wrap gap-2">
          {analysis.detectedItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-300"
            >
              <div
                className="h-3 w-3 rounded-full border border-neutral-600"
                style={{ backgroundColor: item.dominantColor }}
              />
              {item.label}
              <span className="text-neutral-600">
                {Math.round(item.confidence * 100)}%
              </span>
            </div>
          ))}
        </div>

        {/* Category filter tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className={[
                'rounded-full px-4 py-1.5 text-xs font-semibold transition-all capitalize',
                activeFilter === cat
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/30'
                  : 'border border-neutral-700 bg-neutral-900 text-neutral-400 hover:border-neutral-600',
              ].join(' ')}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Match results grouped by detected item */}
        {matchResults.map((result: ProductMatchResult) => {
          const visibleProducts =
            activeFilter === 'all' || activeFilter === result.products[0]?.category
              ? result.products
              : [];
          if (visibleProducts.length === 0) return null;

          return (
            <section key={result.detectedItemId} className="mb-12">
              <div className="mb-4 flex items-center gap-3">
                <h2 className="text-lg font-bold capitalize text-white">
                  {result.detectedLabel}
                </h2>
                <span className="badge bg-violet-900/40 text-violet-300 border border-violet-800/30">
                  {visibleProducts.length} matches
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {visibleProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={addToCart}
                    onARPreview={setArProduct}
                    inCart={cartIds.has(product.id)}
                  />
                ))}
              </div>
            </section>
          );
        })}

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center py-20 text-neutral-500">
            <span className="text-4xl mb-4">🪑</span>
            <p className="text-lg font-semibold">No products in this category</p>
            <button onClick={() => setActiveFilter('all')} className="btn-secondary mt-4">
              Show all categories
            </button>
          </div>
        )}

        {/* Store crawler status */}
        <div className="mt-12 card p-6">
          <h3 className="mb-4 font-bold text-white text-sm">Stores Crawled</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {['IKEA', 'Wayfair', 'West Elm', 'Crate & Barrel'].map((store) => (
              <div key={store} className="flex items-center gap-2 rounded-xl bg-neutral-800/50 px-3 py-2">
                <div className="h-2 w-2 rounded-full bg-green-400" />
                <span className="text-xs font-medium text-neutral-300">{store}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Checkout error toast */}
      {checkoutError && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-xl border border-red-800/50 bg-red-900/90 px-5 py-3 text-sm text-red-200 shadow-xl backdrop-blur-sm">
          ⚠️ {checkoutError}
        </div>
      )}

      <CartPanel
        cart={cart}
        onRemove={removeFromCart}
        onCheckout={handleCheckout}
        checkingOut={checkingOut}
      />
    </>
  );
}
