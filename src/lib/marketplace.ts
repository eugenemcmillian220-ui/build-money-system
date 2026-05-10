/**
 * Marketplace Module for Phase 6 - Autonomous AI Company Builder
 * Manages AI module and template listings, purchases, and reviews.
 * Persisted to Supabase (DA-037, DA-038 fixes).
 */

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type {
  ListingInput,
  Listing,
  ListingFilters,
  Purchase,
  Review,
  AgentSkill,
} from "@/lib/marketplace-types";

// Re-export all types so existing server-side imports still work
export type {
  ListingInput,
  Listing,
  ListingFilters,
  Purchase,
  Review,
  AgentSkill,
} from "@/lib/marketplace-types";

// Helper: map snake_case DB row to camelCase Listing
function rowToListing(row: Record<string, unknown>): Listing {
  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string,
    category: row.category as string,
    price: row.price as number,
    sellerId: row.seller_id as string,
    tags: (row.tags as string[]) ?? [],
    purchaseCount: row.purchase_count as number,
    rating: row.rating as number,
    reviewCount: row.review_count as number,
    status: row.status as Listing["status"],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function rowToPurchase(row: Record<string, unknown>): Purchase {
  return {
    id: row.id as string,
    listingId: row.listing_id as string,
    buyerId: row.buyer_id as string,
    amount: row.amount as number,
    purchasedAt: row.purchased_at as string,
    status: row.status as Purchase["status"],
  };
}

function rowToReview(row: Record<string, unknown>): Review {
  return {
    id: row.id as string,
    listingId: row.listing_id as string,
    userId: row.user_id as string,
    rating: row.rating as number,
    comment: (row.comment as string) ?? undefined,
    createdAt: row.created_at as string,
  };
}

export class Marketplace {
  async addSkill(
    skill: Omit<AgentSkill, "id" | "createdAt" | "rating" | "usageCount" | "isVerified">,
  ): Promise<AgentSkill> {
    const supabase = getSupabaseAdmin();
    const newSkill: AgentSkill = {
      ...skill,
      id: crypto.randomUUID(),
      rating: 0,
      usageCount: 0,
      isVerified: false,
      createdAt: new Date().toISOString(),
    };

    const { error } = await supabase.from("agent_skills").insert({
      id: newSkill.id,
      name: newSkill.name,
      slug: newSkill.slug,
      description: newSkill.description,
      author_id: newSkill.authorId,
      author_name: newSkill.authorName,
      category: newSkill.category,
      price: newSkill.price,
      prompt_template: newSkill.promptTemplate,
      required_tools: newSkill.requiredTools ?? [],
      version: newSkill.version,
      rating: 0,
      usage_count: 0,
      is_verified: false,
    });

    if (error) {
      console.error("[marketplace] addSkill failed:", error.message);
      throw new Error(`Failed to add skill: ${error.message}`);
    }

    return newSkill;
  }

  async getSkills(category?: string): Promise<AgentSkill[]> {
    const supabase = getSupabaseAdmin();
    let query = supabase.from("agent_skills").select("*");
    if (category) query = query.eq("category", category);

    const { data, error } = await query;
    if (error) {
      console.error("[marketplace] getSkills failed:", error.message);
      return [];
    }

    return (data ?? []).map((row) => ({
      id: row.id as string,
      name: row.name as string,
      slug: row.slug as string,
      description: row.description as string,
      authorId: row.author_id as string,
      authorName: row.author_name as string,
      category: row.category as AgentSkill["category"],
      price: row.price as number,
      promptTemplate: row.prompt_template as string,
      requiredTools: (row.required_tools as string[]) ?? [],
      version: row.version as string,
      rating: row.rating as number,
      usageCount: row.usage_count as number,
      isVerified: row.is_verified as boolean,
      createdAt: row.created_at as string,
    }));
  }

  async addListing(item: ListingInput): Promise<Listing> {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("marketplace_listings")
      .insert({
        title: item.title,
        description: item.description,
        category: item.category,
        price: item.price,
        seller_id: item.sellerId,
        tags: item.tags ?? [],
      })
      .select()
      .single();

    if (error || !data) {
      console.error("[marketplace] addListing failed:", error?.message);
      throw new Error(`Failed to add listing: ${error?.message}`);
    }

    return rowToListing(data);
  }

  async getListings(filters?: ListingFilters): Promise<Listing[]> {
    const supabase = getSupabaseAdmin();
    let query = supabase.from("marketplace_listings").select("*");

    const filterStatus = filters?.status ?? "active";
    query = query.eq("status", filterStatus);

    if (filters?.category) query = query.eq("category", filters.category);
    if (filters?.sellerId) query = query.eq("seller_id", filters.sellerId);
    if (filters?.maxPrice !== undefined) query = query.lte("price", filters.maxPrice);
    if (filters?.minRating !== undefined) query = query.gte("rating", filters.minRating);
    if (filters?.tags?.length) query = query.overlaps("tags", filters.tags);

    const { data, error } = await query;
    if (error) {
      console.error("[marketplace] getListings failed:", error.message);
      return [];
    }

    return (data ?? []).map(rowToListing);
  }

  async getListing(listingId: string): Promise<Listing | null> {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("marketplace_listings")
      .select("*")
      .eq("id", listingId)
      .single();

    if (error || !data) return null;
    return rowToListing(data);
  }

  async purchaseListing(listingId: string, buyerId: string): Promise<Purchase> {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc("purchase_listing_atomic", {
      p_listing_id: listingId,
      p_buyer_id: buyerId,
    });

    if (error) {
      console.error("[marketplace] purchaseListing failed:", error.message);
      throw new Error(error.message);
    }

    const row = Array.isArray(data) ? data[0] : data;
    return {
      id: row.purchase_id as string,
      listingId,
      buyerId,
      amount: row.purchase_amount as number,
      purchasedAt: new Date().toISOString(),
      status: "completed",
    };
  }

  async addReview(
    listingId: string,
    userId: string,
    rating: number,
    comment?: string,
  ): Promise<Review> {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc("add_review_atomic", {
      p_listing_id: listingId,
      p_user_id: userId,
      p_rating: rating,
      p_comment: comment ?? null,
    });

    if (error) {
      console.error("[marketplace] addReview failed:", error.message);
      throw new Error(error.message);
    }

    const reviewId = typeof data === "string" ? data : (data as string);
    return {
      id: reviewId,
      listingId,
      userId,
      rating,
      comment,
      createdAt: new Date().toISOString(),
    };
  }

  async getPurchaseHistory(buyerId: string): Promise<Purchase[]> {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("marketplace_purchases")
      .select("*")
      .eq("buyer_id", buyerId)
      .order("purchased_at", { ascending: false });

    if (error) {
      console.error("[marketplace] getPurchaseHistory failed:", error.message);
      return [];
    }

    return (data ?? []).map(rowToPurchase);
  }

  async getReviews(listingId: string): Promise<Review[]> {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("marketplace_reviews")
      .select("*")
      .eq("listing_id", listingId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[marketplace] getReviews failed:", error.message);
      return [];
    }

    return (data ?? []).map(rowToReview);
  }
}

export const marketplace = new Marketplace();
