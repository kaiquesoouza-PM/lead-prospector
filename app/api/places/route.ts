/**
 * POST /api/places
 * Body: { lat, lng, radius (metres), types? }
 * Returns: { leads: Lead[], total: number }
 *
 * This route runs server-side only — the API key never reaches the browser.
 */
import { NextRequest, NextResponse } from 'next/server';
import { searchNearbyPlaces } from '../../lib/placesApi';
import type { PlaceType } from '../../types';

const VALID_TYPES: PlaceType[] = [
  'restaurant',
  'bar',
  'bakery',
  'cafe',
  'fast_food_restaurant',
  'hamburger_restaurant',
  'pizza_restaurant',
  'sandwich_shop',
  'meal_takeaway',
  'ice_cream_shop',
  'juice_bar',
  'brunch_restaurant',
];
const MAX_RADIUS = 50_000; // Google Places API (New) hard limit in metres

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lat, lng, radius, types } = body;

    // ── Validation ──────────────────────────────────────────────────────────
    if (lat === undefined || lng === undefined || radius === undefined) {
      return NextResponse.json(
        { error: 'Os campos lat, lng e radius são obrigatórios.' },
        { status: 400 }
      );
    }

    const parsedLat    = Number(lat);
    const parsedLng    = Number(lng);
    const parsedRadius = Math.min(Number(radius), MAX_RADIUS);

    if (isNaN(parsedLat) || isNaN(parsedLng) || isNaN(parsedRadius)) {
      return NextResponse.json(
        { error: 'lat, lng e radius devem ser números válidos.' },
        { status: 400 }
      );
    }

    // Validate requested types; fall back to all food types
    const requestedTypes: PlaceType[] = Array.isArray(types)
      ? types.filter((t: string) => VALID_TYPES.includes(t as PlaceType))
      : VALID_TYPES;

    const finalTypes = requestedTypes.length > 0 ? requestedTypes : VALID_TYPES;

    // ── Call Places API ─────────────────────────────────────────────────────
    const leads = await searchNearbyPlaces({
      lat:    parsedLat,
      lng:    parsedLng,
      radius: parsedRadius,
      types:  finalTypes,
    });

    return NextResponse.json({ leads, total: leads.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido.';
    console.error('[/api/places] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
