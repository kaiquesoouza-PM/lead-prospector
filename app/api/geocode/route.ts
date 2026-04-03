/**
 * POST /api/geocode
 * Body: { address: string }
 * Returns: { lat, lng, formattedAddress }
 *
 * Converts a human-readable address to coordinates using the Geocoding API.
 * Runs server-side so the API key is never exposed to the browser.
 */
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();

    if (!address || typeof address !== 'string' || !address.trim()) {
      return NextResponse.json(
        { error: 'O campo address é obrigatório.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GOOGLE_PLACES_API_KEY não configurada.' },
        { status: 500 }
      );
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      address.trim()
    )}&key=${apiKey}&language=pt-BR`;

    const res  = await fetch(url, { cache: 'no-store' });
    const data = await res.json();

    if (data.status !== 'OK' || !data.results?.length) {
      return NextResponse.json(
        { error: `Não foi possível geocodificar o endereço. Status: ${data.status}` },
        { status: 400 }
      );
    }

    const result = data.results[0];
    const { lat, lng } = result.geometry.location;

    return NextResponse.json({
      lat,
      lng,
      formattedAddress: result.formatted_address,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido.';
    console.error('[/api/geocode] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
