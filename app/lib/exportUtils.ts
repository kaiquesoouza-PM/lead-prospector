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

  const facadeUrl     = classified?.facade ?? null;
  const hasFoodPhotos = (classified?.food?.length ?? 0) > 0;
  const foodPhotoList = classified?.food ?? [];
  const interiorList  = classified?.interior ?? [];

  // Mapeamento de fotos de pratos para cards do cardápio
  const foodPhotoMapping = hasFoodPhotos
    ? foodPhotoList.map((url, i) => `   - item ${i + 1}: "${url}"`).join('\n')
    : '';

  return `Atue como um Desenvolvedor Front-end React Sênior, UI/UX Designer, Diretor Criativo e Especialista em Branding Digital focado no nicho de gastronomia premium.

Crie uma SPA (Single Page Application) sofisticada, responsiva e orientada para conversão em React + Tailwind CSS + Lucide Icons para:

**${lead.name}** — ${typeLabel}${neighborhood ? ` · ${neighborhood}` : ''}${city ? `, ${city}` : ''}
Nota Google: ${lead.rating?.toFixed(1) ?? '—'} ⭐ (${lead.userRatingCount.toLocaleString('pt-BR')} avaliações)${lead.editorialSummary ? `\nDescrição: "${lead.editorialSummary}"` : ''}${serviceAttrs ? `\nServiços: ${serviceAttrs}` : ''}

====================================================================
⚠️ REGRA ABSOLUTA — USO OBRIGATÓRIO DAS FOTOS REAIS
====================================================================

${hasRealPhotos
  ? `FOTOS REAIS DO ESTABELECIMENTO — ${classified!.all.length} imagens extraídas do Google Places API.
${classified!.source === 'vision'
  ? '📸 Classificadas por Google Cloud Vision AI: fachada, interior e pratos identificados com precisão.'
  : '📍 Classificadas por posição (Vision AI indisponível).'}

MAPEAMENTO OBRIGATÓRIO — cada foto tem destino fixo no layout:
┌─────────────┬────────────────────────────────────────────────────────────┐
│ CATEGORIA   │ ONDE USAR                                                  │
├─────────────┼────────────────────────────────────────────────────────────┤
│ facade      │ Hero Section (background) + análise de paleta/logo         │
│ interior[]  │ Seção "Sobre" + Galeria de Ambiente                        │
│ food[]      │ Cards do Cardápio (imagem real de cada prato)              │
│ all[]       │ Galeria Completa (lightbox)                                │
└─────────────┴────────────────────────────────────────────────────────────┘

É TERMINANTEMENTE PROIBIDO:
❌ Usar imagens geradas por IA em qualquer parte do site
❌ Usar imagens do Unsplash, Pexels ou qualquer banco de imagens
❌ Substituir ou misturar estas URLs por qualquer outra imagem
❌ Criar placeholders ou "imagens de exemplo"

Use cada URL EXATAMENTE onde indicado, sem modificação.`
  : `⚠️ FOTOS NÃO DISPONÍVEIS NESTE PROMPT.
NÃO gere imagens por IA. NÃO use Unsplash.
Deixe todos os campos de imagem com src="" e comentário "// foto real pendente".
O cliente fornecerá as fotos reais após a entrega.`}

====================================================================
MOCK DATA — COLE NO TOPO DO ARQUIVO
====================================================================

\`\`\`javascript
${mockData}
\`\`\`

====================================================================
${hasRealPhotos && facadeUrl
  ? `ANÁLISE DA FACHADA — IDENTIDADE VISUAL COMPLETA
====================================================================

URL DA FACHADA (foto classificada pela Vision AI):
→ ${facadeUrl}

Analise esta imagem e execute os 3 passos abaixo ANTES de escrever qualquer linha de CSS:

━━━ PASSO 1 — EXTRAÇÃO DA PALETA DE CORES ━━━━━━━━━━━━━━━━━━━━━━━━

