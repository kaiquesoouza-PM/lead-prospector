'use client';

import { useState, useEffect } from 'react';

interface Photo {
  ref: string;
  url: string;
}

interface PhotoGalleryProps {
  photoRefs: string[];
}

export default function PhotoGallery({ photoRefs }: PhotoGalleryProps) {
  const [photos,     setPhotos]     = useState<Photo[]>([]);
  const [isLoading,  setIsLoading]  = useState(false);
  const [lightbox,   setLightbox]   = useState<string | null>(null);

  useEffect(() => {
    if (photoRefs.length === 0) {
      setPhotos([]);
      return;
    }

    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setPhotos([]);

      const res  = await fetch('/api/photos', {
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

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: Math.min(photoRefs.length, 6) }).map((_, i) => (
          <div
            key={i}
            className="aspect-square rounded-xl bg-gray-100 animate-pulse"
          />
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

  // ── Gallery grid ────────────────────────────────────────────────────────────
  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo, i) => (
          <button
            key={photo.ref}
            onClick={() => setLightbox(photo.url)}
            className="aspect-square rounded-xl overflow-hidden bg-gray-100 hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt={`Foto ${i + 1}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-400 mt-1">
        {photos.length} foto{photos.length !== 1 ? 's' : ''} do Google · clique para ampliar
      </p>

      {/* ── Lightbox ── */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300"
            onClick={() => setLightbox(null)}
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="Foto ampliada"
            className="max-w-full max-h-full rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
