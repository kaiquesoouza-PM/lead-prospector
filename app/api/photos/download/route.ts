/**
 * GET /api/photos/download?url=<encoded-url>&filename=<name>
 *
 * Server-side proxy that fetches a Google photo and returns it as a
 * downloadable file. This is necessary because Google's photo CDN
 * (lh3.googleusercontent.com) blocks direct browser downloads due to
 * CORS restrictions.
 *
 * Security: only URLs from Google's photo CDN are allowed.
 */
import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_ORIGIN = 'https://lh3.googleusercontent.com/';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const url      = searchParams.get('url');
  const filename = searchParams.get('filename') ?? 'foto.jpg';

  if (!url) {
    return new NextResponse('Parâmetro url é obrigatório.', { status: 400 });
  }

  // Only allow Google's photo CDN — prevents this endpoint being used as an open proxy
  if (!url.startsWith(ALLOWED_ORIGIN)) {
    return new NextResponse('URL não permitida.', { status: 403 });
  }

  const res = await fetch(url, { cache: 'no-store' });

  if (!res.ok) {
    return new NextResponse('Foto não encontrada.', { status: 404 });
  }

  const contentType = res.headers.get('Content-Type') ?? 'image/jpeg';
  const buffer      = await res.arrayBuffer();

  return new NextResponse(buffer, {
    headers: {
      'Content-Type':        contentType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      'Cache-Control':       'no-store',
    },
  });
}
