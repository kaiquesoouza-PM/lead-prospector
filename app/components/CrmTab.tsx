'use client';

import { useState, useEffect, useCallback } from 'react';
import { PIPELINE_STAGES, type TrackedLead, type PipelineStage } from '../types/crm';
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

function fmtCurrency(v?: number) {
  if (v === undefined) return null;
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Extrai o bairro de um endereço brasileiro: "Rua X, 123 - Bairro, Cidade - UF" */
function extractNeighborhood(address: string): string {
  const dashParts = address.split(' - ');
  if (dashParts.length >= 2) {
    const candidate = dashParts[1].split(',')[0].trim();
    if (candidate.length > 0 && candidate.length < 45) return candidate;
  }
  const commaParts = address.split(',');
  if (commaParts.length >= 2) {
    return commaParts[1].trim().split(',')[0].trim();
  }
  return '';
}

function scoreColor(score: number) {
  if (score >= 70) return 'bg-green-100 text-green-800';
  if (score >= 40) return 'bg-amber-100 text-amber-800';
  return 'bg-gray-100 text-gray-500';
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditModal({
  lead,
  onSave,
  onClose,
  onRemove,
}: {
  lead:     TrackedLead;
  onSave:   (id: string, updates: Partial<TrackedLead>) => void;
  onClose:  () => void;
  onRemove: (id: string) => void;
}) {
  const [form, setForm] = useState({
    phone:            lead.phone,
    alternativePhone: lead.alternativePhone,
    email:            lead.email,
    notes:            lead.notes,
    price:            lead.price?.toString() ?? '',
    siteUrl:          lead.siteUrl ?? '',
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSave(lead.id, {
      phone:            form.phone,
      alternativePhone: form.alternativePhone,
      email:            form.email,
      notes:            form.notes,
      siteUrl:          form.siteUrl || undefined,
      price:            form.price ? parseFloat(form.price.replace(',', '.')) : undefined,
    });
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 1000);
  };

  const type = lead.primaryType ? (TYPE_LABELS[lead.primaryType] ?? lead.primaryType) : '';
  const bairro = extractNeighborhood(lead.address);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-gray-900">{lead.name}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{type}{bairro ? ` · ${bairro}` : ''}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Stage selector */}
        <div className="px-5 pt-4">
          <p className="text-xs text-gray-500 mb-2">Etapa do pipeline</p>
          <div className="flex flex-wrap gap-1.5">
            {PIPELINE_STAGES.map((s) => (
              <button
                key={s.key}
                onClick={() => onSave(lead.id, { stage: s.key })}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                  lead.stage === s.key
                    ? `${s.bg} ${s.color} ${s.border} border-2`
                    : 'bg-gray-50 text-gray-400 border-gray-200 hover:border-gray-400'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Fields */}
        <div className="px-5 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Telefone principal</label>
              <input type="text" value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="(11) 99999-9999" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tel. alternativo</label>
              <input type="text" value={form.alternativePhone}
                onChange={(e) => setForm((f) => ({ ...f, alternativePhone: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="(11) 99999-9999" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">E-mail</label>
            <input type="email" value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="contato@restaurante.com" />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Valor cobrado (R$)</label>
            <input type="text" value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="1500,00" />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">URL do site criado</label>
            <input type="url" value={form.siteUrl}
              onChange={(e) => setForm((f) => ({ ...f, siteUrl: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="https://restaurante.com.br" />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Anotações</label>
            <textarea value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              placeholder="Observações, próximos passos..." />
          </div>

          {lead.googleMapsUri && (
            <a href={lead.googleMapsUri} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-blue-500 hover:underline">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              Ver no Google Maps
            </a>
          )}
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex items-center justify-between gap-3">
          <button
            onClick={() => { if (confirm(`Remover "${lead.name}"?`)) { onRemove(lead.id); onClose(); } }}
            className="text-xs text-red-400 hover:text-red-600 transition-colors"
          >
            Remover
          </button>
          <button onClick={handleSave}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-colors ${
              saved ? 'bg-green-100 text-green-700' : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {saved ? 'Salvo! ✓' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Kanban Card ──────────────────────────────────────────────────────────────

function KanbanCard({
  lead,
  onClick,
}: {
  lead:    TrackedLead;
  onClick: () => void;
}) {
  const type   = lead.primaryType ? (TYPE_LABELS[lead.primaryType] ?? lead.primaryType) : '';
  const bairro = extractNeighborhood(lead.address);
  const price  = fmtCurrency(lead.price);

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 cursor-pointer hover:shadow-md hover:border-green-200 transition-all group"
    >
      {/* Name */}
      <p className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2 group-hover:text-green-700 transition-colors">
        {lead.name}
      </p>

      {/* Score + type */}
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreColor(lead.leadScore)}`}>
          {lead.leadScore}pts
        </span>
        {type && (
          <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{type}</span>
        )}
      </div>

      {/* Bairro */}
      {bairro && (
        <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
          <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          </svg>
          {bairro}
        </p>
      )}

      {/* Price */}
      {price && (
        <p className="text-xs font-semibold text-green-700 mt-1.5">{price}</p>
      )}

      {/* Site URL */}
      {lead.siteUrl && (
        <a
          href={lead.siteUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-xs text-blue-500 hover:underline mt-1.5 flex items-center gap-1 truncate"
        >
          <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          <span className="truncate">{lead.siteUrl.replace(/^https?:\/\//, '')}</span>
        </a>
      )}

      {/* Notes snippet */}
      {lead.notes && (
        <p className="text-xs text-gray-400 mt-1.5 line-clamp-1 italic">"{lead.notes}"</p>
      )}
    </div>
  );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

function KanbanColumn({
  stage,
  leads,
  onCardClick,
}: {
  stage:       { key: PipelineStage; label: string; color: string; bg: string; border: string };
  leads:       TrackedLead[];
  onCardClick: (lead: TrackedLead) => void;
}) {
  return (
    <div className="flex-shrink-0 w-56 flex flex-col gap-2">
      {/* Column header */}
      <div className={`rounded-xl px-3 py-2 flex items-center justify-between ${stage.bg}`}>
        <span className={`text-xs font-bold uppercase tracking-wide ${stage.color}`}>
          {stage.label}
        </span>
        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full bg-white/60 ${stage.color}`}>
          {leads.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 min-h-[100px]">
        {leads.map((lead) => (
          <KanbanCard key={lead.id} lead={lead} onClick={() => onCardClick(lead)} />
        ))}
        {leads.length === 0 && (
          <div className="border-2 border-dashed border-gray-100 rounded-xl h-16 flex items-center justify-center">
            <span className="text-xs text-gray-300">Vazio</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CRM Tab ──────────────────────────────────────────────────────────────────

export default function CrmTab() {
  const [leads,       setLeads]       = useState<TrackedLead[]>([]);
  const [mounted,     setMounted]     = useState(false);
  const [editingLead, setEditingLead] = useState<TrackedLead | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    setMounted(true);
    setLeads(getTrackedLeads());
  }, []);

  // Re-sync when window regains focus (user switched tabs)
  useEffect(() => {
    const onFocus = () => setLeads(getTrackedLeads());
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  // Re-sync on localStorage changes (other tabs)
  useEffect(() => {
    const onStorage = () => setLeads(getTrackedLeads());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const handleUpdate = useCallback((id: string, updates: Partial<TrackedLead>) => {
    updateTrackedLead(id, updates);
    const updated = getTrackedLeads();
    setLeads(updated);
    // Update editing lead if open
    setEditingLead((prev) => {
      if (!prev || prev.id !== id) return prev;
      const found = updated.find((l) => l.id === id);
      return found ?? prev;
    });
  }, []);

  const handleRemove = useCallback((id: string) => {
    removeTrackedLead(id);
    setLeads(getTrackedLeads());
  }, []);

  if (!mounted) return null;

  // Financial summary
  const sold           = leads.filter((l) => l.stage === 'sold');
  const totalEarned    = sold.reduce((acc, l) => acc + (l.price ?? 0), 0);
  const negotiating    = leads.filter((l) => l.stage === 'negotiating');
  const pendingRevenue = negotiating.reduce((acc, l) => acc + (l.price ?? 0), 0);

  // Group leads by stage
  const byStage = PIPELINE_STAGES.reduce<Record<string, TrackedLead[]>>((acc, s) => {
    acc[s.key] = leads.filter((l) => l.stage === s.key);
    return acc;
  }, {});

  if (leads.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-14 text-center text-gray-400">
        <svg className="w-14 h-14 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
        <p className="font-medium text-gray-500">Nenhum lead capturado ainda.</p>
        <p className="text-sm mt-1">
          Na aba <strong>Busca</strong>, clique em um lead sem website e use <strong>"Capturar Lead"</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Kanban de Acompanhamento</h2>
          <p className="text-sm text-gray-400">
            {leads.length} lead{leads.length !== 1 ? 's' : ''} capturado{leads.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => exportCRMtoCSV(leads)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <svg className="w-4 h-4 text-green-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
          Exportar CSV
        </button>
      </div>

      {/* ── Financial Summary ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Total</p>
          <p className="text-2xl font-bold text-gray-800">{leads.length}</p>
          <p className="text-xs text-gray-400">leads</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Vendas</p>
          <p className="text-2xl font-bold text-green-700">{sold.length}</p>
          <p className="text-xs text-gray-400">concluídas</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Receita</p>
          <p className="text-2xl font-bold text-green-700">
            {totalEarned > 0 ? totalEarned.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Em Negociação</p>
          <p className="text-2xl font-bold text-orange-600">
            {pendingRevenue > 0
              ? pendingRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
              : `${negotiating.length}`}
          </p>
        </div>
      </div>

      {/* ── Kanban Board ── */}
      <div className="overflow-x-auto pb-4 -mx-4 px-4">
        <div className="flex gap-3 w-max">
          {PIPELINE_STAGES.map((stage) => (
            <KanbanColumn
              key={stage.key}
              stage={stage}
              leads={byStage[stage.key] ?? []}
              onCardClick={setEditingLead}
            />
          ))}
        </div>
      </div>

      {/* ── Edit Modal ── */}
      {editingLead && (
        <EditModal
          lead={editingLead}
          onSave={handleUpdate}
          onClose={() => setEditingLead(null)}
          onRemove={handleRemove}
        />
      )}
    </div>
  );
}
