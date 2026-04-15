import { NextRequest, NextResponse } from 'next/server';
import { marketplace } from '@/lib/marketplace';
import { security } from '@/lib/security';
import { requireAuth, isAuthError } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  try {
    // Check for API key in either x-api-key header or Authorization header
    const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace('Bearer ', '');
    if (!apiKey || !security.validateApiKey(apiKey)) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const category = searchParams.get('category') ?? undefined;
    const sellerId = searchParams.get('sellerId') ?? undefined;
    const maxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined;
    const minRating = searchParams.get('minRating') ? Number(searchParams.get('minRating')) : undefined;

    const listings = marketplace.getListings({ category, sellerId, maxPrice, minRating });

    return NextResponse.json({ success: true, data: { listings } });
  } catch (error) {
    console.error('Marketplace GET Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve listings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  try {
    const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace('Bearer ', '');
    if (!apiKey || !security.validateApiKey(apiKey)) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    if (action === 'purchase') {
      const { listingId, buyerId } = body;
      if (!listingId || !buyerId) {
        return NextResponse.json({ error: 'listingId and buyerId are required' }, { status: 400 });
      }
      const purchase = marketplace.purchaseListing(listingId, buyerId);
      return NextResponse.json({ success: true, data: purchase });
    }

    const { title, description, category, price, sellerId, tags } = body;
    if (!title || !description || !category || price === undefined || !sellerId) {
      return NextResponse.json(
        { error: 'title, description, category, price, and sellerId are required' },
        { status: 400 }
      );
    }

    const listing = marketplace.addListing({ title, description, category, price, sellerId, tags });
    return NextResponse.json({ success: true, data: listing }, { status: 201 });
  } catch (error) {
    console.error('Marketplace POST Error:', error);
    return NextResponse.json({ error: 'Failed to process marketplace request' }, { status: 500 });
  }
}
