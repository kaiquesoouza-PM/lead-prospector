// ─── Lead Profile (Narrative Segmentation) ───────────────────────────────────

/**
 * consolidated  → ≥100 avaliações: negócio movimentado, pitch de profissionalização
 * growing       → 20–99 avaliações: em crescimento, pitch de escala
 * low-visibility→ <20  avaliações: pouco conhecido, pitch de visibilidade
 */
export type LeadProfile = 'consolidated' | 'growing' | 'low-visibility';

export interface ProfileInfo {
  type:         LeadProfile;
  label:        string;
  color:        string;        // Tailwind classes
  pitch:        string;        // argumento de venda principal
  strategy:     string;        // abordagem recomendada
  websiteFocus: string[];      // seções prioritárias para o site
}

export const PROFILE_MAP: Record<LeadProfile, ProfileInfo> = {
  consolidated: {
    type:     'consolidated',
    label:    'Negócio Consolidado',
    color:    'bg-blue-950/50 text-blue-400 border border-blue-800/40',
    pitch:    'Seu negócio já tem reconhecimento — um site profissional vai converter esse volume de clientes em receita recorrente online.',
    strategy: 'Focar em profissionalização, reservas online, cardápio digital e gestão da reputação.',
    websiteFocus: ['Cardápio digital interativo', 'Sistema de reservas', 'Galeria de fotos profissional', 'Depoimentos e avaliações', 'Programa de fidelidade'],
  },
  growing: {
    type:     'growing',
    label:    'Em Crescimento',
    color:    'bg-amber-950/50 text-amber-400 border border-amber-800/40',
    pitch:    'Com um bom volume de clientes, falta só a presença digital para escalar de vez.',
    strategy: 'Combinar geração de novos clientes com fidelização dos atuais.',
    websiteFocus: ['Página "Sobre nós" com história', 'Cardápio com fotos', 'WhatsApp direto', 'Localização e horários', 'Redes sociais integradas'],
  },
  'low-visibility': {
    type:     'low-visibility',
    label:    'Baixa Visibilidade',
    color:    'bg-red-950/50 text-red-400 border border-red-800/40',
    pitch:    'A ausência de site é o principal motivo pelo qual novos clientes não chegam até você. Quem busca online, não te encontra.',
    strategy: 'Focar em SEO local, Google Meu Negócio e presença básica para gerar descoberta.',
    websiteFocus: ['SEO local (aparecer no Google)', 'Cardápio simples', 'Botão WhatsApp', 'Endereço e mapa', 'Horário de funcionamento'],
  },
};

// ─── Place Types ────────────────────────────────────────────────────────────

export type PlaceType =
  | 'restaurant'
  | 'bar'
  | 'bakery'
  | 'cafe'
  | 'fast_food_restaurant'
  | 'hamburger_restaurant'
  | 'pizza_restaurant'
  | 'sandwich_shop'
  | 'meal_takeaway'
  | 'ice_cream_shop'
  | 'juice_bar'
  | 'brunch_restaurant';

export type LeadFlag =
  | 'no-website'
  | 'few-reviews'
  | 'few-photos'
  | 'zero-reviews'       // 0 avaliações — negócio fantasma ou muito pequeno
  | 'too-popular'        // 5 000+ avaliações — provavelmente não precisa de site
  | 'possible-delivery'; // pouquíssimas avaliações — possivelmente só delivery

// ─── Raw Google Places API (New) shape ───────────────────────────────────────

export interface GooglePlacePhoto {
  name: string;
  widthPx: number;
  heightPx: number;
}

export interface GooglePlace {
  id: string;
  displayName: { text: string; languageCode: string };
  formattedAddress: string;
  nationalPhoneNumber?: string;
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
  photos?: GooglePlacePhoto[];
  location: { latitude: number; longitude: number };
  googleMapsUri?: string;
  primaryType?: string;
  // Menu-related
  priceLevel?: string;
  editorialSummary?: { text: string; languageCode: string };
  servesBeer?: boolean;
  servesWine?: boolean;
  servesBreakfast?: boolean;
  servesLunch?: boolean;
  servesDinner?: boolean;
  servesBrunch?: boolean;
  servesVegetarianFood?: boolean;
}

// ─── Processed Lead ──────────────────────────────────────────────────────────

export interface Lead {
  id: string;
  name: string;
  address: string;
  phone?: string;
  rating?: number;
  userRatingCount: number;
  website?: string;
  photoCount: number;
  location: { lat: number; lng: number };
  googleMapsUri?: string;
  primaryType?: string;
  // computed
  hasWebsite: boolean;
  hasFewReviews: boolean;
  hasFewPhotos: boolean;
  /** 0–100: higher = better prospecting opportunity */
  leadScore: number;
  flags: LeadFlag[];
  /** Narrative profile for sales approach */
  profile: LeadProfile;
  /**
   * Photo reference strings from the Places API (New).
   * Format: "places/{place_id}/photos/{photo_reference}"
   * Use /api/photos to resolve these into actual image URLs.
   */
  photoRefs: string[];
  // Menu & service attributes
  priceLevel?:          string;
  editorialSummary?:    string;
  servesBreakfast?:     boolean;
  servesLunch?:         boolean;
  servesDinner?:        boolean;
  servesBrunch?:        boolean;
  servesBeer?:          boolean;
  servesWine?:          boolean;
  servesVegetarianFood?: boolean;
}

// ─── Search Parameters ───────────────────────────────────────────────────────

export interface SearchParams {
  lat: number;
  lng: number;
  /** radius in metres (max 50 000) */
  radius: number;
  types: PlaceType[];
}

// ─── UI State ────────────────────────────────────────────────────────────────

export interface SearchState {
  isLoading: boolean;
  leads: Lead[];
  filteredLeads: Lead[];
  error: string | null;
  center: { lat: number; lng: number } | null;
  radius: number;
}
