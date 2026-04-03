'use client';

import { APIProvider, Map, AdvancedMarker, Pin, Circle } from '@vis.gl/react-google-maps';
import type { Lead } from '../types';

interface MapViewProps {
  center: { lat: number; lng: number };
  radius: number;
  leads: Lead[];
  selectedLeadId?: string;
  onSelectLead?: (lead: Lead) => void;
}

/** Marker color depends on lead score */
function markerColors(lead: Lead): { background: string; borderColor: string; glyphColor: string } {
  if (lead.leadScore >= 70) {
    return { background: '#16a34a', borderColor: '#15803d', glyphColor: '#fff' }; // green — hot lead
  }
  if (lead.leadScore >= 40) {
    return { background: '#f59e0b', borderColor: '#d97706', glyphColor: '#fff' }; // amber — warm
  }
  return { background: '#6b7280', borderColor: '#4b5563', glyphColor: '#fff' };   // gray — cold
}

export default function MapView({
  center,
  radius,
  leads,
  selectedLeadId,
  onSelectLead,
}: MapViewProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden" style={{ height: 480 }}>
      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={center}
          center={center}
          defaultZoom={13}
          mapId="lead-prospector-map"
          disableDefaultUI={false}
          style={{ width: '100%', height: '100%' }}
        >
          {/* Search radius circle */}
          <Circle
            center={center}
            radius={radius}
            strokeColor="#16a34a"
            strokeOpacity={0.6}
            strokeWeight={2}
            fillColor="#16a34a"
            fillOpacity={0.08}
          />

          {/* Center pin */}
          <AdvancedMarker position={center} title="Centro da busca">
            <Pin
              background="#1d4ed8"
              borderColor="#1e3a8a"
              glyphColor="#fff"
              scale={1.2}
            />
          </AdvancedMarker>

          {/* Lead markers */}
          {leads.map((lead) => {
            const colors  = markerColors(lead);
            const isActive = lead.id === selectedLeadId;

            return (
              <AdvancedMarker
                key={lead.id}
                position={lead.location}
                title={lead.name}
                onClick={() => onSelectLead?.(lead)}
              >
                <Pin
                  background={colors.background}
                  borderColor={isActive ? '#000' : colors.borderColor}
                  glyphColor={colors.glyphColor}
                  scale={isActive ? 1.4 : 1}
                />
              </AdvancedMarker>
            );
          })}
        </Map>
      </APIProvider>

      {/* Legend */}
      <div className="px-4 py-2 flex items-center gap-4 text-xs text-gray-500 border-t border-gray-100">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-green-600"></span>
          Score alto (≥70)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-amber-500"></span>
          Score médio (≥40)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-gray-400"></span>
          Score baixo
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-blue-600"></span>
          Centro da busca
        </span>
      </div>
    </div>
  );
}
