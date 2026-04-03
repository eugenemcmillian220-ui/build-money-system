import { NextRequest, NextResponse } from 'next/server';
import { analyzeRoomImage, mapVisionToProducts } from '../../../lib/vision';
import { insertSearch } from '../../../lib/supabase';
import type { VisionRequest, VisionResponse } from '../../../types';

export const runtime = 'nodejs';
export const maxDuration = 30;

const MAX_BODY_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // 1. Parse & validate
    const contentLength = Number(req.headers.get('content-length') ?? 0);
    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json(
        { success: false, error: 'Image too large. Max 5 MB.' },
        { status: 413 }
      );
    }

    const body = (await req.json()) as Partial<VisionRequest>;

    if (!body.imageBase64 || !body.mimeType) {
      return NextResponse.json(
        { success: false, error: 'imageBase64 and mimeType are required.' },
        { status: 400 }
      );
    }

    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    if (!allowedMimes.includes(body.mimeType)) {
      return NextResponse.json(
        { success: false, error: `Unsupported image type: ${body.mimeType}` },
        { status: 415 }
      );
    }

    // 2. Run vision analysis (mocked GCP Vision API)
    const analysis = await analyzeRoomImage({
      imageBase64: body.imageBase64,
      mimeType: body.mimeType,
      roomContext: body.roomContext,
    });

    // 3. Map detected items → matching products from all stores
    const products = await mapVisionToProducts(analysis);

    // 4. Persist search record to Supabase (best-effort)
    await insertSearch({
      user_id: null, // anonymous
      image_url: analysis.imageUrl,
      room_style: analysis.roomStyle,
      detected_items: analysis.detectedItems,
      color_palette: analysis.colorPalette,
      confidence: analysis.confidence,
    }).catch((err) => console.error('[Supabase] Failed to persist search:', err));

    const response: VisionResponse = {
      success: true,
      analysisId: analysis.id,
      analysis,
      products,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[Vision API] Error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
