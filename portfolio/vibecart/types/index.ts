// ─── Core Domain Types ──────────────────────────────────────────────────────

export interface VisionAnalysis {
  id: string;
  imageUrl: string;
  detectedItems: DetectedItem[];
  roomStyle: RoomStyle;
  colorPalette: string[];
  confidence: number;
  createdAt: string;
}

export interface DetectedItem {
  id: string;
  label: string;          // e.g. "sofa", "coffee_table"
  category: FurnitureCategory;
  boundingBox: BoundingBox;
  confidence: number;
  dominantColor: string;
  style: string;          // e.g. "modern", "scandinavian"
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type RoomStyle =
  | "modern"
  | "scandinavian"
  | "industrial"
  | "bohemian"
  | "traditional"
  | "coastal"
  | "minimalist";

export type FurnitureCategory =
  | "sofa"
  | "chair"
  | "table"
  | "bed"
  | "storage"
  | "lighting"
  | "rug"
  | "desk"
  | "shelving"
  | "decor";

// ─── Product / Store Types ───────────────────────────────────────────────────

export interface Product {
  id: string;
  externalId: string;
  storeId: string;
  storeName: string;
  storeLogoUrl: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  imageUrl: string;
  productUrl: string;
  category: FurnitureCategory;
  style: string;
  colors: string[];
  inStock: boolean;
  rating: number;
  reviewCount: number;
  matchScore: number;     // 0-100
  arSupported: boolean;
  dimensions?: Dimensions;
}

export interface Dimensions {
  widthCm: number;
  depthCm: number;
  heightCm: number;
  weightKg?: number;
}

export interface Store {
  id: string;
  name: string;
  logoUrl: string;
  baseUrl: string;
  productCount: number;
  avgDeliveryDays: number;
  freeShippingThreshold: number;
}

// ─── Cart / Checkout Types ───────────────────────────────────────────────────

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface CheckoutSession {
  sessionId: string;
  url: string;
  amount: number;
  currency: string;
  items: CartItem[];
}

// ─── API Request / Response Types ────────────────────────────────────────────

export interface VisionRequest {
  imageBase64: string;
  mimeType: string;
  roomContext?: string;
}

export interface VisionResponse {
  success: boolean;
  analysisId: string;
  analysis: VisionAnalysis;
  products: ProductMatchResult[];
  error?: string;
}

export interface ProductMatchResult {
  detectedItemId: string;
  detectedLabel: string;
  products: Product[];
}

export interface CheckoutRequest {
  items: CartItem[];
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutResponse {
  sessionId: string;
  url: string;
  error?: string;
}

// ─── Supabase DB Row Types ────────────────────────────────────────────────────

export interface SearchRecord {
  id: string;
  user_id: string | null;
  image_url: string;
  room_style: RoomStyle;
  detected_items: DetectedItem[];
  color_palette: string[];
  confidence: number;
  created_at: string;
}

export interface ProductRecord {
  id: string;
  external_id: string;
  store_id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  image_url: string;
  product_url: string;
  category: FurnitureCategory;
  style: string;
  colors: string[];
  in_stock: boolean;
  rating: number;
  review_count: number;
  ar_supported: boolean;
  dimensions: Dimensions | null;
  created_at: string;
  updated_at: string;
}
