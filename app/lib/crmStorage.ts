import type { Lead } from '../types';
import type { TrackedLead, PipelineStage } from '../types/crm';

const STORAGE_KEY = 'lead-prospector-crm-v1';

// ─── Read / Write ─────────────────────────────────────────────────────────────

export function getTrackedLeads(): TrackedLead[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TrackedLead[]) : [];
  } catch {
    return [];
  }
}

function persist(leads: TrackedLead[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

/** Returns false if the lead was already in the CRM. */
export function captureLeadToCRM(lead: Lead): boolean {
  const leads = getTrackedLeads();
  if (leads.some((l) => l.id === lead.id)) return false;

  const tracked: TrackedLead = {
    id:               lead.id,
    name:             lead.name,
    address:          lead.address,
    primaryType:      lead.primaryType,
    rating:           lead.rating,
    userRatingCount:  lead.userRatingCount,
    googleMapsUri:    lead.googleMapsUri,
    profile:          lead.profile,
    leadScore:        lead.leadScore,
    phone:            lead.phone ?? '',
    alternativePhone: '',
    email:            '',
    stage:            'captured',
    notes:            '',
    capturedAt:       new Date().toISOString(),
    updatedAt:        new Date().toISOString(),
  };

  persist([...leads, tracked]);
  return true;
}

export function updateTrackedLead(id: string, updates: Partial<Omit<TrackedLead, 'id' | 'capturedAt'>>): void {
  const leads = getTrackedLeads();
  const idx   = leads.findIndex((l) => l.id === id);
  if (idx === -1) return;
  leads[idx] = { ...leads[idx], ...updates, updatedAt: new Date().toISOString() };
  persist(leads);
}

export function removeTrackedLead(id: string): void {
  persist(getTrackedLeads().filter((l) => l.id !== id));
}

export function isLeadCaptured(id: string): boolean {
  return getTrackedLeads().some((l) => l.id === id);
}

// ─── CRM Export ──────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  restaurant: 'Restaurante', bar: 'Bar', bakery: 'Padaria', cafe: 'Cafeteria',
  fast_food_restaurant: 'Fast Food', hamburger_restaurant: 'Hamburgueria',
  pizza_restaurant: 'Pizzaria', sandwich_shop: 'Lanchonete',
  meal_takeaway: 'Para Viagem', ice_cream_shop: 'Sorveteria',
  juice_bar: 'Suqueria', brunch_restaurant: 'Brunch',
};

export function exportCRMtoCSV(leads: TrackedLead[]): void {
  const headers = [
    'Nome', 'Tipo', 'Endereço', 'Telefone', 'Tel. Alternativo', 'E-mail',
    'Etapa', 'Valor Cobrado (R$)', 'Nota Google', 'Avaliações',
    'Notas', 'Capturado em', 'Atualizado em', 'Google Maps',
  ];

  const esc = (v: string | number | undefined) => {
    if (v === undefined || v === null) return '';
    return `"${String(v).replace(/"/g, '""')}"`;
  };

  const { PIPELINE_STAGES } = require('../types/crm');
  const stageLabel = (s: PipelineStage) =>
    PIPELINE_STAGES.find((st: { key: string; label: string }) => st.key === s)?.label ?? s;

  const rows = leads.map((l) => [
    esc(l.name),
    esc(l.primaryType ? (TYPE_LABELS[l.primaryType] ?? l.primaryType) : ''),
    esc(l.address),
    esc(l.phone),
    esc(l.alternativePhone),
    esc(l.email),
    esc(stageLabel(l.stage)),
    esc(l.price),
    esc(l.rating?.toFixed(1)),
    esc(l.userRatingCount),
    esc(l.notes),
    esc(new Date(l.capturedAt).toLocaleDateString('pt-BR')),
    esc(new Date(l.updatedAt).toLocaleDateString('pt-BR')),
    esc(l.googleMapsUri),
  ]);

  const BOM = '\uFEFF';
  const csv = [headers.map((h) => `"${h}"`).join(','), ...rows.map((r) => r.join(','))].join('\n');

  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'acompanhamento-leads.csv';
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}