Identifique na fachada:
  a) Cor dominante (fundo da fachada, parede, toldo)
     → usar como --color-primary no CSS
  b) Cor de destaque (letreiro, detalhe, moldura)
     → usar como --color-accent (botões, CTAs, hover)
  c) Tom do texto legível sobre o fundo
     → usar como --color-text
  d) Temperatura da luz (quente = amarelado, fria = azulado, neutra)
     → influencia o mood geral e o overlay do Hero

Declare as variáveis no :root antes de qualquer componente:
  :root {
    --color-primary:    /* extraído da fachada */;
    --color-accent:     /* extraído da fachada */;
    --color-text:       /* extraído da fachada */;
    --color-bg:         /* variação suave do primary */;
  }

━━━ PASSO 2 — LEITURA DO ESTILO ARQUITETÔNICO ━━━━━━━━━━━━━━━━━━━━

Identifique o estilo e aplique a tipografia correspondente:
  • Moderno / industrial / minimalista → fonte Sans-serif bold (ex: Inter, Sora)
  • Rústico / artesanal / wood sign   → fonte Serif ou Script (ex: Playfair, Lora)
  • Sofisticado / clássico / mármores → Serif elegante (ex: Cormorant, EB Garamond)
  • Jovem / colorido / descolado       → Sans-serif arredondada (ex: Nunito, Poppins)
  • Japonês / étnico / temático       → fonte temática + elementos visuais compatíveis

━━━ PASSO 3 — RECRIAÇÃO DO LOGO / LETREIRO ━━━━━━━━━━━━━━━━━━━━━━━

Procure na fachada o letreiro, placa ou logomarca do estabelecimento.

SE identificar o logo/letreiro na imagem:
  → Recrie-o como componente SVG inline
  → Copie EXATAMENTE as cores, o estilo tipográfico e a proporção
  → Se houver símbolo ou ícone junto ao nome, recrie-o também em SVG
  → Este SVG é o logo oficial do site — use em Navbar e Footer

SE não identificar logo na imagem:
  → Crie uma logo tipográfica SVG condizente com o estilo da fachada
  → Use as cores e a tipografia extraídas nos passos 1 e 2
  → O nome "${lead.name}" deve ser a âncora visual da logo

RESULTADO: toda a identidade visual do site (cores, tipografia, logo)
deve ser DERIVADA desta análise da fachada — não inventada.

====================================================================`
  : `LOGO E BRANDING (sem foto de fachada disponível)
====================================================================

Crie uma LOGO TIPOGRÁFICA em SVG para "${lead.name}":
${lead.primaryType === 'restaurant' || lead.primaryType === 'pizza_restaurant'
  ? '→ Serif elegante (Playfair Display) — transmite tradição e sofisticação'
  : lead.primaryType === 'hamburger_restaurant' || lead.primaryType === 'fast_food_restaurant'
  ? '→ Sans-serif bold (Sora ou Barlow Condensed) — moderna e urbana'
  : lead.primaryType === 'cafe' || lead.primaryType === 'bakery' || lead.primaryType === 'brunch_restaurant'
  ? '→ Serif ou Script orgânica (Lora) — aconchegante e artesanal'
  : lead.primaryType === 'bar' || lead.primaryType === 'juice_bar'
  ? '→ Sans-serif condensada bold — cinematográfica e impactante'
  : '→ Serif elegante — gastronomia premium'}

====================================================================`}
MAPEAMENTO DETALHADO DAS FOTOS NO LAYOUT
====================================================================
${hasRealPhotos ? `
FACHADA (1 foto — Vision AI identificou como exterior do estabelecimento):
→ "${facadeUrl}"
   • Hero Section: <img src="{facade}" /> com overlay escuro gradiente
   • Navbar: usar para extrair paleta (não exibir como img)
   • NÃO usar em nenhuma outra seção

INTERIOR / AMBIENTE (${interiorList.length} foto${interiorList.length !== 1 ? 's' : ''} — Vision AI identificou como espaço interno):
${interiorList.length > 0
  ? interiorList.map((url, i) => `→ interior[${i}]: "${url}"\n   • ${i === 0 ? 'Seção "Sobre" (foto lateral) + Galeria de Ambiente' : `Galeria de Ambiente — posição ${i + 1}`}`).join('\n')
  : '→ (nenhuma foto de interior identificada — omitir galeria de ambiente)'}

