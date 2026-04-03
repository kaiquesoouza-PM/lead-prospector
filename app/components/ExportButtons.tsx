'use client';

import { exportToCSV, exportToJSON } from '../lib/exportUtils';
import type { Lead } from '../types';

interface ExportButtonsProps {
  leads: Lead[];
  disabled?: boolean;
}

export default function ExportButtons({ leads, disabled }: ExportButtonsProps) {
  const count = leads.length;

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-500 mr-1">Exportar {count} leads:</span>

      <button
        onClick={() => exportToCSV(leads)}
        disabled={disabled || count === 0}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <svg className="w-4 h-4 text-green-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        </svg>
        CSV
      </button>

      <button
        onClick={() => exportToJSON(leads)}
        disabled={disabled || count === 0}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        </svg>
        JSON
      </button>
    </div>
  );
}
