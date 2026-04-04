'use client';

import { PROFILE_MAP } from '../types';
import type { Lead } from '../types';
import PhotoGallery from './PhotoGallery';

interface LeadDetailPanelProps {
  lead: Lead;
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function InfoRow({ icon, label, value, href }: {
  icon:   React.ReactNode;
  label:  string;
  value:  string;
  href?:  string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-gray-400 mt-0.5 flex-shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline break-all">
            {value}
          </a>
        ) : (
          <p className="text-sm text-gray-800 break-words">{value}</p>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100 pb-1">
        {title}
      </h3>
      {children}
    </div>
  );
}

// ─── Suggested domain ────────────────────────────────────────────────────────

function suggestDomain(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .join('');
  return `${slug}.com.br`;
}

// ─── Type label map ──────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  restaurant:           'Restaurante',
  bar:                  'Bar',
  bakery:               'Padaria',
  cafe:                 'Cafeteria',
  fast_food_restaurant: 'Fast Food',
  hamburger_restaurant: 'Hamburgueria',
  pizza_restaurant:     'Pizzaria',
  sandwich_shop:        'Lanchonete',
  meal_takeaway:        'Para Viagem',
  ice_cream_shop:       'Sorveteria',
  juice_bar:            'Suqueria',
  brunch_restaurant:    'Brunch',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function LeadDetailPanel({ lead, onClose }: LeadDetailPanelProps) {
  const profile    = PROFILE_MAP[lead.profile];
  const typeLabel  = lead.primaryType ? (TYPE_LABELS[lead.primaryType] ?? lead.primaryType) : 'Estabelecimento';
  const domain     = suggestDomain(lead.name);
  const whatsapp   = lead.phone?.replace(/\D/g, '');

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 flex flex-col h-full overflow-hidden">

      {/* ── Header ── */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${profile.color}`}>
              {profile.label}
            </span>
            <span className="text-xs text-gray-400">{typeLabel}</span>
          </div>
          <h2 className="text-base font-bold text-gray-900 mt-1 leading-snug">{lead.name}</h2>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

        {/* ── Pitch de Prospecção ── */}
        <div className={`rounded-xl p-4 ${profile.color} bg-opacity-30`}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-1 opacity-70">
            Argumento de Venda
          </p>
          <p className="text-sm font-medium leading-relaxed">
            "{profile.pitch}"
          </p>
          <p className="text-xs mt-2 opacity-70 leading-relaxed">
            <strong>Estratégia:</strong> {profile.strategy}
          </p>
        </div>

        {/* ── Fotos do Google ── */}
        <Section title={`Fotos do Google (${lead.photoRefs.length} disponíveis)`}>
          <PhotoGallery photoRefs={lead.photoRefs} />
        </Section>

        {/* ── Dados de Contato ── */}
        <Section title="Dados de Contato">
          <InfoRow
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
            label="Endereço"
            value={lead.address}
          />

          {lead.phone && (
            <InfoRow
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>}
              label="Telefone"
              value={lead.phone}
              href={`tel:${lead.phone}`}
            />
          )}

          {whatsapp && (
            <InfoRow
              icon={<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.122 1.528 5.859L.057 23.571a.75.75 0 00.922.922l5.713-1.471A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.891 0-3.67-.502-5.203-1.381l-.374-.214-3.889 1.001 1.001-3.889-.214-.374A9.944 9.944 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>}
              label="WhatsApp"
              value={`Enviar mensagem`}
              href={`https://wa.me/55${whatsapp}`}
            />
          )}

          {lead.website ? (
            <InfoRow
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" /></svg>}
              label="Website Atual"
              value={lead.website}
              href={lead.website}
            />
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-red-400 mt-0.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
              </span>
              <div>
                <p className="text-xs text-gray-400">Website</p>
                <p className="text-sm font-semibold text-red-600">Não possui — oportunidade!</p>
              </div>
            </div>
          )}

