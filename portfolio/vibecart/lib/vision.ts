/**
 * Vision-to-Product Mapping Engine
 * Inspired by /workspace/build-money-system/src/lib/vision.ts
 *
 * In production, replace MOCK_ANALYSIS with a real call to:
 *   - Google Cloud Vision API  (labelDetection + objectLocalization)
 *   - OR OpenAI GPT-4o vision endpoint
 */
import { v4 as uuid } from 'uuid';
import type {
  VisionAnalysis,
  DetectedItem,
  FurnitureCategory,
  RoomStyle,
  Product,
  ProductMatchResult,
  VisionRequest,
} from '../types';
import { STORE_CATALOG, scoreProductMatch } from './crawler';

// ─── Style → Color Palette Map ───────────────────────────────────────────────────────

const STYLE_PALETTE: Record<RoomStyle, string[]> = {
  modern: ['#2C2C2E', '#F5F5F0', '#E8DCC8', '#8B7355'],
  scandinavian: ['#FFFFFF', '#F0EDE8', '#D4C9BD', '#6B5E52'],
  industrial: ['#4A4A4A', '#8B7355', '#2C2C2E', '#A0998F'],
  bohemian: ['#C7956C', '#8B4513', '#D4A96A', '#6B3E26'],
  traditional: ['#8B6914', '#4A3728', '#C8A96E', '#6B4226'],
  coastal: ['#87CEEB', '#F0F8FF', '#C8DCD0', '#7FBEAB'],
  minimalist: ['#FFFFFF', '#F8F8F8', '#E0E0E0', '#333333'],
};

// ─── MOCK: Deterministic scene detector ─────────────────────────────────────────────

const SCENE_TEMPLATES: Array<{
  style: RoomStyle;
  items: Array<{ label: string; category: FurnitureCategory; color: string }>;
}> = [
  {
    style: 'scandinavian',
    items: [
      { label: 'sofa', category: 'sofa', color: '#F0EDE8' },
      { label: 'coffee table', category: 'table', color: '#D4C9BD' },
      { label: 'floor lamp', category: 'lighting', color: '#FFFFFF' },
      { label: 'area rug', category: 'rug', color: '#C8C0B8' },
    ],
  },
  {
    style: 'modern',
    items: [
      { label: 'sectional sofa', category: 'sofa', color: '#2C2C2E' },
      { label: 'dining table', category: 'table', color: '#4A4A4A' },
      { label: 'bookshelf', category: 'shelving', color: '#F5F5F0' },
      { label: 'accent chair', category: 'chair', color: '#8B7355' },
    ],
  },
  {
    style: 'industrial',
    items: [
      { label: 'loft sofa', category: 'sofa', color: '#4A4A4A' },
      { label: 'metal desk', category: 'desk', color: '#2C2C2E' },
      { label: 'pendant light', category: 'lighting', color: '#8B7355' },
      { label: 'storage cabinet', category: 'storage', color: '#4A4A4A' },
    ],
  },
  {
    style: 'bohemian',
    items: [
      { label: 'rattan chair', category: 'chair', color: '#C7956C' },
      { label: 'low coffee table', category: 'table', color: '#8B4513' },
      { label: 'floor cushion', category: 'decor', color: '#D4A96A' },
      { label: 'macrame wall art', category: 'decor', color: '#C8A87A' },
    ],
  },
  {
    style: 'coastal',
    items: [
      { label: 'linen sofa', category: 'sofa', color: '#F0F8FF' },
      { label: 'driftwood table', category: 'table', color: '#D4C9BD' },
      { label: 'woven rug', category: 'rug', color: '#C8DCD0' },
      { label: 'nautical lamp', category: 'lighting', color: '#87CEEB' },
    ],
  },
];

// ─── Mock Vision Analyzer ───────────────────────────────────────────────────────────

export async function analyzeRoomImage(
  request: VisionRequest
): Promise<VisionAnalysis> {
  // Deterministic seed from base64 length (simulates real API variation)
  const seed = request.imageBase64.length % SCENE_TEMPLATES.length;
  const template = SCENE_TEMPLATES[seed];
  const analysisId = uuid();

  // Simulate ~1s API latency
  await delay(900 + Math.random() * 400);

  const detectedItems: DetectedItem[] = template.items.map((item, idx) => ({
    id: uuid(),
    label: item.label,
    category: item.category,
    confidence: 0.82 + idx * 0.03,
    dominantColor: item.color,
    style: template.style,
    boundingBox: {
      x: 0.1 + idx * 0.2,
      y: 0.2 + (idx % 2) * 0.15,
      width: 0.18,
      height: 0.22,
    },
  }));

  return {
    id: analysisId,
    imageUrl: `data:${request.mimeType};base64,${request.imageBase64.slice(0, 32)}...`,
    detectedItems,
    roomStyle: template.style,
    colorPalette: STYLE_PALETTE[template.style],
    confidence: 0.87,
    createdAt: new Date().toISOString(),
  };
}

// ─── Vision → Product Matching ────────────────────────────────────────────────────────

export async function mapVisionToProducts(
  analysis: VisionAnalysis
): Promise<ProductMatchResult[]> {
  const results: ProductMatchResult[] = [];

  for (const item of analysis.detectedItems) {
    // 1. Crawl (mock) all stores for this category
    const rawProducts = await crawlStoresForCategory(
      item.category,
      analysis.roomStyle
    );

    // 2. Score and rank each product
    const scored = rawProducts
      .map((p) => ({
        ...p,
        matchScore: scoreProductMatch(p, item, analysis),
      }))
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 6); // top-6 per detected item

    results.push({
      detectedItemId: item.id,
      detectedLabel: item.label,
      products: scored,
    });
  }

  return results;
}

async function crawlStoresForCategory(
  category: FurnitureCategory,
  style: RoomStyle
): Promise<Product[]> {
  const { simulateCrawl } = await import('./crawler');
  return simulateCrawl(category, style);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
