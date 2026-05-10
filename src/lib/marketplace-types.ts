/**
 * Marketplace type definitions.
 * Separated from marketplace.ts so client components can import types
 * without pulling in server-only Supabase dependencies.
 */

export interface ListingInput {
  title: string;
  description: string;
  category: string;
  price: number;
  sellerId: string;
  tags?: string[];
}

export interface Listing extends ListingInput {
  id: string;
  createdAt: string;
  updatedAt: string;
  purchaseCount: number;
  rating: number;
  reviewCount: number;
  status: "active" | "paused" | "removed";
}

export interface ListingFilters {
  category?: string;
  sellerId?: string;
  maxPrice?: number;
  minRating?: number;
  status?: Listing["status"];
  tags?: string[];
}

export interface Purchase {
  id: string;
  listingId: string;
  buyerId: string;
  amount: number;
  purchasedAt: string;
  status: "completed" | "refunded";
}

export interface Review {
  id: string;
  listingId: string;
  userId: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface AgentSkill {
  id: string;
  name: string;
  slug: string;
  description: string;
  authorId: string;
  authorName: string;
  category: "ui" | "logic" | "security" | "data";
  price: number;
  promptTemplate: string;
  requiredTools?: string[];
  version: string;
  rating: number;
  usageCount: number;
  isVerified: boolean;
  createdAt: string;
}
