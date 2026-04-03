/**
 * Multi-Store Crawler Simulator
 *
 * Simulates async crawling of IKEA, Wayfair, West Elm, Crate & Barrel.
 * In production, replace simulateCrawl() with real Puppeteer/Playwright
 * scrapers or official store APIs.
 */
import { v4 as uuid } from 'uuid';
import type {
  Product,
  Store,
  FurnitureCategory,
  RoomStyle,
  DetectedItem,
  VisionAnalysis,
} from '../types';

// ─── Store Registry ─────────────────────────────────────────────────────────────────

export const STORE_CATALOG: Store[] = [
  {
    id: 'ikea',
    name: 'IKEA',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Ikea_logo.svg/120px-Ikea_logo.svg.png',
    baseUrl: 'https://www.ikea.com',
    productCount: 12000,
    avgDeliveryDays: 7,
    freeShippingThreshold: 49,
  },
  {
    id: 'wayfair',
    name: 'Wayfair',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Wayfair_logo.svg/160px-Wayfair_logo.svg.png',
    baseUrl: 'https://www.wayfair.com',
    productCount: 22000,
    avgDeliveryDays: 5,
    freeShippingThreshold: 35,
  },
  {
    id: 'westelm',
    name: 'West Elm',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/West_Elm_logo.svg/160px-West_Elm_logo.svg.png',
    baseUrl: 'https://www.westelm.com',
    productCount: 4000,
    avgDeliveryDays: 10,
    freeShippingThreshold: 75,
  },
  {
    id: 'crateandbarrel',
    name: 'Crate & Barrel',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Crate_and_Barrel_logo.svg/160px-Crate_and_Barrel_logo.svg.png',
    baseUrl: 'https://www.crateandbarrel.com',
    productCount: 5000,
    avgDeliveryDays: 9,
    freeShippingThreshold: 65,
  },
];

// ─── Product Seed Catalog (used for mock generation) ────────────────────────────────

type ProductSeed = {
  name: string;
  style: string;
  priceMin: number;
  priceMax: number;
  colors: string[];
  description: string;
  arSupported: boolean;
  dimensions: { widthCm: number; depthCm: number; heightCm: number };
};

