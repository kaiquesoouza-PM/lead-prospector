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
 * Generates a detailed V2 prompt in Portuguese for the Lovable AI website builder.
 * Instructs Lovable to build a dynamic React SPA consuming Google Places API data.
 */
export function generateLovablePrompt(lead: Lead, resolvedPhotoUrls?: string[]): string {
  const typeLabel = lead.primaryType ? (TYPE_LABELS[lead.primaryType] ?? 'Estabelecimento') : 'Estabelecimento';
  const whatsapp  = lead.phone?.replace(/\D/g, '');

  const priceMap: Record<string, string> = {
    PRICE_LEVEL_FREE:           'Gratuito',
    PRICE_LEVEL_INEXPENSIVE:    'econômico ($)',
    PRICE_LEVEL_MODERATE:       'preço moderado ($$)',
    PRICE_LEVEL_EXPENSIVE:      'caro ($$$)',
    PRICE_LEVEL_VERY_EXPENSIVE: 'muito caro ($$$$)',
  };

  const priceLabel = lead.priceLevel && lead.priceLevel !== 'PRICE_LEVEL_UNSPECIFIED'
    ? priceMap[lead.priceLevel] ?? ''
    : '';

  const serviceAttrs = [
    lead.servesBreakfast     && 'café da manhã',
    lead.servesBrunch        && 'brunch',
    lead.servesLunch         && 'almoço',
    lead.servesDinner        && 'jantar',
    lead.servesBeer          && 'cerveja',
    lead.servesWine          && 'vinho',
    lead.servesVegetarianFood && 'opções vegetarianas',
  ].filter(Boolean).join(', ');

  const designStyle =
    lead.profile === 'consolidated' ? 'sofisticado e elegante, transmitindo tradição e qualidade' :
    lead.profile === 'growing'      ? 'moderno e dinâmico, transmitindo crescimento e credibilidade' :
                                      'acolhedor e autêntico, transmitindo proximidade com o bairro';

  // Build photos array: use real Google URLs if available, otherwise placeholders
  const photoEntries = resolvedPhotoUrls && resolvedPhotoUrls.length > 0
    ? resolvedPhotoUrls.map((url) => `"${url}"`).join(',\n    ')
    : [
        '"https://placehold.co/1200x800/1a1a1a/ffffff?text=Foto+Fachada"',
        '"https://placehold.co/800x600/2d2d2d/ffffff?text=Foto+Ambiente"',
        '"https://placehold.co/800x600/3d2d1a/ffffff?text=Foto+Prato+01"',
        '"https://placehold.co/800x600/1a2d1a/ffffff?text=Foto+Prato+02"',
        '"https://placehold.co/800x600/1a1a3d/ffffff?text=Foto+Interno"',
      ].join(',\n    ');

  const photosNote = resolvedPhotoUrls && resolvedPhotoUrls.length > 0
    ? `// ✅ ${resolvedPhotoUrls.length} fotos reais do Google Places já incluídas abaixo`
    : '// ⚠️ Fotos placeholder — substitua pelas fotos reais do estabelecimento';

  // Mock data block with real lead data pre-filled
  const mockData = `{
  name: "${lead.name}",
  formatted_phone_number: "${lead.phone ?? '(número não disponível)'}",
  international_phone_number: "${lead.phone ? '+55' + lead.phone.replace(/\D/g, '') : ''}",
  formatted_address: "${lead.address}",
  geometry: {
    location: { lat: ${lead.location.lat}, lng: ${lead.location.lng} }
  },
  opening_hours: {
    open_now: true, // atualizar conforme horário real
    weekday_text: [
      "Segunda-feira: 11:00 – 23:00",
      "Terça-feira: 11:00 – 23:00",
      "Quarta-feira: 11:00 – 23:00",
      "Quinta-feira: 11:00 – 23:00",
      "Sexta-feira: 11:00 – 00:00",
      "Sábado: 11:00 – 00:00",
      "Domingo: 12:00 – 22:00"
    ]
  },
  rating: ${lead.rating?.toFixed(1) ?? '4.5'},
  user_ratings_total: ${lead.userRatingCount},
  reviews: [
    {
      author_name: "Cliente Google",
      rating: 5,
      text: "Lugar incrível! Comida deliciosa e atendimento excelente. Super recomendo!",
      relative_time_description: "há 1 semana",
      profile_photo_url: "https://ui-avatars.com/api/?name=Cliente+Google&background=random"
    },
    {
      author_name: "Maria S.",
      rating: 5,
      text: "Melhor ${typeLabel.toLowerCase()} da região! Voltarei com certeza.",
      relative_time_description: "há 2 semanas",
      profile_photo_url: "https://ui-avatars.com/api/?name=Maria+S&background=random"
    },
    {
      author_name: "João P.",
      rating: 4,
      text: "Muito bom! Ambiente agradável e preço justo. Recomendo a todos.",
      relative_time_description: "há 1 mês",
      profile_photo_url: "https://ui-avatars.com/api/?name=Joao+P&background=random"
    }
  ],
  ${photosNote}
  photos: [
    ${photoEntries}
  ]
}`;

  return `Atue como um Desenvolvedor Front-end React Sênior e UI/UX Designer. Crie uma aplicação web Single Page (SPA) responsiva (Mobile-First) para ${lead.name}, um(a) ${typeLabel}${priceLabel ? ` de nível ${priceLabel}` : ''}.${lead.editorialSummary ? `\n\nDescrição do estabelecimento (Google): "${lead.editorialSummary}"` : ''}${serviceAttrs ? `\nServiços oferecidos: ${serviceAttrs}` : ''}

Esta aplicação deve ser totalmente DINÂMICA e consumir dados de uma API que retorna as informações do estabelecimento via Google Places API.

Use o seguinte MOCK DE DADOS já preenchido com as informações reais do estabelecimento no topo do arquivo principal (ou em um arquivo de serviço separado):

\`\`\`javascript
const ESTABLISHMENT_DATA = ${mockData};
\`\`\`

ESTRUTURA E REGRAS DE RENDERIZAÇÃO DINÂMICA:

1. HERO SECTION & IDENTIDADE:
- O título principal deve renderizar dinamicamente o \`name\` vindo do mock.
- Utilize a primeira foto do array \`photos[]\` como imagem de fundo da Hero Section com overlay escuro para legibilidade.
- Exiba um badge dinâmico baseado em \`opening_hours.open_now\`: se true → "Aberto Agora" (verde), se false → "Fechado no Momento" (vermelho).
- Adicione botão de WhatsApp com link \`https://wa.me/${whatsapp ? '55' + whatsapp : '[NUMERO]'}\` e botão "Como Chegar" apontando para ${lead.googleMapsUri ?? `https://maps.google.com/?q=${encodeURIComponent(lead.address)}`}.

2. CARDÁPIO INTERATIVO:
- Crie uma seção de cardápio com abas (ex: Destaques, Pratos Principais, Bebidas, Sobremesas) e filtros visuais.
- Use dados mockados/locais para os itens do cardápio com nome, descrição, preço e foto placeholder.
- Adicione animação suave ao trocar de aba.

3. SEÇÃO DE AVALIAÇÕES DO GOOGLE:
- Crie um carrossel ou grid elegante "O que nossos clientes dizem no Google".
- Renderize dinamicamente os dados do array \`reviews[]\`: foto do autor (\`profile_photo_url\`), nome, estrelas douradas baseadas no \`rating\` individual e texto do comentário.
- No topo da seção exiba o selo geral: nota média \`${lead.rating?.toFixed(1) ?? '—'}\` estrelas + total de \`${lead.userRatingCount.toLocaleString('pt-BR')}\` avaliações, com identidade visual do Google (ícone "G" colorido).

4. GALERIA DE FOTOS DINÂMICA:
- Crie uma galeria em grid responsivo que renderize todas as imagens do array \`photos[]\`.
- Ao clicar em uma foto, abrir Lightbox com navegação prev/next e botão de fechar.

5. RODAPÉ & CONTATO DINÂMICO:
- Renderize o endereço exato: "${lead.address}".
- Botão de telefone com link \`href="tel:${lead.phone ? '+55' + lead.phone.replace(/\D/g, '') : '[TELEFONE]'}"\` exibindo "${lead.phone ?? '(inserir telefone)'}".
- Link "Como Chegar" apontando para ${lead.googleMapsUri ?? `https://maps.google.com/?q=${encodeURIComponent(lead.address)}`}.
- Lista completa de horários de funcionamento consumindo \`opening_hours.weekday_text\`.
- Ícones para redes sociais (Instagram, Facebook, WhatsApp) — deixar links em branco para preencher depois.

REQUISITOS TÉCNICOS:
- Use React com Tailwind CSS.
- Adicione skeleton screen elegante enquanto os dados "carregam" (simule um delay de 1.5s no mock para demonstrar o loading).
- Transições suaves (fade, slide) em todos os componentes interativos.
- Mobile-First com breakpoints para tablet e desktop.
- Design estilo: ${designStyle}.
- Paleta de cores quentes e convidativas para estabelecimento gastronômico.
- Botão flutuante de WhatsApp fixo no canto inferior direito em todas as telas.
- SEO: meta tags com nome "${lead.name}", tipo "${typeLabel}" e cidade extraída do endereço.
`;
}

// ─── Briefing individual (TXT) ────────────────────────────────────────────────

export function exportLeadBriefing(lead: Lead, resolvedPhotoUrls?: string[]): void {
  const prompt   = generateLovablePrompt(lead, resolvedPhotoUrls);
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
