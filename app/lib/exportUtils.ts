import type { Lead } from '../types';

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
