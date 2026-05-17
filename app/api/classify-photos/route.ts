/**
 * POST /api/classify-photos
 * Body: { urls: string[] }
 * Returns: { classified: ClassifiedPhotos }
 *
 * Sends each photo URL to Google Cloud Vision API (LABEL_DETECTION)
 * and classifies each photo into: facade | interior | food | other.
 *
 * Falls back to positional heuristic if Vision API fails.
 */
import { NextRequest, NextResponse } from 'next/server';
import type { ClassifiedPhotos } from '../../lib/exportUtils';

// ─── Classification keywords ──────────────────────────────────────────────────

const FOOD_KEYWORDS = [
  'food', 'dish', 'cuisine', 'recipe', 'ingredient', 'meal', 'drink',
  'beverage', 'dessert', 'snack', 'plate', 'bowl', 'pizza', 'burger',
  'sushi', 'pasta', 'steak', 'salad', 'sandwich', 'coffee', 'cocktail',
  'juice', 'pastry', 'bread', 'cheese', 'meat', 'seafood', 'vegetable',
  'fruit', 'chocolate', 'cake', 'ice cream', 'baked goods', 'tableware',
  'fast food', 'junk food', 'finger food', 'street food', 'brunch',
];

const FACADE_KEYWORDS = [
  'facade', 'building', 'storefront', 'signage', 'awning', 'entrance',
  'exterior', 'architecture', 'commercial building', 'retail', 'sign',
  'street', 'urban area', 'neighbourhood', 'sidewalk', 'canopy',
  'door', 'gate', 'window display',
];

const INTERIOR_KEYWORDS = [
  'interior design', 'table', 'chair', 'furniture', 'room', 'dining room',
  'ceiling', 'lighting', 'decor', 'cafeteria', 'pub', 'diner', 'lobby',
  'hall', 'seating', 'restaurant', 'bar', 'counter', 'booth', 'wall',
  'floor', 'carpet', 'lamp', 'chandelier', 'ambience',
];

type Category = 'facade' | 'interior' | 'food' | 'other';

function classifyByLabels(labels: string[]): Category {
  const lower = labels.map((l) => l.toLowerCase());

  const isFood     = lower.some((l) => FOOD_KEYWORDS.some((k) => l.includes(k)));
  const isFacade   = lower.some((l) => FACADE_KEYWORDS.some((k) => l.includes(k)));
  const isInterior = lower.some((l) => INTERIOR_KEYWORDS.some((k) => l.includes(k)));

  // Priority: food > facade > interior > other
  if (isFood)     return 'food';
  if (isFacade)   return 'facade';
  if (isInterior) return 'interior';
  return 'other';
}

function positionalFallback(urls: string[]): ClassifiedPhotos {
  return {
    facade:   urls[0] ?? null,
    interior: urls.slice(1, 3),
    food:     urls.slice(3, 6),
    other:    urls.slice(6),
    all:      urls,
    source:   'positional',
  };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { urls } = (await request.json()) as { urls: string[] };

    if (!Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({
        classified: { facade: null, interior: [], food: [], other: [], all: [], source: 'vision' },
      });
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GOOGLE_PLACES_API_KEY não configurada.' }, { status: 500 });
    }

    // ── Call Vision API (batch — all URLs in one request) ──────────────────
    const visionBody = {
      requests: urls.map((url) => ({
        image:    { source: { imageUri: url } },
        features: [{ type: 'LABEL_DETECTION', maxResults: 15 }],
      })),
    };

    const visionRes = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(visionBody),
      }
    );

    if (!visionRes.ok) {
      const errText = await visionRes.text();
      console.error('[classify-photos] Vision API error:', errText);
      return NextResponse.json({
        classified: positionalFallback(urls),
        warning:    'Vision API indisponível — usando classificação posicional.',
      });
    }

    const visionData = await visionRes.json();
    const responses: { labelAnnotations?: { description: string; score: number }[] }[] =
      visionData.responses ?? [];

    // ── Classify each photo ────────────────────────────────────────────────
    const categorized = responses.map((r, i) => {
      const labels = (r.labelAnnotations ?? []).map((a) => a.description);
      return { url: urls[i], category: classifyByLabels(labels) };
    });

    // ── Build result ───────────────────────────────────────────────────────
    const result: ClassifiedPhotos = {
      facade:   null,
      interior: [],
      food:     [],
      other:    [],
      all:      urls,
      source:   'vision',
    };

    let facadeAssigned = false;

    for (const { url, category } of categorized) {
      if (category === 'facade' && !facadeAssigned) {
        result.facade = url;
        facadeAssigned = true;
      } else if (category === 'food') {
        result.food.push(url);
      } else if (category === 'interior') {
        result.interior.push(url);
      } else {
        result.other.push(url);
      }
    }

    // If Vision didn't detect a facade, use the first photo (positional fallback)
    if (!facadeAssigned && urls.length > 0) {
      const firstUrl = urls[0];
      result.facade   = firstUrl;
      result.interior = result.interior.filter((u) => u !== firstUrl);
      result.food     = result.food.filter((u) => u !== firstUrl);
      result.other    = result.other.filter((u) => u !== firstUrl);
    }

    return NextResponse.json({ classified: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido.';
    console.error('[classify-photos] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
