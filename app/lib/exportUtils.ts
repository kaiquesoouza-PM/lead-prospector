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

/** Extrai bairro e cidade de um endereço brasileiro. */
function parseAddress(address: string): { neighborhood: string; city: string } {
  // Formato: "Rua X, 123 - Bairro, Cidade - Estado, CEP"
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
 */
export function generateLovablePrompt(lead: Lead, resolvedPhotoUrls?: string[]): string {
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

  // ── Fotos ──────────────────────────────────────────────────────────────────
  const hasRealPhotos = resolvedPhotoUrls && resolvedPhotoUrls.length > 0;
  const photoNote = hasRealPhotos
    ? `// ✅ ${resolvedPhotoUrls!.length} fotos REAIS do Google Places incluídas — use photos[0] como fachada principal`
    : '// ⚠️ Fotos placeholder — substitua pelas fotos reais do estabelecimento';
  const photoEntries = hasRealPhotos
    ? resolvedPhotoUrls!.map((url) => `    "${url}"`).join(',\n')
    : [
        '    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200"',
        '    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800"',
        '    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800"',
        '    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800"',
        '    "https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=800"',
      ].join(',\n');

  // ── Mock Data ──────────────────────────────────────────────────────────────
  const mockData = `const restaurantData = {
  // ── Identidade ────────────────────────────────────────────────────────────
  name:         "${lead.name}",
  category:     "${typeLabel}",
  description:  "${lead.editorialSummary ?? `${typeLabel} localizado(a) em ${neighborhood || lead.address}. Venha nos visitar!`}",
  ${priceLevel ? `priceLevel:   "${priceLevel}",` : ''}
  ${serviceAttrs ? `services:     "${serviceAttrs}",` : ''}

  // ── Contato & Localização ─────────────────────────────────────────────────
  phone:        "${lead.phone ?? ''}",
  whatsapp:     "${whatsapp ? '55' + whatsapp : ''}",
  address:      "${lead.address}",
  neighborhood: "${neighborhood}",
  city:         "${city}",
  website:      "",  // a ser preenchido após criação do site
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

  ${photoNote}
  photos: [
${photoEntries}
  ],

  // ── Cardápio ─────────────────────────────────────────────────────────────
  // SE este array estiver VAZIO, gere automaticamente um cardápio fictício
  // premium compatível com o nicho "${typeLabel}".
  // SE possuir dados reais, renderize-os dinamicamente.
  menu_items: []
};`;

  return `Atue como um Desenvolvedor Front-end React Sênior, UI/UX Designer, Diretor Criativo e Especialista em Branding Digital focado no nicho de gastronomia premium.

Sua missão é criar uma aplicação web Single Page Application (SPA) altamente sofisticada, responsiva e orientada para conversão, utilizando React + Tailwind CSS + Lucide Icons.

O website é para: **${lead.name}** — ${typeLabel}${neighborhood ? ` no bairro ${neighborhood}` : ''}${city ? `, ${city}` : ''}.${lead.editorialSummary ? `\nDescrição do Google: "${lead.editorialSummary}"` : ''}${serviceAttrs ? `\nServiços: ${serviceAttrs}` : ''}${priceLevel ? `\nFaixa de preço: ${priceLevel}` : ''}
Nota Google: ${lead.rating?.toFixed(1) ?? '—'} ⭐ (${lead.userRatingCount.toLocaleString('pt-BR')} avaliações)

O resultado final NÃO deve parecer um template genérico. Deve parecer criado por uma agência digital premium especializada em restaurantes.

====================================================================
MOCK DATA — USE EXATAMENTE ESTES DADOS NO TOPO DO CÓDIGO
====================================================================

\`\`\`javascript
${mockData}
\`\`\`

====================================================================
OBJETIVO PRINCIPAL
====================================================================

Transformar os dados do restaurantData acima em uma experiência digital premium.

O site deve:
- transmitir desejo gastronômico imediato;
- gerar vontade de visitar o local;
- parecer sofisticado e cinematográfico;
- destacar prova social (${lead.userRatingCount.toLocaleString('pt-BR')} avaliações, nota ${lead.rating?.toFixed(1) ?? '—'});
- maximizar conversão via WhatsApp: ${waUrl}

====================================================================
INTELIGÊNCIA VISUAL BASEADA NA FACHADA
====================================================================

Utilize automaticamente photos[0] como referência visual principal (fachada).
Analise visualmente e defina automaticamente:
- paleta principal do site baseada nas cores da fachada;
- temperatura visual (quente/fria/neutra);
- estilo tipográfico compatível com o nível do estabelecimento;
- intensidade do overlay da Hero Section.

====================================================================
LOGO E BRANDING DINÂMICO
====================================================================

NÃO use imagem estática de logo. Crie uma LOGO TIPOGRÁFICA em SVG ou texto estilizado.

Para "${typeLabel}":
${lead.primaryType === 'restaurant' || lead.primaryType === 'pizza_restaurant' ? '→ Serif elegante, transmitindo tradição e sofisticação' : ''}
${lead.primaryType === 'hamburger_restaurant' || lead.primaryType === 'fast_food_restaurant' ? '→ Sans-serif forte e impactante, moderna e urbana' : ''}
${lead.primaryType === 'cafe' || lead.primaryType === 'bakery' || lead.primaryType === 'brunch_restaurant' ? '→ Tipografia orgânica/artesanal, aconchegante' : ''}
${lead.primaryType === 'bar' || lead.primaryType === 'juice_bar' ? '→ Tipografia cinematográfica, noturna e impactante' : ''}
${!lead.primaryType ? '→ Serif elegante compatível com gastronomia premium' : ''}

====================================================================
ESTRUTURA DA PÁGINA
====================================================================

1. NAVBAR PREMIUM
   - Logo tipográfica à esquerda
   - Links: Início | Cardápio | Avaliações | Galeria | Contato
   - Botão CTA WhatsApp no topo direito
   - Menu hamburguer mobile

2. HERO SECTION FULL SCREEN CINEMATOGRÁFICA
   - Background: photos[0] (fachada do estabelecimento)
   - Overlay escuro elegante
   - Headline emocional forte (baseada no nome e nicho)
   - Subheadline sofisticada
   - Badge dinâmico: opening_hours.open_now → "Aberto Agora" (verde) ou "Fechado" (vermelho)
   - Nota Google: ${lead.rating?.toFixed(1) ?? '4.5'} ⭐ com ${lead.userRatingCount.toLocaleString('pt-BR')} avaliações
   - CTA principal: WhatsApp → ${waUrl}
   - CTA secundário: "Ver Cardápio" (scroll suave)
   - Micro animações de entrada (fade + slide up)

3. SOBRE O ESTABELECIMENTO
   - Texto: restaurantData.description
   - Atributos de serviço: restaurantData.services
   - Visual premium com foto lateral

4. DESTAQUE DA EXPERIÊNCIA / AMBIENTE
   - Grid com photos[1], photos[2], photos[3]
   - Texto emocional sobre a atmosfera
   - Efeito parallax ou zoom suave no hover

5. CARDÁPIO DINÂMICO (LÓGICA HÍBRIDA OBRIGATÓRIA)
   SE menu_items.length > 0:
     - Renderizar itens reais do cardápio
     - Mostrar: nome, descrição, preço em R$, imagem, categoria
   SE menu_items estiver vazio (caso atual):
     - Gerar automaticamente cardápio fictício premium para "${typeLabel}"
     - Criar categorias, nomes, descrições e preços compatíveis
     - Usar imagens do Unsplash relacionadas ao nicho
   - Tabs interativas por categoria
   - Filtros visuais
   - Transições suaves

6. PROVA SOCIAL — GOOGLE REVIEWS
   - Título: "O que nossos clientes dizem no Google"
   - Selo: ${lead.rating?.toFixed(1) ?? '4.5'} ⭐ · ${lead.userRatingCount.toLocaleString('pt-BR')} avaliações · ícone G do Google
   - Carrossel ou grid com reviews do restaurantData.reviews[]
   - Cada card: avatar (profile_photo_url), nome, estrelas douradas, texto

7. GALERIA DE FOTOS
   - Grid masonry responsivo com todas as fotos de restaurantData.photos[]
   - Hover com zoom suave e overlay elegante
   - Lightbox ao clicar (navegação prev/next, botão fechar)

8. HORÁRIOS DE FUNCIONAMENTO
   - Lista de opening_hours.weekday_text[]
   - Badge dinâmico open_now
   - Design clean e legível

9. LOCALIZAÇÃO & CONTATO
   - Endereço: "${lead.address}"
   - Botão telefone: tel:${lead.phone ? '+55' + lead.phone.replace(/\D/g, '') : '[TELEFONE]'}
   - Botão "Como Chegar": ${mapsUrl}
   - Ícones redes sociais (Instagram, Facebook, TikTok) — links em branco
   - Mapa embed (iframe Google Maps ou link visual)

10. CTA FINAL
    - Seção dark cinematográfica
    - Headline de conversão
    - Botão WhatsApp grande: ${waUrl}

11. FOOTER PREMIUM
    - Logo, endereço, horários resumidos
    - Links legais
    - Redes sociais

====================================================================
BOTÃO WHATSAPP FLUTUANTE
====================================================================

Fixo no canto inferior direito em TODAS as telas.
Link: ${waUrl}
Pulse animation suave para chamar atenção.

====================================================================
COPYWRITING (OBRIGATÓRIO)
====================================================================

NUNCA use textos genéricos.
Use linguagem sensorial e gastronômica premium.
Headlines devem despertar desejo e emoção.
Tom: sofisticado, humano, convidativo.

Exemplos de headlines para "${lead.name}":
- "Uma experiência que vai além do sabor"
- "Onde cada prato conta uma história"
- "O melhor da gastronomia, a dois passos de você"

====================================================================
SKELETON SCREEN
====================================================================

Simule 1.5s de loading com skeleton animado (shimmer effect) antes de renderizar os dados.

====================================================================
SEO LOCAL AUTOMÁTICO
====================================================================

Gerar meta tags:
- title: "${lead.name} — ${typeLabel}${neighborhood ? ` em ${neighborhood}` : ''}${city ? `, ${city}` : ''}"
- description: "${lead.editorialSummary ?? `${typeLabel} com ${lead.rating?.toFixed(1) ?? ''}⭐ e ${lead.userRatingCount.toLocaleString('pt-BR')} avaliações no Google. ${neighborhood ? `Localizado em ${neighborhood}` : ''}.`}"
- keywords: "${typeLabel.toLowerCase()}, ${neighborhood}, ${city}, gastronomia, restaurante"

====================================================================
REQUISITOS TÉCNICOS FINAIS
====================================================================

- React + Tailwind CSS + Lucide Icons
- Componentização limpa e reutilizável
- Mobile-First absoluto
- Transições suaves em todos os elementos interativos
- Código organizado, moderno e pronto para produção
- Performance otimizada
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