PRATOS / PRODUTOS (${foodPhotoList.length} foto${foodPhotoList.length !== 1 ? 's' : ''} — Vision AI identificou como alimento/prato):
${hasFoodPhotos
  ? foodPhotoList.map((url, i) => `→ food[${i}]: "${url}"\n   • Card do cardápio — item ${i + 1} (imagem real do prato)`).join('\n')
  : '→ (nenhuma foto de prato identificada — usar emojis nos cards do cardápio)'}
` : '(fotos não disponíveis — campos de imagem em branco)'}
====================================================================
ESTRUTURA DA PÁGINA
====================================================================

1. NAVBAR PREMIUM
   - Logo SVG (extraída da fachada ou criada conforme branding)
   - Links: Início | Cardápio | Avaliações | Galeria | Contato
   - Botão WhatsApp fixo no topo direito (verde #25D366)
   - Menu hamburguer animado no mobile

2. HERO SECTION FULL SCREEN
   - Background OBRIGATÓRIO: restaurantData.photos.facade
     → src="${facadeUrl ?? '(pendente)'}"
     → object-fit: cover, object-position: center
     → overlay: gradiente escuro de baixo para cima (rgba 0,0,0, 0.5→0.7)
   - Headline emocional forte (gerada com base no nome + tipo + bairro)
   - Badge dinâmico: opening_hours.open_now
     → true  = "● Aberto Agora" (verde)
     → false = "● Fechado no Momento" (vermelho)
   - Nota Google: ${lead.rating?.toFixed(1) ?? '4.5'} ⭐ · ${lead.userRatingCount.toLocaleString('pt-BR')} avaliações
   - CTA primário: "Falar no WhatsApp" → ${waUrl}
   - CTA secundário: "Ver Cardápio" (âncora scroll suave até #cardapio)
   - Animações de entrada: fade-in + slide-up (staggered, 100ms delay)

3. SOBRE O ESTABELECIMENTO
   - Texto: restaurantData.description + serviços
   - Foto de ambiente OBRIGATÓRIA: restaurantData.photos.interior[0]
     → src="${interiorList[0] ?? '(pendente)'}"
   - Layout: texto à esquerda, foto à direita (mobile: empilhado)

4. GALERIA DE AMBIENTE
   - Usar SOMENTE: restaurantData.photos.interior[]
${interiorList.length > 0
  ? interiorList.map((u, i) => `   - interior[${i}]: "${u}"`).join('\n')
  : '   - (sem fotos de interior — omitir esta seção)'}
   - Grid 2-3 colunas, aspect-ratio: 4/3, hover: brightness(1.1) + scale(1.02)

5. CARDÁPIO
${hasFoodPhotos
  ? `   FOTOS REAIS DE PRATOS disponíveis (${foodPhotoList.length} itens classificados pela Vision AI):
   Use cada URL abaixo como <img> no card do item correspondente do cardápio:
