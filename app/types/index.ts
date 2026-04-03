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

export type LeadFlag = 'no-website' | 'few-reviews' | 'few-photos';

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
