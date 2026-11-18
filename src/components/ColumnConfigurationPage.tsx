import React, { useState } from 'react';
import { SlidersHorizontal, ArrowUp, ArrowDown, CheckSquare, Square, Eye, FileSpreadsheet, ArrowRight, RotateCcw } from 'lucide-react';
import { ExcelColumnConfig, ReportUploadData } from '../types';
import { cleanString, formatCurrency, parseNumber } from '../utils/excelParser';

interface ColumnConfigurationPageProps {
  reportData: ReportUploadData | null;
  columns: ExcelColumnConfig[];
  onUpdateColumns: (cols: ExcelColumnConfig[]) => void;
  onNext: () => void;
}

export const ColumnConfigurationPage: React.FC<ColumnConfigurationPageProps> = ({
  reportData,
  columns,
  onUpdateColumns,
  onNext,
}) => {
  if (!reportData || !columns.length) {
    return (
      <div className="bg-[#091322] border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
        <SlidersHorizontal className="w-12 h-12 mx-auto mb-3 text-slate-600" />
        <h3 className="text-lg font-bold text-white">No Active Excel Columns</h3>
        <p className="text-xs text-slate-500 mt-1">Please upload a Customer Overdue Excel report first in Step 1.</p>
      </div>
    );
  }

  const handleToggleAll = (field: 'show' | 'includeInWhatsApp' | 'includeInExport', value: boolean) => {
    const updated = columns.map((c) => {
      if (field === 'show') {
        return { ...c, show: value, includeInWhatsApp: value ? c.includeInWhatsApp : false };
      }
      if (c.show) {
        return { ...c, [field]: value };
      }
      return c;
    });
    onUpdateColumns(updated);
  };

  const handleFieldChange = (idx: number, field: keyof ExcelColumnConfig, value: any) => {
    const updated = [...columns];
    updated[idx] = { ...updated[idx], [field]: value };
    onUpdateColumns(updated);
  };

  const handleMove = (idx: number, direction: -1 | 1) => {
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= columns.length) return;
    const updated = [...columns];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;
    // Update orders
    updated.forEach((c, i) => (c.order = i));
    onUpdateColumns(updated);
  };

  const selectedForWhatsApp = columns.filter((c) => c.show && c.includeInWhatsApp);
  const selectedForShow = columns.filter((c) => c.show);

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-[#091322] border border-slate-800 rounded-2xl p-6 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
              <SlidersHorizontal className="w-6 h-6 text-[#c9a227]" />
              <span>Step 2: Column Selection & Display Configuration</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Select which columns appear in the generated WhatsApp PNG image, rename headers, set number formatting & overdue flags.
            </p>
          </div>

          <button
            onClick={onNext}
            className="flex items-center gap-2 bg-[#c9a227] hover:bg-[#e5ba33] text-[#0b2447] font-bold px-5 py-2.5 rounded-xl text-xs shadow-md transition-all shrink-0"
          >
            <span>Continue to Contact Mapping</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Bulk Toggles Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 text-xs font-semibold">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleToggleAll('show', true)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
            >
              Show All Columns
            </button>
            <button
              onClick={() => handleToggleAll('show', false)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
            >
              Show None
            </button>
            <button
              onClick={() => handleToggleAll('includeInWhatsApp', true)}
              className="bg-[#0b2447] hover:bg-[#19376d] text-[#e5ba33] border border-[#c9a227]/40 px-3 py-1.5 rounded-lg transition-colors"
            >
              WhatsApp Select All Shown
            </button>
            <button
              onClick={() => handleToggleAll('includeInExport', true)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
            >
              Excel Export All
            </button>
          </div>

          <div className="text-slate-400">
            Active WhatsApp Image Columns:{' '}
            <span className="text-[#c9a227] font-bold">{selectedForWhatsApp.length}</span> of {columns.length}
          </div>
        </div>

        {/* Configuration Table */}
        <div className="mt-5 overflow-x-auto border border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#0b2447] text-white font-semibold uppercase tracking-wider">
                <th className="py-3 px-3 text-center">Order</th>
                <th className="py-3 px-3">Original Header</th>
                <th className="py-3 px-3">Sample Data</th>
                <th className="py-3 px-3">Display Label (Image & Report)</th>
                <th className="py-3 px-3 text-center">Show</th>
                <th className="py-3 px-3 text-center text-[#e5ba33]">WhatsApp Image</th>
                <th className="py-3 px-3 text-center">Excel</th>
                <th className="py-3 px-3 text-center">1,234.56 Format</th>
                <th className="py-3 px-3 text-center">Σ Total</th>
                <th className="py-3 px-3 text-center text-rose-400">Overdue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 bg-slate-900/50 text-slate-300">
              {columns.map((col, idx) => (
                <tr
                  key={col.id}
                  className={`hover:bg-slate-800/40 transition-colors ${
                    col.includeInWhatsApp ? 'bg-slate-800/20' : ''
                  }`}
                >
                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleMove(idx, -1)}
                        disabled={idx === 0}
                        className="p-1 hover:bg-slate-700 rounded text-slate-400 disabled:opacity-30"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMove(idx, 1)}
                        disabled={idx === columns.length - 1}
                        className="p-1 hover:bg-slate-700 rounded text-slate-400 disabled:opacity-30"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>

                  <td className="py-2.5 px-3 font-medium text-slate-200 whitespace-nowrap">
                    {col.originalHeader}
                  </td>

                  <td className="py-2.5 px-3 font-mono text-slate-400 max-w-[150px] truncate whitespace-nowrap">
                    {cleanString(col.sampleValue) || '—'}
                  </td>

                  <td className="py-2.5 px-3">
                    <input
                      type="text"
                      value={col.label}
                      onChange={(e) => handleFieldChange(idx, 'label', e.target.value)}
                      className="bg-slate-900 border border-slate-700 text-white font-medium px-3 py-1.5 rounded-lg text-xs w-full focus:border-[#c9a227] focus:outline-none"
                    />
                  </td>

                  <td className="py-2.5 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={col.show}
                      onChange={(e) => handleFieldChange(idx, 'show', e.target.checked)}
                      className="w-4 h-4 accent-[#c9a227] cursor-pointer"
                    />
                  </td>

                  <td className="py-2.5 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={col.includeInWhatsApp}
                      disabled={!col.show}
                      onChange={(e) => handleFieldChange(idx, 'includeInWhatsApp', e.target.checked)}
                      className="w-4 h-4 accent-[#c9a227] cursor-pointer disabled:opacity-30"
                    />
                  </td>

                  <td className="py-2.5 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={col.includeInExport}
                      disabled={!col.show}
                      onChange={(e) => handleFieldChange(idx, 'includeInExport', e.target.checked)}
                      className="w-4 h-4 accent-slate-500 cursor-pointer disabled:opacity-30"
                    />
                  </td>

                  <td className="py-2.5 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={col.isAmount}
                      disabled={!col.show}
                      onChange={(e) => handleFieldChange(idx, 'isAmount', e.target.checked)}
                      className="w-4 h-4 accent-indigo-500 cursor-pointer disabled:opacity-30"
                    />
                  </td>

                  <td className="py-2.5 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={col.isGrandTotalSum}
                      disabled={!col.show}
                      onChange={(e) => handleFieldChange(idx, 'isGrandTotalSum', e.target.checked)}
                      className="w-4 h-4 accent-emerald-500 cursor-pointer disabled:opacity-30"
                    />
                  </td>

                  <td className="py-2.5 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={col.isOverdue}
                      disabled={!col.show}
                      onChange={(e) => handleFieldChange(idx, 'isOverdue', e.target.checked)}
                      className="w-4 h-4 accent-rose-500 cursor-pointer disabled:opacity-30"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Columns Preview Table */}
      <div className="bg-[#091322] border border-slate-800 rounded-2xl p-6 shadow-lg">
        <h3 className="font-bold text-white text-base mb-3 flex items-center gap-2">
          <Eye className="w-5 h-5 text-[#c9a227]" />
          <span>Live WhatsApp PNG Image Table Column Order Preview ({selectedForWhatsApp.length} columns)</span>
        </h3>

        {selectedForWhatsApp.length === 0 ? (
          <p className="text-xs text-rose-400">
            No columns selected for WhatsApp Image! Please tick "WhatsApp Image" checkboxes above.
          </p>
        ) : (
          <div className="overflow-x-auto border border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#0b2447] text-white font-semibold">
                  {selectedForWhatsApp.map((col, idx) => (
                    <th
                      key={idx}
                      className={`py-2.5 px-4 border-r border-slate-700 ${
                        col.isOverdue ? 'text-rose-300' : ''
                      } ${col.isAmount ? 'text-right font-mono' : ''}`}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-slate-900/60 divide-y divide-slate-800 text-slate-300 font-mono">
                {reportData.records.slice(0, 3).map((r, rIdx) => (
                  <tr key={rIdx}>
                    {selectedForWhatsApp.map((col, cIdx) => {
                      const val = r.values[col.order];
                      const parsed = parseNumber(val);
                      let str = cleanString(val);
                      if (col.isAmount) {
                        str = parsed.n === 0 ? '-' : formatCurrency(parsed.n);
                      }
                      return (
                        <td
                          key={cIdx}
                          className={`py-2 px-4 border-r border-slate-800 ${
                            col.isAmount ? 'text-right' : ''
                          } ${col.isOverdue && parsed.n > 0 ? 'text-rose-400 font-bold bg-rose-500/10' : ''}`}
                        >
                          {str}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
