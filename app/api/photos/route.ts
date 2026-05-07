/**
 * POST /api/photos
 * Body: { refs: string[] }  — photo reference strings from Places API
 * Returns: { photos: { ref: string; url: string }[] }
 *
 * The Places API (New) returns photo *references* (not direct URLs).
 * This route resolves each reference into a usable image URL server-side,
 * keeping the API key out of the browser.
 *
 * Endpoint used:
 *   GET https://places.googleapis.com/v1/{ref}/media
 *       ?maxWidthPx=800&skipHttpRedirect=true&key=API_KEY
 *
 * With skipHttpRedirect=true the API returns JSON { photoUri: "https://lh3..." }
 * instead of a redirect. The photoUri is a public CDN URL (no key embedded).
 */
import { NextRequest, NextResponse } from 'next/server';

const MAX_PHOTOS = 10;
const PHOTO_WIDTH = 800;

async function resolvePhotoUrl(ref: string, apiKey: string): Promise<string | null> {
  const url = `https://places.googleapis.com/v1/${ref}/media?maxWidthPx=${PHOTO_WIDTH}&skipHttpRedirect=true&key=${apiKey}`;

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;

  const data = await res.json();
  return typeof data.photoUri === 'string' ? data.photoUri : null;
}

export async function POST(request: NextRequest) {
  try {
    const { refs } = await request.json();

    if (!Array.isArray(refs) || refs.length === 0) {
      return NextResponse.json({ photos: [] });
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GOOGLE_PLACES_API_KEY não configurada.' }, { status: 500 });
    }

    const limited = refs.slice(0, MAX_PHOTOS);

    // Resolve all refs in parallel
    const settled = await Promise.allSettled(
      limited.map((ref) => resolvePhotoUrl(ref, apiKey))
    );

    const photos = settled
      .map((result, i) => ({
        ref: limited[i],
        url: result.status === 'fulfilled' ? result.value : null,
      }))
      .filter((p): p is { ref: string; url: string } => p.url !== null);

    return NextResponse.json({ photos });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido.';
    console.error('[/api/photos] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
