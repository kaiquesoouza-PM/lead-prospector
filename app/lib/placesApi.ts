/**
 * Google Places API (New) integration.
 * All calls are made server-side so the API key is never exposed to the browser.
 */
import type { GooglePlace, Lead, LeadFlag, SearchParams } from '../types';

const PLACES_API_BASE = 'https://places.googleapis.com/v1';

/**
 * Fields requested from Places API (New).
 * Only request what you need — each field group has a billing tier.
 * photos is in the "Atmosphere" SKU; everything else is "Basic".
 */
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.nationalPhoneNumber',
  'places.rating',
  'places.userRatingCount',
  'places.websiteUri',
  'places.photos',
  'places.location',
  'places.googleMapsUri',
  'places.primaryType',
].join(',');

// ─── Lead scoring thresholds ─────────────────────────────────────────────────

/** Establishments with fewer reviews than this are considered "low profile". */
const FEW_REVIEWS_THRESHOLD = 50;

/** Establishments with fewer photos than this are considered "low profile". */
const FEW_PHOTOS_THRESHOLD = 5;

// ─── Transform + score ───────────────────────────────────────────────────────

/**
 * Converts a raw GooglePlace into an enriched Lead with flags and a score.
 * Higher leadScore = better prospecting opportunity (the establishment
 * is harder to find online and more likely to need digital marketing help).
 */
export function transformPlace(place: GooglePlace): Lead {
  const hasWebsite    = !!place.websiteUri;
  const photoCount    = place.photos?.length ?? 0;
  const reviewCount   = place.userRatingCount ?? 0;
  const hasFewReviews = reviewCount < FEW_REVIEWS_THRESHOLD;
  const hasFewPhotos  = photoCount  < FEW_PHOTOS_THRESHOLD;

  const flags: LeadFlag[] = [];
  if (!hasWebsite)   flags.push('no-website');
  if (hasFewReviews) flags.push('few-reviews');
  if (hasFewPhotos)  flags.push('few-photos');

  // Simple weighted score: no website = 40pts, few reviews = 30pts, few photos = 30pts
  const leadScore =
    (!hasWebsite   ? 40 : 0) +
    (hasFewReviews ? 30 : 0) +
    (hasFewPhotos  ? 30 : 0);

  return {
    id:              place.id,
    name:            place.displayName.text,
    address:         place.formattedAddress,
    phone:           place.nationalPhoneNumber,
    rating:          place.rating,
    userRatingCount: reviewCount,
    website:         place.websiteUri,
    photoCount,
    location: {
      lat: place.location.latitude,
      lng: place.location.longitude,
    },
    googleMapsUri: place.googleMapsUri,
    primaryType:   place.primaryType,
    hasWebsite,
    hasFewReviews,
    hasFewPhotos,
    leadScore,
    flags,
  };
}

// ─── API call ─────────────────────────────────────────────────────────────────

/**
 * Fetches up to 20 places for a single type. Returns an empty array on error
 * (so one failing type doesn't abort the entire search).
 */
async function fetchByType(
  apiKey: string,
  type: string,
  params: SearchParams
): Promise<GooglePlace[]> {
  const response = await fetch(`${PLACES_API_BASE}/places:searchNearby`, {
    method: 'POST',
    headers: {
      'Content-Type':     'application/json',
      'X-Goog-Api-Key':   apiKey,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify({
      includedTypes: [type],
      maxResultCount: 20, // hard limit per request in Places API (New)
      locationRestriction: {
        circle: {
          center: { latitude: params.lat, longitude: params.lng },
          radius: params.radius,
        },
      },
    }),
    cache: 'no-store',
  });

  if (!response.ok) return [];

  const data = await response.json();
  return (data.places ?? []) as GooglePlace[];
}

/**
 * Fires one Nearby Search request per place type IN PARALLEL, then merges
 * and deduplicates results by place ID.
 *
 * Example: 8 types × 20 results = up to 160 unique leads per search.
 *
 * Must be called from server-side code because it reads GOOGLE_PLACES_API_KEY.
 */
export async function searchNearbyPlaces(params: SearchParams): Promise<Lead[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_PLACES_API_KEY is not set in environment variables.');
  }

  // Fire all type-specific requests concurrently
  const settled = await Promise.allSettled(
    params.types.map((type) => fetchByType(apiKey, type, params))
  );

  // Merge results and deduplicate by place ID
  const seen = new Set<string>();
  const allLeads: Lead[] = [];

  for (const result of settled) {
    if (result.status !== 'fulfilled') continue;
    for (const place of result.value) {
      if (seen.has(place.id)) continue;
      seen.add(place.id);
      allLeads.push(transformPlace(place));
    }
  }

  return allLeads.sort((a, b) => b.leadScore - a.leadScore);
}