${foodPhotoMapping}

   REGRA: cada card de prato deve ter:
     → <img src="{food[i]}" /> como thumbnail (objeto real identificado pela IA)
     → Nome fictício premium compatível com "${typeLabel}"
     → Descrição sensorial curta (2 linhas)
     → Preço compatível com o segmento ${priceLevel || 'moderado'}
     → NÃO usar ícones Lucide ou emojis como substituto de foto quando food[] disponível`
  : `   Nenhuma foto de prato identificada pela Vision AI.
   Gere cardápio fictício premium para "${typeLabel}":
     → Use emojis ou ícones Lucide como visual dos itens
     → Nomes, descrições e preços compatíveis com o nicho ${priceLevel || ''}
     → NÃO use imagens de IA nem Unsplash`}
   - Tabs por categoria (ex: Entradas | Principais | Bebidas | Sobremesas)
   - Filtros visuais + transições suaves entre categorias

6. PROVA SOCIAL — GOOGLE REVIEWS
   - Título: "O que nossos clientes dizem no Google"
   - Selo oficial: ${lead.rating?.toFixed(1) ?? '4.5'} ⭐ · ${lead.userRatingCount.toLocaleString('pt-BR')} avaliações · ícone G do Google
   - Carrossel/grid com restaurantData.reviews[]
   - Cada card: avatar (profile_photo_url), nome, estrelas douradas, texto
   - Auto-play suave no desktop

7. GALERIA COMPLETA
   - Usar TODAS: restaurantData.photos.all[] (${classified?.all.length ?? 0} fotos)
${classified && classified.all.length > 0
  ? classified.all.map((u, i) => `   - all[${i}]: "${u}"`).join('\n')
  : '   - (aguardar fotos reais)'}
   - Grid masonry responsivo (2 col mobile, 3-4 col desktop)
   - Lightbox com navegação prev/next, download e zoom

8. HORÁRIOS DE FUNCIONAMENTO
   - Lista com opening_hours.weekday_text[]
   - Badge dinâmico open_now (recalculado a cada render)
   - Destaque visual no dia atual da semana

9. LOCALIZAÇÃO & CONTATO
   - Endereço: "${lead.address}"
   - Telefone clicável: tel:${lead.phone ? '+55' + lead.phone.replace(/\D/g, '') : '[INSERIR]'}
   - Botão "Como Chegar" → ${mapsUrl}
   - Embed do Google Maps (iframe com as coordinates do mock data)
   - Ícones de redes sociais (Instagram, Facebook, WhatsApp) — href="#" por enquanto

10. CTA FINAL
    - Seção dark com overlay cinematográfico
    - Headline: "Venha nos visitar" ou similar
    - Botão WhatsApp grande e destacado → ${waUrl}

11. FOOTER PREMIUM
    - Logo, endereço completo, horários resumidos
    - Links rápidos + redes sociais
    - "© ${new Date().getFullYear()} ${lead.name}. Todos os direitos reservados."

====================================================================
BOTÃO WHATSAPP FLUTUANTE
====================================================================

Fixo canto inferior direito em TODAS as telas (z-index: 9999).
Link: ${waUrl}
Cor: #25D366 (verde WhatsApp oficial)
Ícone: SVG do WhatsApp
Animação: pulse suave a cada 3s (chama atenção sem irritar)
Tooltip ao hover: "Fale conosco agora"

====================================================================
COPYWRITING
====================================================================

NUNCA use textos genéricos como "Lorem ipsum" ou "Bem-vindo ao nosso site".
Tom: sofisticado, humano, sensorial e gastronômico.
Headlines devem despertar desejo e criar antecipação.
Descrições de pratos: ingredientes + textura + aroma + apresentação.
Sem menção a "reservas" ou "agendamento".
Botões de CTA: imperativos diretos ("Pedir agora", "Ver cardápio", "Falar conosco").

====================================================================
SKELETON SCREEN
====================================================================

Exibir por 1.5s antes de renderizar o conteúdo:
- Shimmer effect (animação left-to-right) em todos os blocos
- Manter o layout exato do site (sem salto de conteúdo ao carregar)

====================================================================
SEO LOCAL
====================================================================

<title>${lead.name} — ${typeLabel}${neighborhood ? ` em ${neighborhood}` : ''}${city ? `, ${city}` : ''}</title>
<meta name="description" content="${lead.editorialSummary ?? `${typeLabel} com nota ${lead.rating?.toFixed(1) ?? ''} ⭐ e ${lead.userRatingCount.toLocaleString('pt-BR')} avaliações no Google.${neighborhood ? ` Em ${neighborhood}` : ''}.`}" />
<meta property="og:image" content="${facadeUrl ?? ''}" />

====================================================================
REQUISITOS TÉCNICOS
====================================================================

- React + Tailwind CSS + Lucide Icons
- Mobile-First absoluto (breakpoints: sm 640 | md 768 | lg 1024 | xl 1280)
- Componentização limpa (um arquivo por seção)
- Smooth scroll nativo (scroll-behavior: smooth)
- Imagens com loading="lazy" e decoding="async"
- Código pronto para produção, sem TODOs ou comentários desnecessários
- ZERO imagens geradas por IA — apenas as URLs reais do mock data
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
