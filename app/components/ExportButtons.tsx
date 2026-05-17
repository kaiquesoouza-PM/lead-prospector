'use client';

import { exportToCSV, exportToJSON, exportAllBriefings } from '../lib/exportUtils';
import type { Lead } from '../types';

interface ExportButtonsProps {
  leads: Lead[];
  disabled?: boolean;
}

export default function ExportButtons({ leads, disabled }: ExportButtonsProps) {
  const count = leads.length;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 mr-1">Exportar {count} leads:</span>

      <button
        onClick={() => exportToCSV(leads)}
        disabled={disabled || count === 0}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/[0.08] bg-[#1a1a1a] text-xs font-medium text-gray-400 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        </svg>
        CSV
      </button>

      <button
        onClick={() => exportToJSON(leads)}
        disabled={disabled || count === 0}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/[0.08] bg-[#1a1a1a] text-xs font-medium text-gray-400 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        </svg>
        JSON
      </button>

      {(() => {
        const noWebsite = leads.filter((l) => !l.hasWebsite);
        if (noWebsite.length === 0) return null;
        return (
          <>
            <div className="w-px h-4 bg-white/10" />
            <button
              onClick={() => exportAllBriefings(noWebsite)}
              disabled={disabled}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/[0.08] bg-[#1a1a1a] text-xs font-medium text-gray-400 hover:text-white hover:border-purple-500/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title={`Exportar prompts Lovable dos ${noWebsite.length} leads sem website`}
            >
              <svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              Prompts Lovable ({noWebsite.length})
            </button>
          </>
        );
      })()}
    </div>
  );
}
