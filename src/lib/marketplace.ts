/**
 * Marketplace Module for Phase 6 - Autonomous AI Company Builder
 * Manages AI module and template listings, purchases, and reviews
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
  status: 'active' | 'paused' | 'removed';
}

export interface ListingFilters {
  category?: string;
  sellerId?: string;
  maxPrice?: number;
  minRating?: number;
  status?: Listing['status'];
  tags?: string[];
}

export interface Purchase {
  id: string;
  listingId: string;
  buyerId: string;
  amount: number;
  purchasedAt: string;
  status: 'completed' | 'refunded';
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
  category: 'ui' | 'logic' | 'security' | 'data';
  price: number;
  promptTemplate: string;
  requiredTools?: string[];
  version: string;
  rating: number;
  usageCount: number;
  isVerified: boolean;
  createdAt: string;
}

export class Marketplace {
  private listings: Listing[] = [];
  private purchases: Purchase[] = [];
  private reviews: Review[] = [];
  private skills: AgentSkill[] = [];

  addSkill(skill: Omit<AgentSkill, 'id' | 'createdAt' | 'rating' | 'usageCount' | 'isVerified'>): AgentSkill {
    const newSkill: AgentSkill = {
      ...skill,
      id: Math.random().toString(36).substring(2, 11),
      rating: 0,
      usageCount: 0,
      isVerified: false,
      createdAt: new Date().toISOString(),
    };
    this.skills.push(newSkill);
    return newSkill;
  }

  getSkills(category?: string): AgentSkill[] {
    return category ? this.skills.filter(s => s.category === category) : this.skills;
  }

  addListing(item: ListingInput): Listing {
    const listing: Listing = {
      ...item,
      id: Math.random().toString(36).substring(2, 11),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      purchaseCount: 0,
      rating: 0,
      reviewCount: 0,
      status: 'active',
    };
    this.listings.push(listing);
    return listing;
  }

  getListings(filters?: ListingFilters): Listing[] {
    let result = this.listings.filter(l => l.status === 'active');

    if (filters?.category) result = result.filter(l => l.category === filters.category);
    if (filters?.sellerId) result = result.filter(l => l.sellerId === filters.sellerId);
    if (filters?.maxPrice !== undefined) result = result.filter(l => l.price <= filters.maxPrice!);
    if (filters?.minRating !== undefined) result = result.filter(l => l.rating >= filters.minRating!);
    if (filters?.status) result = this.listings.filter(l => l.status === filters.status);
    if (filters?.tags?.length) {
      result = result.filter(l => filters.tags!.some(tag => l.tags?.includes(tag)));
    }

    return result;
  }

  getListing(listingId: string): Listing | null {
    return this.listings.find(l => l.id === listingId) ?? null;
  }

  purchaseListing(listingId: string, buyerId: string): Purchase {
    const listing = this.listings.find(l => l.id === listingId);
    if (!listing) throw new Error(`Listing ${listingId} not found`);
    if (listing.status !== 'active') throw new Error(`Listing ${listingId} is not available`);

    const purchase: Purchase = {
      id: Math.random().toString(36).substring(2, 11),
      listingId,
      buyerId,
      amount: listing.price,
      purchasedAt: new Date().toISOString(),
      status: 'completed',
    };

    this.purchases.push(purchase);
    listing.purchaseCount++;
    listing.updatedAt = new Date().toISOString();

    return purchase;
  }

  addReview(listingId: string, userId: string, rating: number, comment?: string): Review {
    const listing = this.listings.find(l => l.id === listingId);
    if (!listing) throw new Error(`Listing ${listingId} not found`);

    const review: Review = {
      id: Math.random().toString(36).substring(2, 11),
      listingId,
      userId,
      rating,
      comment,
      createdAt: new Date().toISOString(),
    };

    this.reviews.push(review);

    const listingReviews = this.reviews.filter(r => r.listingId === listingId);
    listing.rating = listingReviews.reduce((sum, r) => sum + r.rating, 0) / listingReviews.length;
    listing.reviewCount = listingReviews.length;
    listing.updatedAt = new Date().toISOString();

    return review;
  }

  getPurchaseHistory(buyerId: string): Purchase[] {
    return this.purchases.filter(p => p.buyerId === buyerId);
  }

  clearAll(): void {
    this.listings = [];
    this.purchases = [];
    this.reviews = [];
  }
}

export const marketplace = new Marketplace();
