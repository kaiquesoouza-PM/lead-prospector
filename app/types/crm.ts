import type { LeadProfile } from './index';

// ─── Pipeline ────────────────────────────────────────────────────────────────

export type PipelineStage =
  | 'captured'
  | 'site_created'
  | 'contacted'
  | 'awaiting_response'
  | 'negotiating'
  | 'sold'
  | 'declined';

export interface StageInfo {
  key:     PipelineStage;
  label:   string;
  color:   string;   // text color class
  bg:      string;   // background class
  border:  string;   // border class
}

export const PIPELINE_STAGES: StageInfo[] = [
  { key: 'captured',          label: 'Lead Capturado',      color: 'text-gray-400',   bg: 'bg-white/[0.04]',    border: 'border-white/[0.12]' },
  { key: 'site_created',      label: 'Site Criado',         color: 'text-blue-400',   bg: 'bg-blue-950/40',     border: 'border-blue-700/40' },
  { key: 'contacted',         label: 'Contato Realizado',   color: 'text-violet-400', bg: 'bg-violet-950/40',   border: 'border-violet-700/40' },
  { key: 'awaiting_response', label: 'Aguardando Resposta', color: 'text-yellow-400', bg: 'bg-yellow-950/40',   border: 'border-yellow-700/40' },
  { key: 'negotiating',       label: 'Em Negociação',       color: 'text-orange-400', bg: 'bg-orange-950/40',   border: 'border-orange-700/40' },
  { key: 'sold',              label: 'Venda Concluída',     color: 'text-emerald-400', bg: 'bg-emerald-950/40', border: 'border-emerald-700/40' },
  { key: 'declined',          label: 'Declinado',           color: 'text-red-400',    bg: 'bg-red-950/40',      border: 'border-red-700/40' },
];

// ─── Tracked Lead ─────────────────────────────────────────────────────────────

export interface TrackedLead {
  id:               string;
  // Snapshot from Lead at capture time
  name:             string;
  address:          string;
  primaryType?:     string;
  rating?:          number;
  userRatingCount:  number;
  googleMapsUri?:   string;
  profile:          LeadProfile;
  leadScore:        number;
  // Editable contact fields
  phone:            string;
  alternativePhone: string;
  email:            string;
  // CRM fields
  stage:            PipelineStage;
  price?:           number;
  notes:            string;
  siteUrl?:         string; // URL do site criado para o cliente
  capturedAt:       string; // ISO date
  updatedAt:        string; // ISO date
}