const PRODUCT_SEEDS: Record<FurnitureCategory, ProductSeed[]> = {
  sofa: [
    { name: 'Kivik 3-Seat Sofa', style: 'scandinavian', priceMin: 699, priceMax: 1200, colors: ['#F0EDE8', '#4A4A4A', '#8B7355'], description: 'Deep-seated comfort with a clean Scandinavian silhouette and removable covers.', arSupported: true, dimensions: { widthCm: 228, depthCm: 95, heightCm: 83 } },
    { name: 'Haven Sectional', style: 'modern', priceMin: 1299, priceMax: 2800, colors: ['#2C2C2E', '#F5F5F0', '#8B7355'], description: 'Modular sectional sofa with high-density foam cushions and a sleek low profile.', arSupported: true, dimensions: { widthCm: 310, depthCm: 165, heightCm: 79 } },
    { name: 'Loden Velvet Sofa', style: 'bohemian', priceMin: 899, priceMax: 1600, colors: ['#C7956C', '#8B4513', '#6B3E26'], description: 'Luxurious velvet upholstery with deep button tufting and tapered wooden legs.', arSupported: false, dimensions: { widthCm: 190, depthCm: 85, heightCm: 88 } },
    { name: 'Drift Linen Sofa', style: 'coastal', priceMin: 1199, priceMax: 2200, colors: ['#F0F8FF', '#C8DCD0', '#87CEEB'], description: 'Relaxed linen silhouette inspired by beachside living. Easy-clean fabric.', arSupported: true, dimensions: { widthCm: 215, depthCm: 90, heightCm: 80 } },
  ],
  chair: [
    { name: 'Poäng Armchair', style: 'scandinavian', priceMin: 129, priceMax: 299, colors: ['#D4C9BD', '#F0EDE8', '#6B5E52'], description: 'Classic bentwood armchair with resilient high-back design.', arSupported: false, dimensions: { widthCm: 68, depthCm: 82, heightCm: 100 } },
    { name: 'Rattan Egg Chair', style: 'bohemian', priceMin: 249, priceMax: 550, colors: ['#C7956C', '#8B4513', '#D4A96A'], description: 'Handwoven rattan with plush cushion — brings organic warmth to any space.', arSupported: false, dimensions: { widthCm: 78, depthCm: 72, heightCm: 115 } },
    { name: 'Arc Lounge Chair', style: 'modern', priceMin: 599, priceMax: 1100, colors: ['#2C2C2E', '#F5F5F0', '#E8DCC8'], description: 'Award-winning lounge chair with premium leather and cast-aluminum base.', arSupported: true, dimensions: { widthCm: 82, depthCm: 85, heightCm: 76 } },
  ],
  table: [
    { name: 'Lisabo Dining Table', style: 'scandinavian', priceMin: 199, priceMax: 499, colors: ['#D4C9BD', '#F0EDE8'], description: 'Solid ash veneer top with quick-assemble legs. Seats up to 6.', arSupported: false, dimensions: { widthCm: 140, depthCm: 78, heightCm: 74 } },
    { name: 'Noir Marble Coffee Table', style: 'modern', priceMin: 449, priceMax: 950, colors: ['#2C2C2E', '#F5F5F0'], description: 'Genuine Carrara marble top on a powder-coated steel frame.', arSupported: true, dimensions: { widthCm: 110, depthCm: 60, heightCm: 42 } },
    { name: 'Reclaimed Plank Table', style: 'industrial', priceMin: 599, priceMax: 1200, colors: ['#8B7355', '#4A4A4A'], description: 'Solid reclaimed pine paired with industrial pipe-style legs.', arSupported: false, dimensions: { widthCm: 180, depthCm: 90, heightCm: 76 } },
  ],
  lighting: [
    { name: 'Hektar Floor Lamp', style: 'industrial', priceMin: 49, priceMax: 149, colors: ['#4A4A4A', '#2C2C2E'], description: 'Adjustable shade, sturdy and functional with built-in USB charging.', arSupported: false, dimensions: { widthCm: 46, depthCm: 46, heightCm: 180 } },
    { name: 'Arc Brass Pendant', style: 'modern', priceMin: 189, priceMax: 420, colors: ['#E8DCC8', '#8B7355', '#F5F5F0'], description: 'Hand-spun brass shade with adjustable cable. Pairs beautifully over dining tables.', arSupported: false, dimensions: { widthCm: 36, depthCm: 36, heightCm: 25 } },
    { name: 'Seagrass Table Lamp', style: 'coastal', priceMin: 79, priceMax: 180, colors: ['#C8DCD0', '#F0F8FF'], description: 'Natural seagrass base with a white linen drum shade. Beachy and relaxed.', arSupported: false, dimensions: { widthCm: 30, depthCm: 30, heightCm: 55 } },
  ],
  rug: [
    { name: 'Vindum Wool Rug', style: 'scandinavian', priceMin: 199, priceMax: 499, colors: ['#F0EDE8', '#D4C9BD'], description: 'Thick wool pile, hand-woven in a dense loop for extra softness.', arSupported: false, dimensions: { widthCm: 200, depthCm: 300, heightCm: 2 } },
    { name: 'Kilim Flatweave Rug', style: 'bohemian', priceMin: 149, priceMax: 350, colors: ['#C7956C', '#8B4513', '#D4A96A'], description: 'Bold geometric pattern in earthy tones, handcrafted in Morocco.', arSupported: false, dimensions: { widthCm: 160, depthCm: 230, heightCm: 1 } },
  ],
  bed: [
    { name: 'Malm Bed Frame', style: 'scandinavian', priceMin: 299, priceMax: 599, colors: ['#F0EDE8', '#D4C9BD', '#2C2C2E'], description: 'Clean lines, generous storage drawers beneath the slatted base.', arSupported: false, dimensions: { widthCm: 160, depthCm: 200, heightCm: 100 } },
    { name: 'Platform Walnut Bed', style: 'modern', priceMin: 899, priceMax: 1800, colors: ['#8B7355', '#4A3728'], description: 'Solid walnut platform with integrated nightstands. No box spring needed.', arSupported: true, dimensions: { widthCm: 164, depthCm: 210, heightCm: 30 } },
  ],
  storage: [
    { name: 'Kallax Shelf Unit', style: 'scandinavian', priceMin: 99, priceMax: 299, colors: ['#FFFFFF', '#F0EDE8', '#2C2C2E'], description: 'Versatile cube storage — use as a room divider or add doors and drawers.', arSupported: false, dimensions: { widthCm: 147, depthCm: 39, heightCm: 147 } },
    { name: 'Metal Locker Cabinet', style: 'industrial', priceMin: 199, priceMax: 450, colors: ['#4A4A4A', '#2C2C2E'], description: 'Six-door industrial locker in powder-coated steel. Adjustable shelves inside.', arSupported: false, dimensions: { widthCm: 90, depthCm: 45, heightCm: 180 } },
  ],
  desk: [
    { name: 'Micke Desk', style: 'scandinavian', priceMin: 99, priceMax: 249, colors: ['#FFFFFF', '#2C2C2E'], description: 'Compact desk with integrated cable management and practical built-in shelf.', arSupported: false, dimensions: { widthCm: 105, depthCm: 50, heightCm: 75 } },
    { name: 'Industrial Pipe Desk', style: 'industrial', priceMin: 299, priceMax: 650, colors: ['#4A4A4A', '#8B7355'], description: 'Reclaimed wood top on hand-welded iron pipe frame. Built to last.', arSupported: false, dimensions: { widthCm: 150, depthCm: 60, heightCm: 76 } },
  ],
  shelving: [
    { name: 'Billy Bookcase', style: 'scandinavian', priceMin: 79, priceMax: 199, colors: ['#FFFFFF', '#D4C9BD', '#2C2C2E'], description: 'Iconic adjustable shelving in multiple heights. Pairs with doors and extensions.', arSupported: false, dimensions: { widthCm: 80, depthCm: 28, heightCm: 202 } },
    { name: 'Ladder Shelf', style: 'modern', priceMin: 149, priceMax: 380, colors: ['#F5F5F0', '#8B7355'], description: 'Leaning ladder-style shelving in solid wood and matte black powder-coated steel.', arSupported: false, dimensions: { widthCm: 45, depthCm: 40, heightCm: 180 } },
  ],
  decor: [
    { name: 'Monstera Planter', style: 'bohemian', priceMin: 29, priceMax: 89, colors: ['#C7956C', '#8B4513'], description: 'Hand-thrown stoneware planter with drainage hole. Available in three earthy glazes.', arSupported: false, dimensions: { widthCm: 25, depthCm: 25, heightCm: 30 } },
    { name: 'Abstract Canvas Print', style: 'modern', priceMin: 59, priceMax: 249, colors: ['#2C2C2E', '#F5F5F0', '#E8DCC8'], description: 'Gallery-wrapped giclée print on 100% cotton canvas. Ready to hang.', arSupported: false, dimensions: { widthCm: 60, depthCm: 4, heightCm: 80 } },
  ],
};

