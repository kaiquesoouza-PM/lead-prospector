'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import SearchForm from './components/SearchForm';
import LeadsTable from './components/LeadsTable';
import ExportButtons from './components/ExportButtons';
import type { Lead, PlaceType } from './types';

// MapView uses browser-only APIs — load it client-side only
const MapView = dynamic(() => import('./components/MapView'), { ssr: false });

// ─── State ───────────────────────────────────────────────────────────────────

interface AppState {
  leads:          Lead[];
  isLoading:      boolean;
  error:          string | null;
  center:         { lat: number; lng: number } | null;
  radius:         number;
  selectedLeadId: string | undefined;
}

const initialState: AppState = {
  leads:          [],
  isLoading:      false,
  error:          null,
  center:         null,
  radius:         5_000,
  selectedLeadId: undefined,
};

// ─── Stats card ──────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col gap-1">
      <span className="text-xs text-gray-400 uppercase tracking-wide">{label}</span>
      <span className="text-2xl font-bold text-gray-800">{value}</span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [state, setState] = useState<AppState>(initialState);

  // Geocode address → lat/lng (or use GPS coords directly)
  const resolveCoords = useCallback(
    async (address: string, useGPS: boolean): Promise<{ lat: number; lng: number }> => {
      if (useGPS) {
        return new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => reject(new Error('Não foi possível obter localização GPS. Verifique as permissões.'))
          );
        });
      }

      const res  = await fetch('/api/geocode', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ address }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? 'Erro ao geocodificar endereço.');
      return { lat: data.lat, lng: data.lng };
    },
    []
  );

  // Main search handler
  const handleSearch = useCallback(
    async ({
      address,
      radius,
      types,
      useGPS,
    }: {
      address: string;
      radius:  number;
      types:   PlaceType[];
      useGPS:  boolean;
    }) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null, leads: [], selectedLeadId: undefined }));

      try {
        const coords = await resolveCoords(address, useGPS);

        const res  = await fetch('/api/places', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ lat: coords.lat, lng: coords.lng, radius, types }),
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error ?? 'Erro ao buscar estabelecimentos.');

        setState((prev) => ({
          ...prev,
          isLoading: false,
          leads:     data.leads as Lead[],
          center:    coords,
          radius,
        }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error:     err instanceof Error ? err.message : 'Erro desconhecido.',
        }));
      }
    },
    [resolveCoords]
  );

  const { leads, isLoading, error, center, radius, selectedLeadId } = state;

  const noWebsiteLeads  = leads.filter((l) => !l.hasWebsite);
  const avgScore        = leads.length
    ? Math.round(leads.reduce((s, l) => s + l.leadScore, 0) / leads.length)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-green-600 text-white rounded-xl p-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 leading-tight">Lead Prospector</h1>
              <p className="text-xs text-gray-400">Estabelecimentos sem presença digital</p>
            </div>
          </div>

          {leads.length > 0 && (
            <ExportButtons leads={leads} disabled={isLoading} />
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Search form */}
        <SearchForm onSearch={handleSearch} isLoading={isLoading} />

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 text-sm flex items-start gap-3">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Stats row */}
        {leads.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Total Encontrado"    value={leads.length}           sub="estabelecimentos" />
            <StatCard label="Sem Website"         value={noWebsiteLeads.length}  sub={`${Math.round((noWebsiteLeads.length / leads.length) * 100)}% do total`} />
            <StatCard label="Score Médio"         value={`${avgScore}/100`}      sub="oportunidade de prospecção" />
            <StatCard label="Poucas Avaliações"   value={leads.filter((l) => l.hasFewReviews).length} sub="menos de 50 reviews" />
          </div>
        )}

        {/* Map */}
        {center && leads.length > 0 && (
          <MapView
            center={center}
            radius={radius}
            leads={leads}
            selectedLeadId={selectedLeadId}
            onSelectLead={(lead) =>
              setState((prev) => ({
                ...prev,
                selectedLeadId: prev.selectedLeadId === lead.id ? undefined : lead.id,
              }))
            }
          />
        )}

        {/* Table */}
        <LeadsTable
          leads={leads}
          selectedLeadId={selectedLeadId}
          onSelectLead={(lead) =>
            setState((prev) => ({
              ...prev,
              selectedLeadId: prev.selectedLeadId === lead.id ? undefined : lead.id,
            }))
          }
        />

        {/* Loading skeleton */}
        {isLoading && (
          <div className="bg-white rounded-2xl shadow-md p-10 flex flex-col items-center gap-4 text-gray-400">
            <svg className="w-8 h-8 animate-spin text-green-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <p className="text-sm">Consultando Google Places API…</p>
          </div>
        )}
      </main>

      <footer className="max-w-7xl mx-auto px-4 py-6 text-xs text-gray-400 text-center">
        Lead Prospector MVP · Dados fornecidos pela{' '}
        <a
          href="https://developers.google.com/maps/documentation/places/web-service/overview"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-gray-600"
        >
          Google Places API (New)
        </a>
      </footer>
    </div>
  );
}
