'use client';

import { useState, useEffect, useCallback } from 'react';
import { PIPELINE_STAGES, type TrackedLead, type PipelineStage, type StageInfo } from '../types/crm';
import { PROFILE_MAP } from '../types';
import {
  getTrackedLeads,
  updateTrackedLead,
  removeTrackedLead,
  exportCRMtoCSV,
} from '../lib/crmStorage';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  restaurant: 'Restaurante', bar: 'Bar', bakery: 'Padaria', cafe: 'Cafeteria',
  fast_food_restaurant: 'Fast Food', hamburger_restaurant: 'Hamburgueria',
  pizza_restaurant: 'Pizzaria', sandwich_shop: 'Lanchonete',
  meal_takeaway: 'Para Viagem', ice_cream_shop: 'Sorveteria',
  juice_bar: 'Suqueria', brunch_restaurant: 'Brunch',
};

function stageInfo(key: PipelineStage): StageInfo {
  return PIPELINE_STAGES.find((s) => s.key === key)!;
}

function fmtCurrency(v?: number) {
  if (v === undefined) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ─── Pipeline Mini-bar ───────────────────────────────────────────────────────

function PipelineBar({
  current,
  onChange,
}: {
  current: PipelineStage;
  onChange: (s: PipelineStage) => void;
}) {
  const active = PIPELINE_STAGES.filter((s) => s.key !== 'declined');
  const isDeclined = current === 'declined';

  return (
    <div className="space-y-2">
      <div className="flex gap-1 flex-wrap">
        {active.map((stage, i) => {
          const currentIdx = active.findIndex((s) => s.key === current);
          const isPast   = i < currentIdx && !isDeclined;
          const isActive = stage.key === current;

          return (
            <button
              key={stage.key}
              onClick={() => onChange(stage.key)}
              title={stage.label}
              className={`flex-1 min-w-0 py-1.5 px-1 rounded-lg text-xs font-medium border transition-all text-center truncate ${
                isActive
                  ? `${stage.bg} ${stage.color} ${stage.border} border-2`
                  : isPast
                  ? 'bg-green-50 text-green-600 border-green-200 border'
                  : 'bg-gray-50 text-gray-400 border-gray-200 border hover:border-gray-400'
              }`}
            >
              {i + 1}. {stage.label}
            </button>
          );
        })}
      </div>
      <button
        onClick={() => onChange(current === 'declined' ? 'captured' : 'declined')}
        className={`text-xs px-3 py-1 rounded-full border transition-colors ${
          isDeclined
            ? 'bg-red-100 text-red-700 border-red-300'
            : 'text-gray-400 border-gray-200 hover:border-red-300 hover:text-red-500'
        }`}
      >
        {isDeclined ? 'Declinado ✕ — clique para reativar' : 'Marcar como Declinado'}
      </button>
    </div>
  );
}

// ─── Lead Card ────────────────────────────────────────────────────────────────

function LeadCrmCard({
  lead,
  onUpdate,
  onRemove,
}: {
  lead:     TrackedLead;
  onUpdate: (id: string, updates: Partial<TrackedLead>) => void;
  onRemove: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState({
    phone:            lead.phone,
    alternativePhone: lead.alternativePhone,
    email:            lead.email,
    notes:            lead.notes,
    price:            lead.price?.toString() ?? '',
  });
  const [saved, setSaved] = useState(false);

  const profile = PROFILE_MAP[lead.profile];
  const stage   = stageInfo(lead.stage);
  const type    = lead.primaryType ? (TYPE_LABELS[lead.primaryType] ?? lead.primaryType) : '';

  const handleSave = () => {
    onUpdate(lead.id, {
      phone:            form.phone,
      alternativePhone: form.alternativePhone,
      email:            form.email,
      notes:            form.notes,
      price:            form.price ? parseFloat(form.price.replace(',', '.')) : undefined,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className={`bg-white rounded-2xl shadow-sm border transition-all ${
      lead.stage === 'declined' ? 'opacity-60 border-red-100' : 'border-gray-100'
    }`}>
      {/* ── Card Header ── */}
      <button
        className="w-full px-5 py-4 flex items-start gap-3 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Stage dot */}
        <span className={`mt-1 w-3 h-3 rounded-full flex-shrink-0 ${stage.bg} border-2 ${stage.border}`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 truncate">{lead.name}</span>
            {type && <span className="text-xs text-gray-400">{type}</span>}
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${profile.color}`}>
              {profile.label}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
            <span className={`font-medium ${stage.color}`}>{stage.label}</span>
            {lead.price !== undefined && (
              <span className="text-green-700 font-semibold">{fmtCurrency(lead.price)}</span>
            )}
            {lead.phone && <span>{lead.phone}</span>}
          </div>
        </div>

        <svg
          className={`w-4 h-4 text-gray-400 flex-shrink-0 mt-1 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* ── Expanded Content ── */}
      {expanded && (
        <div className="px-5 pb-5 space-y-5 border-t border-gray-50 pt-4">

          {/* Pipeline */}
          <PipelineBar
            current={lead.stage}
            onChange={(s) => onUpdate(lead.id, { stage: s })}
          />

          {/* Contact fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Telefone principal</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="(11) 99999-9999"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Telefone alternativo</label>
              <input
                type="text"
                value={form.alternativePhone}
                onChange={(e) => setForm((f) => ({ ...f, alternativePhone: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="(11) 99999-9999"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">E-mail</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="contato@estabelecimento.com"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Valor cobrado (R$)</label>
              <input
                type="text"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="1500,00"
              />
            </div>
          </div>

          {/* Address + Maps */}
          <div className="text-xs text-gray-500 flex items-start gap-2">
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            <span>{lead.address}</span>
            {lead.googleMapsUri && (
              <a href={lead.googleMapsUri} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline whitespace-nowrap">
                Ver Maps
              </a>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Anotações</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              placeholder="Observações, próximos passos, histórico de contato..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => {
                if (confirm(`Remover "${lead.name}" do acompanhamento?`)) onRemove(lead.id);
              }}
              className="text-xs text-red-400 hover:text-red-600 transition-colors"
            >
              Remover do acompanhamento
            </button>

            <div className="flex items-center gap-2">
              <span className={`text-xs transition-opacity ${saved ? 'opacity-100 text-green-600' : 'opacity-0'}`}>
                Salvo!
              </span>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                Salvar
              </button>
            </div>
          </div>

          {/* Meta */}
          <p className="text-xs text-gray-300">
            Capturado em {new Date(lead.capturedAt).toLocaleDateString('pt-BR')} ·
            Atualizado em {new Date(lead.updatedAt).toLocaleDateString('pt-BR')}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── CRM Tab ──────────────────────────────────────────────────────────────────

export default function CrmTab() {
  const [leads,       setLeads]       = useState<TrackedLead[]>([]);
  const [stageFilter, setStageFilter] = useState<PipelineStage | 'all'>('all');
  const [mounted,     setMounted]     = useState(false);

  useEffect(() => {
    setMounted(true);
    setLeads(getTrackedLeads());
  }, []);

  // Sync from localStorage whenever tab becomes visible
  useEffect(() => {
    const onFocus = () => setLeads(getTrackedLeads());
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const handleUpdate = useCallback((id: string, updates: Partial<TrackedLead>) => {
    updateTrackedLead(id, updates);
    setLeads(getTrackedLeads());
  }, []);

  const handleRemove = useCallback((id: string) => {
    removeTrackedLead(id);
    setLeads(getTrackedLeads());
  }, []);

  if (!mounted) return null;

  const filtered = stageFilter === 'all' ? leads : leads.filter((l) => l.stage === stageFilter);

  // Financial summary
  const sold       = leads.filter((l) => l.stage === 'sold');
  const totalEarned = sold.reduce((acc, l) => acc + (l.price ?? 0), 0);
  const pendingRevenue = leads
    .filter((l) => l.stage === 'negotiating' && l.price)
    .reduce((acc, l) => acc + (l.price ?? 0), 0);

  // Stage counts
  const stageCounts = PIPELINE_STAGES.reduce<Record<string, number>>((acc, s) => {
    acc[s.key] = leads.filter((l) => l.stage === s.key).length;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Acompanhamento de Leads</h2>
          <p className="text-sm text-gray-400">
            {leads.length} lead{leads.length !== 1 ? 's' : ''} capturado{leads.length !== 1 ? 's' : ''} · apenas estabelecimentos sem website
          </p>
        </div>
        {leads.length > 0 && (
          <button
            onClick={() => exportCRMtoCSV(leads)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4 text-green-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            Exportar CSV
          </button>
        )}
      </div>

      {/* ── Financial Summary ── */}
      {leads.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Total em Leads</p>
            <p className="text-2xl font-bold text-gray-800">{leads.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Vendas Concluídas</p>
            <p className="text-2xl font-bold text-green-700">{sold.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Receita Gerada</p>
            <p className="text-2xl font-bold text-green-700">
              {totalEarned > 0 ? totalEarned.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Em Negociação</p>
            <p className="text-2xl font-bold text-orange-600">
              {pendingRevenue > 0 ? pendingRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : `${stageCounts['negotiating']} lead${stageCounts['negotiating'] !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
      )}

      {/* ── Pipeline Filter ── */}
      {leads.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStageFilter('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              stageFilter === 'all'
                ? 'bg-gray-800 text-white border-gray-800'
                : 'text-gray-600 border-gray-300 hover:border-gray-500'
            }`}
          >
            Todos ({leads.length})
          </button>
          {PIPELINE_STAGES.map((stage) => {
            const count = stageCounts[stage.key] ?? 0;
            if (count === 0) return null;
            return (
              <button
                key={stage.key}
                onClick={() => setStageFilter(stage.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  stageFilter === stage.key
                    ? `${stage.bg} ${stage.color} ${stage.border} border`
                    : 'text-gray-600 border-gray-300 hover:border-gray-500'
                }`}
              >
                {stage.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* ── Lead List ── */}
      {leads.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-14 text-center text-gray-400">
          <svg className="w-14 h-14 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
          </svg>
          <p className="font-medium text-gray-500">Nenhum lead capturado ainda.</p>
          <p className="text-sm mt-1">
            Na aba <strong>Busca</strong>, clique em um lead sem website e use o botão <strong>"Capturar Lead"</strong>.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-gray-400 py-10">Nenhum lead nesta etapa.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((lead) => (
            <LeadCrmCard
              key={lead.id}
              lead={lead}
              onUpdate={handleUpdate}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
}