// ─── Crawl Simulator ────────────────────────────────────────────────────────────────

export async function simulateCrawl(
  category: FurnitureCategory,
  style: RoomStyle
): Promise<Product[]> {
  // Simulate network latency per store
  await Promise.all(STORE_CATALOG.map(() => delay(50 + Math.random() * 100)));

  const seeds = PRODUCT_SEEDS[category] ?? [];
  const products: Product[] = [];

  for (const store of STORE_CATALOG) {
    for (let i = 0; i < seeds.length; i++) {
      const seed = seeds[i];
      const price =
        Math.round(
          (seed.priceMin + Math.random() * (seed.priceMax - seed.priceMin)) * 100
        ) / 100;
      const imageIdx = (store.id.charCodeAt(0) + i) % 20 + 10;

      products.push({
        id: uuid(),
        externalId: `${store.id}-${category}-${i}`,
        storeId: store.id,
        storeName: store.name,
        storeLogoUrl: store.logoUrl,
        name: `${seed.name} — ${store.name}`,
        description: seed.description,
        price,
        currency: 'USD',
        imageUrl: `https://picsum.photos/seed/${store.id}${category}${i}/400/300`,
        productUrl: `${store.baseUrl}/products/${category}/${store.id}-${i}`,
        category,
        style: seed.style,
        colors: seed.colors,
        inStock: Math.random() > 0.12,
        rating: 3.5 + Math.random() * 1.5,
        reviewCount: Math.floor(10 + Math.random() * 990),
        matchScore: 0, // will be set by vision engine
        arSupported: seed.arSupported,
        dimensions: seed.dimensions,
      });
    }
  }

  return products;
}

// ─── Match Scoring Algorithm ────────────────────────────────────────────────────────

export function scoreProductMatch(
  product: Product,
  item: DetectedItem,
  analysis: VisionAnalysis
): number {
  let score = 0;

  // Style match (40 pts)
  if (product.style === analysis.roomStyle) score += 40;
  else if (isComplementaryStyle(product.style, analysis.roomStyle)) score += 20;

  // Color match (30 pts)
  const colorMatch = product.colors.some((c) =>
    isColorClose(c, item.dominantColor)
  );
  if (colorMatch) score += 30;

  // Category match (20 pts)
  if (product.category === item.category) score += 20;

  // Availability bonus (5 pts)
  if (product.inStock) score += 5;

  // Rating bonus (5 pts)
  score += Math.round((product.rating / 5) * 5);

  return Math.min(score, 100);
}

function isComplementaryStyle(a: string, b: string): boolean {
  const COMPATIBLE: Record<string, string[]> = {
    modern: ['minimalist', 'industrial'],
    scandinavian: ['minimalist', 'coastal'],
    industrial: ['modern'],
    bohemian: ['traditional', 'coastal'],
    traditional: ['bohemian'],
    coastal: ['scandinavian', 'bohemian'],
    minimalist: ['modern', 'scandinavian'],
  };
  return COMPATIBLE[a]?.includes(b) ?? false;
}

function isColorClose(hex1: string, hex2: string): boolean {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  const dist = Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
  return dist < 100; // Euclidean distance threshold
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
