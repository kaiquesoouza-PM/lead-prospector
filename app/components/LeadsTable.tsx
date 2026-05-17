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
  'no-website':         { label: 'Sem Website',       color: 'bg-red-950/60 text-red-400 border border-red-800/40' },
  'few-reviews':        { label: 'Poucas Avaliações',  color: 'bg-yellow-950/60 text-yellow-400 border border-yellow-800/40' },
  'few-photos':         { label: 'Poucas Fotos',       color: 'bg-orange-950/60 text-orange-400 border border-orange-800/40' },
  'zero-reviews':       { label: 'Sem Avaliações',     color: 'bg-white/5 text-gray-500 border border-white/10' },
  'too-popular':        { label: '+5k Avaliações',     color: 'bg-purple-950/60 text-purple-400 border border-purple-800/40' },
  'possible-delivery':  { label: 'Possível Delivery',  color: 'bg-blue-950/60 text-blue-400 border border-blue-800/40' },
};

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 70
      ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
      : score >= 40
      ? 'bg-yellow-950/60 text-yellow-400 border border-yellow-800/40'
      : 'bg-white/5 text-gray-500 border border-white/10';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
      {score}
    </span>
  );
}

function StarRating({ rating }: { rating?: number }) {
  if (!rating) return <span className="text-gray-600 text-xs">—</span>;
  return (
    <span className="flex items-center gap-1 text-sm">
      <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
      <span className="text-white">{rating.toFixed(1)}</span>
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
    <span className="ml-1 opacity-40">
      {sortKey === k ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  );

  if (leads.length === 0) {
    return (
      <div className="bg-[#111111] border border-white/[0.06] rounded-2xl p-10 text-center text-gray-600">
        <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z" />
        </svg>
        <p className="font-medium text-gray-500">Nenhum lead encontrado.</p>
        <p className="text-sm mt-1">Realize uma busca para começar.</p>
      </div>
    );
  }

  const noWebsiteCount = leads.filter((l) => !l.hasWebsite).length;

  return (
    <div className="bg-[#111111] border border-white/[0.06] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-white">
            {sorted.length} resultado{sorted.length !== 1 ? 's' : ''}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {noWebsiteCount} sem website · ordenado por score de lead
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Website filter */}
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
              filter === 'all'
                ? 'bg-white text-gray-900 border-white'
                : 'text-gray-500 border-white/[0.08] hover:border-white/30 hover:text-white'
            }`}
          >
            Todos ({leads.length})
          </button>
          <button
            onClick={() => setFilter('no-website')}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
              filter === 'no-website'
                ? 'bg-red-600 text-white border-red-600'
                : 'text-gray-500 border-white/[0.08] hover:border-red-500/40 hover:text-red-400'
            }`}
          >
            Sem Website ({noWebsiteCount})
          </button>

          {/* Profile filter */}
          <div className="w-px bg-white/10 mx-1" />
          {(['all', 'consolidated', 'growing', 'low-visibility'] as const).map((p) => {
            const info  = p !== 'all' ? PROFILE_MAP[p] : null;
            const count = p === 'all' ? leads.length : leads.filter((l) => l.profile === p).length;
            const active = profileFilter === p;
            return (
              <button
                key={p}
                onClick={() => setProfileFilter(p)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                  active
                    ? 'bg-white/10 text-white border-white/20'
                    : 'text-gray-500 border-white/[0.08] hover:border-white/20 hover:text-gray-300'
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
          <thead className="border-b border-white/[0.06] text-xs text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3 text-left cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('name')}>
                Nome <SortIcon k="name" />
              </th>
              <th className="px-4 py-3 text-left">Telefone</th>
              <th className="px-4 py-3 text-left">Endereço</th>
              <th className="px-4 py-3 text-center cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('rating')}>
                Nota <SortIcon k="rating" />
              </th>
              <th className="px-4 py-3 text-center cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('userRatingCount')}>
                Aval. <SortIcon k="userRatingCount" />
              </th>
              <th className="px-4 py-3 text-center cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('photoCount')}>
                Fotos <SortIcon k="photoCount" />
              </th>
              <th className="px-4 py-3 text-left">Perfil</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-center cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('leadScore')}>
                Score <SortIcon k="leadScore" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {sorted.map((lead) => (
              <tr
                key={lead.id}
                onClick={() => onSelectLead?.(lead)}
                className={`cursor-pointer transition-colors hover:bg-white/[0.03] ${
                  selectedLeadId === lead.id ? 'bg-red-950/20 border-l-2 border-l-red-600' : ''
                }`}
              >
                {/* Name */}
                <td className="px-4 py-3">
                  <div className="font-medium text-white max-w-[180px] truncate" title={lead.name}>
                    {lead.name}
                  </div>
                  {lead.googleMapsUri && (
                    <a
                      href={lead.googleMapsUri}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-blue-500 hover:text-blue-400 hover:underline transition-colors"
                    >
                      Ver no Maps
                    </a>
                  )}
                </td>

                {/* Phone */}
                <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                  {lead.phone ? (
                    <a
                      href={`tel:${lead.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="hover:text-white transition-colors"
                    >
                      {lead.phone}
                    </a>
                  ) : (
                    <span className="text-gray-700">—</span>
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
                <td className="px-4 py-3 text-center text-gray-400">
                  {lead.userRatingCount > 0 ? lead.userRatingCount.toLocaleString('pt-BR') : <span className="text-gray-700">—</span>}
                </td>

                {/* Photos */}
                <td className="px-4 py-3 text-center text-gray-400">
                  {lead.photoCount > 0 ? lead.photoCount : <span className="text-gray-700">—</span>}
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
                      <span className="text-gray-600 text-xs">OK</span>
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
