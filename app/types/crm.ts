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
  { key: 'captured',          label: 'Lead Capturado',      color: 'text-gray-700',   bg: 'bg-gray-100',   border: 'border-gray-300' },
  { key: 'site_created',      label: 'Site Criado',         color: 'text-blue-700',   bg: 'bg-blue-100',   border: 'border-blue-300' },
  { key: 'contacted',         label: 'Contato Realizado',   color: 'text-violet-700', bg: 'bg-violet-100', border: 'border-violet-300' },
  { key: 'awaiting_response', label: 'Aguardando Resposta', color: 'text-yellow-700', bg: 'bg-yellow-100', border: 'border-yellow-300' },
  { key: 'negotiating',       label: 'Em Negociação',       color: 'text-orange-700', bg: 'bg-orange-100', border: 'border-orange-300' },
  { key: 'sold',              label: 'Venda Concluída',     color: 'text-green-700',  bg: 'bg-green-100',  border: 'border-green-300' },
  { key: 'declined',          label: 'Declinado',           color: 'text-red-700',    bg: 'bg-red-100',    border: 'border-red-300' },
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
  capturedAt:       string; // ISO date
  updatedAt:        string; // ISO date
}
