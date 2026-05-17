import type { Lead } from '../types';
import { PROFILE_MAP } from '../types';

// ─── Classified Photos (shared type) ─────────────────────────────────────────

export interface ClassifiedPhotos {
  facade:   string | null;   // URL da fachada
  interior: string[];        // URLs do ambiente/interior
  food:     string[];        // URLs de pratos/produtos
  other:    string[];        // Demais fotos
  all:      string[];        // Todas as URLs em ordem
  source:   'vision' | 'positional'; // como foram classificadas
}

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

/** Extrai bairro e cidade de um endereço brasileiro. */
function parseAddress(address: string): { neighborhood: string; city: string } {
  const dashParts = address.split(' - ');
  let neighborhood = '';
  let city = '';
  if (dashParts.length >= 2) {
    const part2 = dashParts[1].split(',');
    neighborhood = part2[0].trim();
    city = part2[1]?.trim() ?? '';
  }
  if (!city && dashParts.length >= 3) {
    city = dashParts[2].split(',')[0].trim();
  }
  return { neighborhood, city };
}

/**
 * Generates a V3 premium prompt for Lovable AI website builder.
 * Full creative direction + mock data pre-filled with real Google Places data.
 * Accepts classified photos from Google Vision API (or positional fallback).
 */
export function generateLovablePrompt(lead: Lead, classified?: ClassifiedPhotos): string {
  const typeLabel  = lead.primaryType ? (TYPE_LABELS[lead.primaryType] ?? 'Estabelecimento') : 'Estabelecimento';
  const whatsapp   = lead.phone?.replace(/\D/g, '');
  const { neighborhood, city } = parseAddress(lead.address);
  const mapsUrl    = lead.googleMapsUri ?? `https://maps.google.com/?q=${encodeURIComponent(lead.address)}`;
  const waUrl      = whatsapp ? `https://wa.me/55${whatsapp}` : 'https://wa.me/[NUMERO]';

  const serviceAttrs = [
    lead.servesBreakfast     && 'café da manhã',
    lead.servesBrunch        && 'brunch',
    lead.servesLunch         && 'almoço',
    lead.servesDinner        && 'jantar',
    lead.servesBeer          && 'cerveja artesanal',
    lead.servesWine          && 'carta de vinhos',
    lead.servesVegetarianFood && 'opções vegetarianas',
  ].filter(Boolean).join(', ');

  const priceMap: Record<string, string> = {
    PRICE_LEVEL_INEXPENSIVE:    'econômico',
    PRICE_LEVEL_MODERATE:       'moderado',
    PRICE_LEVEL_EXPENSIVE:      'premium',
    PRICE_LEVEL_VERY_EXPENSIVE: 'luxo',
  };
  const priceLevel = lead.priceLevel ? (priceMap[lead.priceLevel] ?? '') : '';

  // ── Fotos classificadas ────────────────────────────────────────────────────
  const hasRealPhotos = classified && classified.all.length > 0;

  // Bloco de fotos tipadas para o mock
  const buildPhotoBlock = () => {
    if (!classified || !hasRealPhotos) {
      return `// ⚠️ FOTOS NÃO DISPONÍVEIS — solicite as fotos reais ao cliente antes de prosseguir.
  // NÃO gere imagens por IA. NÃO use Unsplash. Aguarde as fotos reais.
  photos: {
    facade:   null,
    interior: [],
    food:     [],
    all:      []
  }`;
    }

    const sourceLabel = classified.source === 'vision'
      ? '✅ Classificadas por Google Vision AI'
      : '⚠️ Classificadas por posição (Vision API indisponível)';

    const facadeStr   = classified.facade ? `"${classified.facade}"` : 'null';
    const interiorStr = classified.interior.map(u => `    "${u}"`).join(',\n');
    const foodStr     = classified.food.map(u => `    "${u}"`).join(',\n');
    const othersStr   = classified.other.map(u => `    "${u}"`).join(',\n');
    const allStr      = classified.all.map(u => `    "${u}"`).join(',\n');

    return `// ${sourceLabel}
  // ${classified.all.length} FOTOS REAIS do Google Places — USE OBRIGATORIAMENTE estas URLs.
  // PROIBIDO substituir por imagens de IA ou Unsplash. Use APENAS as URLs abaixo.
  photos: {
    // FACHADA — use para Hero Section, extração de paleta e recriação do logo
    facade: ${facadeStr},

    // AMBIENTE / INTERIOR (${classified.interior.length} foto${classified.interior.length !== 1 ? 's' : ''})
    interior: [
${interiorStr || '      // (sem fotos de interior identificadas)'}
    ],

    // PRATOS / PRODUTOS (${classified.food.length} foto${classified.food.length !== 1 ? 's' : ''})
    food: [
${foodStr || '      // (sem fotos de pratos identificadas)'}
    ],

    // DEMAIS FOTOS
    other: [
${othersStr || '      // (sem fotos adicionais)'}
    ],

    // TODAS AS FOTOS — para galeria completa
    all: [
${allStr}
    ]
  }`;
  };

  // ── Mock Data ──────────────────────────────────────────────────────────────
  const mockData = `const restaurantData = {
  // ── Identidade ────────────────────────────────────────────────────────────
  name:         "${lead.name}",
  category:     "${typeLabel}",
  description:  "${lead.editorialSummary ?? `${typeLabel} localizado(a) em ${neighborhood || lead.address}.`}",
  ${priceLevel ? `priceLevel:   "${priceLevel}",` : ''}
  ${serviceAttrs ? `services:     "${serviceAttrs}",` : ''}

  // ── Contato & Localização ─────────────────────────────────────────────────
  phone:        "${lead.phone ?? ''}",
  whatsapp:     "${whatsapp ? '55' + whatsapp : ''}",
  address:      "${lead.address}",
  neighborhood: "${neighborhood}",
  city:         "${city}",
  googleMapsUrl:"${mapsUrl}",
  coordinates: {
    lat: ${lead.location.lat},
    lng: ${lead.location.lng}
  },

  // ── Avaliações Google ─────────────────────────────────────────────────────
  rating:             ${lead.rating?.toFixed(1) ?? '4.5'},
  user_ratings_total: ${lead.userRatingCount},

  // ── Horários de Funcionamento ─────────────────────────────────────────────
  opening_hours: {
    open_now: true,   // badge dinâmico — atualizar conforme horário real
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

  // ── Reviews Google ────────────────────────────────────────────────────────
  reviews: [
    {
      author_name:  "Maria Silva",
      rating:       5,
      text:         "Experiência incrível! Comida deliciosa, ambiente aconchegante e atendimento impecável. Voltarei com certeza!",
      profile_photo_url: "https://ui-avatars.com/api/?name=Maria+Silva&background=e74c3c&color=fff"
    },
    {
      author_name:  "João Pereira",
      rating:       5,
      text:         "Melhor ${typeLabel.toLowerCase()} da região! Ingredientes frescos, porções generosas e sabor incomparável.",
      profile_photo_url: "https://ui-avatars.com/api/?name=Joao+Pereira&background=3498db&color=fff"
    },
    {
      author_name:  "Ana Costa",
      rating:       4,
      text:         "Ótimo ambiente e atendimento muito simpático. Os pratos são muito bem apresentados. Super recomendo!",
      profile_photo_url: "https://ui-avatars.com/api/?name=Ana+Costa&background=27ae60&color=fff"
    },
    {
      author_name:  "Carlos Mendes",
      rating:       5,
      text:         "Lugar maravilhoso! Perfeito para um jantar especial. A experiência gastronômica é completa.",
      profile_photo_url: "https://ui-avatars.com/api/?name=Carlos+Mendes&background=8e44ad&color=fff"
    }
  ],

  ${buildPhotoBlock()},

  // ── Cardápio ─────────────────────────────────────────────────────────────
  // SE vazio → gere cardápio fictício premium para "${typeLabel}" (sem imagens de IA).
  // SE preenchido → renderize os dados reais.
  menu_items: []
};`;

  const facadeUrl = classified?.facade ?? null;

  return `Atue como um Desenvolvedor Front-end React Sênior, UI/UX Designer, Diretor Criativo e Especialista em Branding Digital focado no nicho de gastronomia premium.

Crie uma SPA (Single Page Application) sofisticada, responsiva e orientada para conversão em React + Tailwind CSS + Lucide Icons para:

**${lead.name}** — ${typeLabel}${neighborhood ? ` · ${neighborhood}` : ''}${city ? `, ${city}` : ''}
Nota Google: ${lead.rating?.toFixed(1) ?? '—'} ⭐ (${lead.userRatingCount.toLocaleString('pt-BR')} avaliações)${lead.editorialSummary ? `\nDescrição: "${lead.editorialSummary}"` : ''}${serviceAttrs ? `\nServiços: ${serviceAttrs}` : ''}

====================================================================
⚠️ REGRA ABSOLUTA — FOTOS REAIS OBRIGATÓRIAS
====================================================================

${hasRealPhotos ? `ESTAS SÃO AS FOTOS REAIS DO ESTABELECIMENTO extraídas do Google Places API.
${classified!.source === 'vision' ? '📸 Classificadas por Google Cloud Vision AI (fachada, interior e pratos identificados automaticamente).' : '⚠️ Classificadas por posição (sem Vision AI).'}
Você DEVE usar EXCLUSIVAMENTE as URLs abaixo. É TERMINANTEMENTE PROIBIDO:
❌ Gerar imagens por IA
❌ Usar imagens do Unsplash, Pexels ou qualquer banco de imagens
❌ Criar imagens placeholder

Todas as ${classified!.all.length} URLs abaixo são fotos reais e públicas do estabelecimento.
Use-as exatamente como estão, sem modificação.` : `⚠️ FOTOS NÃO DISPONÍVEIS NESTE PROMPT.
NÃO gere imagens por IA. NÃO use Unsplash.
Deixe todos os campos de imagem em branco (src="") com comentário "// foto real pendente".
O cliente irá fornecer as fotos reais posteriormente.`}

====================================================================
MOCK DATA — COLE NO TOPO DO ARQUIVO
====================================================================

\`\`\`javascript
${mockData}
\`\`\`

====================================================================
${hasRealPhotos && facadeUrl ? `ANÁLISE DA FACHADA PARA BRANDING
====================================================================

A foto da fachada do estabelecimento é:
${facadeUrl}

Ao processar o código, analise visualmente esta imagem para extrair:

1. PALETA DE CORES
   - Cor dominante da fachada → cor primária do site
   - Cor secundária/contraste → cor dos botões e destaques
   - Tom geral (quente/frio/neutro) → define o mood visual

2. ESTILO ARQUITETÔNICO
   - Moderno/industrial → Sans-serif bold, visual urbano
   - Rústico/artesanal → Serif ou script, visual aconchegante
   - Sofisticado/clássico → Serif elegante, visual premium
   - Jovem/casual → Sans-serif moderna, visual descolado

3. EXTRAÇÃO DO LOGO / LETREIRO
   - Procure na foto o letreiro, placa ou logomarca visível na fachada
   - Se identificar o logotipo real, recrie-o como logo tipográfica SVG
   - Mantenha as cores, fonte e estilo do logo original
   - Se não identificar logo, crie uma logo tipográfica condizente com o estilo da fachada

USE ESTA ANÁLISE para definir automaticamente toda a identidade visual do site.

====================================================================` : `LOGO E BRANDING
====================================================================

Crie uma LOGO TIPOGRÁFICA em SVG baseada no nome "${lead.name}":
${lead.primaryType === 'restaurant' || lead.primaryType === 'pizza_restaurant' ? '→ Serif elegante (transmite tradição e sofisticação)' :
  lead.primaryType === 'hamburger_restaurant' || lead.primaryType === 'fast_food_restaurant' ? '→ Sans-serif bold e impactante (moderna e urbana)' :
  lead.primaryType === 'cafe' || lead.primaryType === 'bakery' || lead.primaryType === 'brunch_restaurant' ? '→ Tipografia orgânica/artesanal (aconchegante)' :
  lead.primaryType === 'bar' || lead.primaryType === 'juice_bar' ? '→ Tipografia cinematográfica e impactante' :
  '→ Serif elegante (gastronomia premium)'}

====================================================================`}
ESTRUTURA DA PÁGINA
====================================================================

1. NAVBAR PREMIUM
   - Logo (tipográfica ou extraída da fachada)
   - Links: Início | Cardápio | Avaliações | Galeria | Contato
   - Botão WhatsApp no topo direito
   - Menu hamburguer mobile

2. HERO SECTION FULL SCREEN
   - Background: restaurantData.photos.facade${facadeUrl ? ` → "${facadeUrl}"` : ' (pendente)'}
   - Overlay escuro elegante para legibilidade
   - Headline emocional forte
   - Badge dinâmico: opening_hours.open_now → "Aberto Agora" (verde) ou "Fechado no Momento" (vermelho)
   - Nota: ${lead.rating?.toFixed(1) ?? '4.5'} ⭐ · ${lead.userRatingCount.toLocaleString('pt-BR')} avaliações
   - CTA: WhatsApp → ${waUrl}
   - CTA secundário: "Ver Cardápio" (âncora suave)
   - Micro animações de entrada (fade + slide up)

3. SOBRE O ESTABELECIMENTO
   - Texto: restaurantData.description
   - Serviços: restaurantData.services
   - Foto de ambiente: restaurantData.photos.interior[0]${classified?.interior[0] ? ` → "${classified.interior[0]}"` : ''}

4. GALERIA DE AMBIENTE
   - Fotos: restaurantData.photos.interior[]${classified && classified.interior.length > 0 ? `\n   - URLs disponíveis: ${classified.interior.join(', ')}` : ''}
   - Grid responsivo com hover zoom suave

5. CARDÁPIO (LÓGICA OBRIGATÓRIA)
   SE menu_items.length > 0 → renderizar dados reais
   SE vazio (caso atual) → gerar cardápio fictício premium para "${typeLabel}"
     - NÃO use imagens de IA nem Unsplash para os pratos
     - Use emojis ou ícones Lucide como visual dos pratos
     - Nomes, descrições e preços compatíveis com o nicho
   - Tabs por categoria + filtros visuais + transições suaves

6. PROVA SOCIAL — GOOGLE REVIEWS
   - Título: "O que nossos clientes dizem no Google"
   - Selo: ${lead.rating?.toFixed(1) ?? '4.5'} ⭐ · ${lead.userRatingCount.toLocaleString('pt-BR')} avaliações
   - Ícone G colorido do Google
   - Carrossel/grid com restaurantData.reviews[]
   - Cada card: avatar, nome, estrelas douradas, texto

7. GALERIA DE FOTOS COMPLETA
   - Usar restaurantData.photos.all[] — TODAS as fotos reais
   ${hasRealPhotos ? `- URLs reais disponíveis: ${classified!.all.length} fotos` : '- Aguardar fotos reais do cliente'}
   - Grid masonry responsivo
   - Lightbox com navegação prev/next ao clicar

8. HORÁRIOS DE FUNCIONAMENTO
   - Lista de opening_hours.weekday_text[]
   - Badge dinâmico open_now

9. LOCALIZAÇÃO & CONTATO
   - Endereço: "${lead.address}"
   - Telefone clicável: tel:${lead.phone ? '+55' + lead.phone.replace(/\D/g, '') : '[INSERIR]'}
   - Botão "Como Chegar": ${mapsUrl}
   - Redes sociais (Instagram, Facebook, WhatsApp) — deixar href em branco

10. CTA FINAL
    - Seção dark cinematográfica
    - Botão WhatsApp grande: ${waUrl}

11. FOOTER PREMIUM
    - Logo, endereço, horários resumidos, redes sociais

====================================================================
BOTÃO WHATSAPP FLUTUANTE
====================================================================

Fixo canto inferior direito em TODAS as telas.
Link: ${waUrl}
Pulse animation suave.

====================================================================
COPYWRITING
====================================================================

NUNCA use textos genéricos.
Linguagem sensorial e gastronômica. Tom sofisticado e humano.
Headlines devem despertar desejo. Sem menção a "reservas".

====================================================================
SKELETON SCREEN
====================================================================

1.5s de loading com shimmer effect antes de renderizar.

====================================================================
SEO LOCAL
====================================================================

- title: "${lead.name} — ${typeLabel}${neighborhood ? ` em ${neighborhood}` : ''}${city ? `, ${city}` : ''}"
- description: "${lead.editorialSummary ?? `${typeLabel} com nota ${lead.rating?.toFixed(1) ?? ''} ⭐ e ${lead.userRatingCount.toLocaleString('pt-BR')} avaliações no Google.${neighborhood ? ` Em ${neighborhood}` : ''}.`}"

====================================================================
REQUISITOS TÉCNICOS
====================================================================

- React + Tailwind CSS + Lucide Icons
- Mobile-First absoluto
- Componentização limpa
- Código moderno e pronto para produção
- Performance otimizada
- ZERO imagens geradas por IA
`;
}

// ─── Briefing individual (TXT) ────────────────────────────────────────────────

export function exportLeadBriefing(lead: Lead, classified?: ClassifiedPhotos): void {
  const prompt   = generateLovablePrompt(lead, classified);
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
