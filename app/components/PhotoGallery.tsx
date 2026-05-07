'use client';

import { useState, useEffect } from 'react';

interface Photo {
  ref: string;
  url: string;
}

interface PhotoGalleryProps {
  photoRefs: string[];
  leadName:  string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function downloadUrl(photoUrl: string, filename: string): string {
  return `/api/photos/download?url=${encodeURIComponent(photoUrl)}&filename=${encodeURIComponent(filename)}`;
}

function triggerDownload(href: string) {
  const a = document.createElement('a');
  a.href = href;
  a.click();
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PhotoGallery({ photoRefs, leadName }: PhotoGalleryProps) {
  const [photos,         setPhotos]         = useState<Photo[]>([]);
  const [isLoading,      setIsLoading]      = useState(false);
  const [lightbox,       setLightbox]       = useState<{ url: string; index: number } | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);

  useEffect(() => {
    if (photoRefs.length === 0) { setPhotos([]); return; }

    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setPhotos([]);
      const res = await fetch('/api/photos', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ refs: photoRefs }),
      });
      if (cancelled) return;
      if (res.ok) {
        const data = await res.json();
        if (!cancelled) setPhotos(data.photos ?? []);
      }
      if (!cancelled) setIsLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [photoRefs]);

  // Download all photos sequentially with a small delay so the browser
  // doesn't treat them as a popup storm
  const handleDownloadAll = async () => {
    if (photos.length === 0) return;
    setDownloadingAll(true);
    const slug = slugify(leadName);
    for (let i = 0; i < photos.length; i++) {
      const filename = `${slug}-foto-${i + 1}.jpg`;
      triggerDownload(downloadUrl(photos[i].url, filename));
      // Small delay between each download so the browser doesn't block them
      if (i < photos.length - 1) {
        await new Promise((r) => setTimeout(r, 600));
      }
    }
    setDownloadingAll(false);
  };

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: Math.min(photoRefs.length, 10) }).map((_, i) => (
          <div key={i} className="aspect-square rounded-xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  // ── No photos ───────────────────────────────────────────────────────────────
  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-gray-300 gap-2">
        <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        </svg>
        <p className="text-sm">Nenhuma foto disponível no Google</p>
      </div>
    );
  }

  const slug = slugify(leadName);

  // ── Gallery ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Download all button */}
      <button
        onClick={handleDownloadAll}
        disabled={downloadingAll}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border-2 border-dashed border-gray-300 text-sm font-medium text-gray-600 hover:border-green-500 hover:text-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-3"
      >
        {downloadingAll ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Baixando fotos...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Baixar todas as fotos ({photos.length})
          </>
        )}
      </button>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo, i) => (
          <div key={photo.ref} className="relative group aspect-square rounded-xl overflow-hidden bg-gray-100">
            {/* Photo */}
            <button
              onClick={() => setLightbox({ url: photo.url, index: i })}
              className="w-full h-full focus:outline-none"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={`${leadName} — foto ${i + 1}`}
                className="w-full h-full object-cover group-hover:brightness-75 transition-all"
                loading="lazy"
              />
            </button>

            {/* Individual download button — appears on hover */}
            <a
              href={downloadUrl(photo.url, `${slug}-foto-${i + 1}.jpg`)}
              download
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 hover:bg-black/80 text-white rounded-lg p-1.5"
              title={`Baixar foto ${i + 1}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
            </a>

            {/* Photo number badge */}
            <span className="absolute top-1 left-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded-md leading-none">
              {i + 1}
            </span>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400 mt-1">
        {photos.length} foto{photos.length !== 1 ? 's' : ''} · passe o mouse para baixar individualmente
      </p>

      {/* ── Lightbox ── */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          {/* Nav: previous */}
          {lightbox.index > 0 && (
            <button
              className="absolute left-4 text-white/70 hover:text-white p-2"
              onClick={(e) => { e.stopPropagation(); setLightbox({ url: photos[lightbox.index - 1].url, index: lightbox.index - 1 }); }}
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
          )}

          <div className="flex flex-col items-center gap-3 max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox.url}
              alt={`${leadName} — foto ${lightbox.index + 1}`}
              className="max-h-[75vh] w-full rounded-xl object-contain shadow-2xl"
            />
            <div className="flex items-center gap-3">
              <span className="text-white/60 text-sm">
                {lightbox.index + 1} / {photos.length}
              </span>
              <a
                href={downloadUrl(lightbox.url, `${slug}-foto-${lightbox.index + 1}.jpg`)}
                download
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Baixar esta foto
              </a>
              <button onClick={() => setLightbox(null)} className="text-white/60 hover:text-white text-sm">
                Fechar
              </button>
            </div>
          </div>

          {/* Nav: next */}
          {lightbox.index < photos.length - 1 && (
            <button
              className="absolute right-4 text-white/70 hover:text-white p-2"
              onClick={(e) => { e.stopPropagation(); setLightbox({ url: photos[lightbox.index + 1].url, index: lightbox.index + 1 }); }}
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          )}
        </div>
      )}
    </>
  );
}
