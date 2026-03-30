import { NextRequest, NextResponse } from 'next/server';
import { marketplace } from '@/lib/marketplace';
import { security } from '@/lib/security';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !security.validateApiKey(authHeader.replace('Bearer ', ''))) {
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
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !security.validateApiKey(authHeader.replace('Bearer ', ''))) {
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
