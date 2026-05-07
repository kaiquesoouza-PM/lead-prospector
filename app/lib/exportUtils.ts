import type { Lead } from '../types';
import { PROFILE_MAP } from '../types';

// ─── Type label map (duplicated here to keep utils self-contained) ─────────────

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

// ─── CSV ──────────────────────────────────────────────────────────────────────

export function exportToCSV(leads: Lead[]): void {
  const headers = [
    'Nome',
    'Endereço',
    'Telefone',
    'Nota (Rating)',
    'Avaliações',
    'Fotos',
    'Website',
    'Status',
    'Score de Lead',
    'Flags',
    'Google Maps',
  ];

  const escape = (v: string | number | undefined) => {
    if (v === undefined || v === null) return '';
    const str = String(v).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = leads.map((lead) => [
    escape(lead.name),
    escape(lead.address),
    escape(lead.phone),
    escape(lead.rating?.toFixed(1)),
    escape(lead.userRatingCount),
    escape(lead.photoCount),
    escape(lead.website),
    escape(lead.hasWebsite ? 'Com Website' : 'Sem Website'),
    escape(lead.leadScore),
    escape(lead.flags.join(' | ')),
    escape(lead.googleMapsUri),
  ]);

  const BOM = '\uFEFF'; // UTF-8 BOM so Excel opens correctly
  const csv = [headers.map((h) => `"${h}"`).join(','), ...rows.map((r) => r.join(','))].join('\n');

  downloadFile(BOM + csv, 'leads.csv', 'text/csv;charset=utf-8');
}

// ─── JSON ─────────────────────────────────────────────────────────────────────

export function exportToJSON(leads: Lead[]): void {
  const payload = leads.map((lead) => ({
    id:              lead.id,
    name:            lead.name,
    address:         lead.address,
    phone:           lead.phone ?? null,
    rating:          lead.rating ?? null,
    userRatingCount: lead.userRatingCount,
    website:         lead.website ?? null,
    photoCount:      lead.photoCount,
    googleMapsUri:   lead.googleMapsUri ?? null,
    primaryType:     lead.primaryType ?? null,
    leadScore:       lead.leadScore,
    flags:           lead.flags,
    location:        lead.location,
  }));

  downloadFile(JSON.stringify(payload, null, 2), 'leads.json', 'application/json');
}

// ─── Lovable Prompt ───────────────────────────────────────────────────────────

/**
 * Generates a detailed prompt in Portuguese for the Lovable AI website builder.
 * The prompt is tailored to the lead's profile and available data.
 */
export function generateLovablePrompt(lead: Lead): string {
  const profile   = PROFILE_MAP[lead.profile];
  const typeLabel = lead.primaryType ? (TYPE_LABELS[lead.primaryType] ?? 'Estabelecimento') : 'Estabelecimento';
  const whatsapp  = lead.phone?.replace(/\D/g, '');
  const sections  = profile.websiteFocus.map((s, i) => `${i + 1}. ${s}`).join('\n');

  const priceMap: Record<string, string> = {
    PRICE_LEVEL_FREE:           'Gratuito',
    PRICE_LEVEL_INEXPENSIVE:    '$ (econômico)',
    PRICE_LEVEL_MODERATE:       '$$ (preço moderado)',
    PRICE_LEVEL_EXPENSIVE:      '$$$ (caro)',
    PRICE_LEVEL_VERY_EXPENSIVE: '$$$$ (muito caro)',
  };

  const serviceAttrs = [
    lead.servesBreakfast     && 'café da manhã',
    lead.servesBrunch        && 'brunch',
    lead.servesLunch         && 'almoço',
    lead.servesDinner        && 'jantar',
    lead.servesBeer          && 'cerveja',
    lead.servesWine          && 'vinho',
    lead.servesVegetarianFood && 'opções vegetarianas',
  ].filter(Boolean).join(', ');

  return `Crie um site completo, responsivo e moderno para ${lead.name}, um(a) ${typeLabel} localizado(a) em ${lead.address}.

DADOS DO ESTABELECIMENTO
Nome: ${lead.name}
Tipo: ${typeLabel}
Endereço: ${lead.address}
Telefone: ${lead.phone ?? '(inserir manualmente)'}
${lead.rating ? `Nota Google: ${lead.rating.toFixed(1)} estrelas com ${lead.userRatingCount.toLocaleString('pt-BR')} avaliações` : ''}
${lead.priceLevel && lead.priceLevel !== 'PRICE_LEVEL_UNSPECIFIED' ? `Faixa de preço: ${priceMap[lead.priceLevel] ?? ''}` : ''}
${serviceAttrs ? `Serve: ${serviceAttrs}` : ''}
${lead.editorialSummary ? `Descrição (Google): "${lead.editorialSummary}"` : ''}
${lead.googleMapsUri ? `Google Maps: ${lead.googleMapsUri}` : ''}

PÁGINAS E SEÇÕES OBRIGATÓRIAS
${sections}
- Página de contato com mapa do Google Maps embutido e horário de funcionamento

FUNCIONALIDADES OBRIGATÓRIAS
- Botão de WhatsApp flutuante fixo na tela${whatsapp ? ` com o número 55${whatsapp}` : ''}
- Galeria de fotos do ambiente e dos pratos
- Seção para exibir o cardápio (imagem ou PDF)
- SEO local otimizado para aparecer no Google quando buscarem por "${typeLabel} em [cidade]"
- Links para Instagram e Facebook (deixar espaço para preencher depois)

DESIGN
- Mobile-first (prioridade absoluta para celular)
- Estilo: ${lead.profile === 'consolidated' ? 'sofisticado e elegante, transmitindo tradição e qualidade' : lead.profile === 'growing' ? 'moderno e dinâmico, transmitindo crescimento e credibilidade' : 'acolhedor e direto, transmitindo autenticidade e proximidade com o bairro'}
- Paleta de cores quentes e convidativas, adequadas para um estabelecimento gastronômico
- Imagens de placeholder de alta qualidade até o cliente fornecer as fotos reais
- Carregamento rápido e performance otimizada
`;
}

// ─── Briefing individual (TXT) ────────────────────────────────────────────────

export function exportLeadBriefing(lead: Lead): void {
  const prompt   = generateLovablePrompt(lead);
  const filename = `briefing-${lead.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}.txt`;
  downloadFile(prompt, filename, 'text/plain;charset=utf-8');
}

// ─── Briefing em lote (todos os leads) ───────────────────────────────────────

export function exportAllBriefings(leads: Lead[]): void {
  const content = leads
    .map((lead, i) => `${'='.repeat(80)}\nLEAD ${i + 1} de ${leads.length}\n${'='.repeat(80)}\n\n${generateLovablePrompt(lead)}`)
    .join('\n\n');
  downloadFile(content, 'todos-os-briefings-lovable.txt', 'text/plain;charset=utf-8');
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
