'use client';

import { useState, FormEvent } from 'react';
import type { PlaceType } from '../types';

interface SearchFormProps {
  onSearch: (params: {
    address: string;
    radius: number;
    types: PlaceType[];
    useGPS: boolean;
  }) => void;
  isLoading: boolean;
}

const PLACE_TYPE_LABELS: Record<PlaceType, string> = {
  restaurant:           'Restaurantes',
  bar:                  'Bares',
  bakery:               'Padarias',
  cafe:                 'Cafeterias',
  fast_food_restaurant: 'Fast Food',
  hamburger_restaurant: 'Hamburguerias',
  pizza_restaurant:     'Pizzarias',
  sandwich_shop:        'Lanchonetes',
  meal_takeaway:        'Para Viagem',
  ice_cream_shop:       'Sorveterias',
  juice_bar:            'Suqueiras',
  brunch_restaurant:    'Brunch',
};

const ALL_TYPES: PlaceType[] = [
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

const RADIUS_OPTIONS = [
  { label: '1 km',  value: 1_000 },
  { label: '2 km',  value: 2_000 },
  { label: '5 km',  value: 5_000 },
  { label: '10 km', value: 10_000 },
  { label: '20 km', value: 20_000 },
];

export default function SearchForm({ onSearch, isLoading }: SearchFormProps) {
  const [address, setAddress] = useState('');
  const [radius,  setRadius]  = useState(5_000);
  const [types,   setTypes]   = useState<PlaceType[]>([...ALL_TYPES]);
  const [useGPS,  setUseGPS]  = useState(false);

  const toggleType = (type: PlaceType) => {
    setTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!useGPS && !address.trim()) return;
    if (types.length === 0) return;
    onSearch({ address: address.trim(), radius, types, useGPS });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[#111111] border border-white/[0.06] rounded-2xl p-6 space-y-5"
    >
      <h2 className="text-lg font-semibold text-white tracking-tight">Configurar Busca</h2>

      {/* Location */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-400">
          Localização
        </label>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setUseGPS((v) => !v)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
              useGPS
                ? 'bg-red-600 text-white border-red-600 shadow-lg shadow-red-900/30'
                : 'bg-[#1a1a1a] text-gray-400 border-white/[0.08] hover:border-red-600/50 hover:text-white'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4a8 8 0 100 16A8 8 0 0012 4zm0 0v2m0 12v2M4 12H2m20 0h-2" />
            </svg>
            Usar GPS
          </button>

          <span className="text-xs text-gray-600">ou</span>

          <input
            type="text"
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              if (e.target.value) setUseGPS(false);
            }}
            disabled={useGPS}
            placeholder="Ex: Av. Paulista, São Paulo, SP"
            className="flex-1 bg-[#1a1a1a] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-red-600/50 focus:border-red-600/50 disabled:opacity-40 transition-colors"
          />
        </div>
      </div>

      {/* Radius */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-400">
          Raio de Busca
        </label>
        <div className="flex flex-wrap gap-2">
          {RADIUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setRadius(opt.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                radius === opt.value
                  ? 'bg-red-600 text-white border-red-600 shadow-sm shadow-red-900/30'
                  : 'bg-[#1a1a1a] text-gray-400 border-white/[0.08] hover:border-red-600/40 hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Types */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-400">
          Tipos de Estabelecimento
        </label>
        <div className="flex flex-wrap gap-2">
          {ALL_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => toggleType(type)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                types.includes(type)
                  ? 'bg-red-600 text-white border-red-600 shadow-sm shadow-red-900/30'
                  : 'bg-[#1a1a1a] text-gray-400 border-white/[0.08] hover:border-red-600/40 hover:text-white'
              }`}
            >
              {PLACE_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading || (!useGPS && !address.trim()) || types.length === 0}
        className="w-full py-2.5 bg-red-600 hover:bg-red-500 disabled:bg-[#1a1a1a] disabled:text-gray-600 disabled:border disabled:border-white/[0.06] text-white font-semibold rounded-xl transition-all text-sm shadow-lg shadow-red-900/20 hover:shadow-red-900/30"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Buscando...
          </span>
        ) : (
          'Buscar Leads'
        )}
      </button>
    </form>
  );
}