          {lead.googleMapsUri && (
            <InfoRow
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>}
              label="Google Maps"
              value="Ver localização"
              href={lead.googleMapsUri}
            />
          )}
        </Section>

        {/* ── Métricas do Google ── */}
        <Section title="Métricas no Google">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-400">Nota</p>
              <p className="text-xl font-bold text-gray-800">{lead.rating?.toFixed(1) ?? '—'}</p>
              <p className="text-xs text-yellow-500">★ estrelas</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-400">Avaliações</p>
              <p className="text-xl font-bold text-gray-800">{lead.userRatingCount.toLocaleString('pt-BR')}</p>
              <p className="text-xs text-gray-400">reviews</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-400">Fotos</p>
              <p className="text-xl font-bold text-gray-800">{lead.photoCount}</p>
              <p className="text-xs text-gray-400">no Google</p>
            </div>
          </div>

          {/* Volume context */}
          <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600">
            {lead.userRatingCount >= 100 && (
              <p>Alta movimentação — capacidade de pagamento elevada. Aborde com proposta profissional.</p>
            )}
            {lead.userRatingCount >= 20 && lead.userRatingCount < 100 && (
              <p>Negócio em crescimento — receptivo a soluções que ajudem a escalar.</p>
            )}
            {lead.userRatingCount < 20 && (
              <p>Pouquíssimas avaliações — a falta de visibilidade digital é o problema central. Use isso como argumento.</p>
            )}
          </div>
        </Section>

        {/* ── Briefing para Desenvolvimento de Site ── */}
        <Section title="Briefing para Desenvolvimento de Site">
          <div className="space-y-3">

            {/* Domain */}
            <div className="flex items-center justify-between bg-green-50 rounded-xl px-4 py-3">
              <div>
                <p className="text-xs text-gray-500">Domínio sugerido</p>
                <p className="text-sm font-mono font-bold text-green-700">{domain}</p>
              </div>
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
              </svg>
            </div>

            {/* Sections */}
            <div>
              <p className="text-xs text-gray-500 mb-2">Seções prioritárias para o site</p>
              <ul className="space-y-1.5">
                {profile.websiteFocus.map((section, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs flex items-center justify-center font-bold flex-shrink-0">
                      {i + 1}
                    </span>
                    {section}
                  </li>
                ))}
              </ul>
            </div>

            {/* Content available */}
            <div>
              <p className="text-xs text-gray-500 mb-2">Conteúdo disponível para o site</p>
              <div className="flex flex-wrap gap-2">
                {lead.phone       && <Tag label="Telefone" ok />}
                {lead.address     && <Tag label="Endereço" ok />}
                {lead.rating      && <Tag label="Avaliações Google" ok />}
                {lead.photoCount > 0 && <Tag label={`${lead.photoCount} foto(s) no Google`} ok />}
                {lead.googleMapsUri  && <Tag label="Mapa incorporável" ok />}
                {!lead.phone      && <Tag label="Telefone" ok={false} />}
                {lead.photoCount === 0 && <Tag label="Fotos (produção necessária)" ok={false} />}
              </div>
            </div>

            {/* Info for the brief */}
            <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 text-xs text-gray-600">
              <p><strong>Nome:</strong> {lead.name}</p>
              <p><strong>Categoria:</strong> {typeLabel}</p>
              <p><strong>Endereço:</strong> {lead.address}</p>
              {lead.phone && <p><strong>Telefone:</strong> {lead.phone}</p>}
              {lead.rating && <p><strong>Nota Google:</strong> {lead.rating.toFixed(1)} estrelas ({lead.userRatingCount} avaliações)</p>}
              <p><strong>Tem website:</strong> {lead.hasWebsite ? `Sim — ${lead.website}` : 'Não'}</p>
              <p><strong>Perfil:</strong> {PROFILE_MAP[lead.profile].label}</p>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}

// ─── Tag helper ──────────────────────────────────────────────────────────────

function Tag({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
      ok ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
    }`}>
      {ok ? '✓' : '✗'} {label}
    </span>
  );
}
