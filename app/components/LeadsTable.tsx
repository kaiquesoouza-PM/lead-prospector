'use client';

import { useState } from 'react';
import type { Lead, LeadFlag, LeadProfile } from '../types';
import { PROFILE_MAP } from '../types';

interface LeadsTableProps {
  leads: Lead[];
  onSelectLead?: (lead: Lead) => void;
  selectedLeadId?: string;
}

type SortKey = 'leadScore' | 'rating' | 'userRatingCount' | 'photoCount' | 'name';
type SortDir = 'asc' | 'desc';

const FLAG_LABELS: Record<LeadFlag, { label: string; color: string }> = {
  'no-website':         { label: 'Sem Website',       color: 'bg-red-100 text-red-700' },
  'few-reviews':        { label: 'Poucas Avaliações',  color: 'bg-yellow-100 text-yellow-700' },
  'few-photos':         { label: 'Poucas Fotos',       color: 'bg-orange-100 text-orange-700' },
  'zero-reviews':       { label: 'Sem Avaliações',     color: 'bg-gray-100 text-gray-500' },
  'too-popular':        { label: '+5k Avaliações',     color: 'bg-purple-100 text-purple-700' },
  'possible-delivery':  { label: 'Possível Delivery',  color: 'bg-blue-100 text-blue-700' },
};

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 70
      ? 'bg-green-100 text-green-800'
      : score >= 40
      ? 'bg-yellow-100 text-yellow-800'
      : 'bg-gray-100 text-gray-600';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
      {score}
    </span>
  );
}

function StarRating({ rating }: { rating?: number }) {
  if (!rating) return <span className="text-gray-400 text-xs">—</span>;
  return (
    <span className="flex items-center gap-1 text-sm">
      <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
      {rating.toFixed(1)}
    </span>
  );
}

export default function LeadsTable({ leads, onSelectLead, selectedLeadId }: LeadsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('leadScore');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filter,        setFilter]       = useState<'all' | 'no-website'>('all');
  const [profileFilter, setProfileFilter] = useState<LeadProfile | 'all'>('all');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sorted = [...leads]
    .filter((l) => filter === 'all' || !l.hasWebsite)
    .filter((l) => profileFilter === 'all' || l.profile === profileFilter)
    .sort((a, b) => {
      let av: number | string = a[sortKey] ?? 0;
      let bv: number | string = b[sortKey] ?? 0;
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  const SortIcon = ({ k }: { k: SortKey }) => (
    <span className="ml-1 opacity-50">
      {sortKey === k ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  );

  if (leads.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-md p-10 text-center text-gray-400">
        <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z" />
        </svg>
        <p className="font-medium">Nenhum lead encontrado.</p>
        <p className="text-sm mt-1">Realize uma busca para começar.</p>
      </div>
    );
  }

  const noWebsiteCount = leads.filter((l) => !l.hasWebsite).length;

  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-gray-800">
            {sorted.length} resultado{sorted.length !== 1 ? 's' : ''}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {noWebsiteCount} sem website · ordenado por score de lead
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Website filter */}
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              filter === 'all'
                ? 'bg-green-600 text-white border-green-600'
                : 'text-gray-600 border-gray-300 hover:border-green-500'
            }`}
          >
            Todos ({leads.length})
          </button>
          <button
            onClick={() => setFilter('no-website')}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              filter === 'no-website'
                ? 'bg-red-600 text-white border-red-600'
                : 'text-gray-600 border-gray-300 hover:border-red-400'
            }`}
          >
            Sem Website ({noWebsiteCount})
          </button>

          {/* Profile filter */}
          <div className="w-px bg-gray-200 mx-1" />
          {(['all', 'consolidated', 'growing', 'low-visibility'] as const).map((p) => {
            const info  = p !== 'all' ? PROFILE_MAP[p] : null;
            const count = p === 'all' ? leads.length : leads.filter((l) => l.profile === p).length;
            const active = profileFilter === p;
            return (
              <button
                key={p}
                onClick={() => setProfileFilter(p)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  active
                    ? 'bg-gray-800 text-white border-gray-800'
                    : 'text-gray-600 border-gray-300 hover:border-gray-500'
                }`}
              >
                {p === 'all' ? `Todos perfis` : info!.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3 text-left cursor-pointer hover:text-gray-800" onClick={() => handleSort('name')}>
                Nome <SortIcon k="name" />
              </th>
              <th className="px-4 py-3 text-left">Telefone</th>
              <th className="px-4 py-3 text-left">Endereço</th>
              <th className="px-4 py-3 text-center cursor-pointer hover:text-gray-800" onClick={() => handleSort('rating')}>
                Nota <SortIcon k="rating" />
              </th>
              <th className="px-4 py-3 text-center cursor-pointer hover:text-gray-800" onClick={() => handleSort('userRatingCount')}>
                Aval. <SortIcon k="userRatingCount" />
              </th>
              <th className="px-4 py-3 text-center cursor-pointer hover:text-gray-800" onClick={() => handleSort('photoCount')}>
                Fotos <SortIcon k="photoCount" />
              </th>
              <th className="px-4 py-3 text-left">Perfil</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-center cursor-pointer hover:text-gray-800" onClick={() => handleSort('leadScore')}>
                Score <SortIcon k="leadScore" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sorted.map((lead) => (
              <tr
                key={lead.id}
                onClick={() => onSelectLead?.(lead)}
                className={`cursor-pointer transition-colors hover:bg-green-50 ${
                  selectedLeadId === lead.id ? 'bg-green-50 border-l-4 border-l-green-500' : ''
                }`}
              >
                {/* Name */}
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-800 max-w-[180px] truncate" title={lead.name}>
                    {lead.name}
                  </div>
                  {lead.googleMapsUri && (
                    <a
                      href={lead.googleMapsUri}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-blue-500 hover:underline"
                    >
                      Ver no Maps
                    </a>
                  )}
                </td>

                {/* Phone */}
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                  {lead.phone ? (
                    <a
                      href={`tel:${lead.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="hover:text-green-700"
                    >
                      {lead.phone}
                    </a>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>

                {/* Address */}
                <td className="px-4 py-3 text-gray-500 max-w-[200px]">
                  <span className="truncate block" title={lead.address}>
                    {lead.address}
                  </span>
                </td>

                {/* Rating */}
                <td className="px-4 py-3 text-center">
                  <StarRating rating={lead.rating} />
                </td>

                {/* Reviews */}
                <td className="px-4 py-3 text-center text-gray-600">
                  {lead.userRatingCount > 0 ? lead.userRatingCount.toLocaleString('pt-BR') : '—'}
                </td>

                {/* Photos */}
                <td className="px-4 py-3 text-center text-gray-600">
                  {lead.photoCount > 0 ? lead.photoCount : '—'}
                </td>

                {/* Profile */}
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PROFILE_MAP[lead.profile].color}`}>
                    {PROFILE_MAP[lead.profile].label}
                  </span>
                </td>

                {/* Flags */}
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1 items-start">
                    {lead.flags.map((flag) => (
                      <span
                        key={flag}
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${FLAG_LABELS[flag].color}`}
                      >
                        {FLAG_LABELS[flag].label}
                      </span>
                    ))}
                    {lead.flags.length === 0 && (
                      <span className="text-gray-300 text-xs">OK</span>
                    )}
                  </div>
                </td>

                {/* Score */}
                <td className="px-4 py-3 text-center">
                  <ScoreBadge score={lead.leadScore} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
