import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileSpreadsheet,
  ArrowRight,
  Download,
  Search,
  UserCheck,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { SalespersonGroup, SalespersonContact, ReconciliationReport } from '../types';
import { formatCurrency } from '../utils/excelParser';
import ExcelJS from 'exceljs';

interface ValidationMatchingPageProps {
  groups: SalespersonGroup[];
  contacts: SalespersonContact[];
  reconciliation: ReconciliationReport;
  onUpdateGroupContact: (groupId: string, contact: SalespersonContact) => void;
  onNext: () => void;
}

export const ValidationMatchingPage: React.FC<ValidationMatchingPageProps> = ({
  groups,
  contacts,
  reconciliation,
  onUpdateGroupContact,
  onNext,
}) => {
  const [manualMatchOpen, setManualMatchOpen] = useState<string | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string>('');

  const matchedCount = groups.filter((g) => g.contact && g.contact.isValid).length;
  const unmatchedCount = groups.filter((g) => !g.contact || !g.contact.isValid).length;

  const exportValidationExcel = async () => {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'FINORA AUTOMATION';

    const ws = wb.addWorksheet('Salesperson Validation');
    ws.addRow(['Salesperson Name', 'Matched Contact', 'Mobile Number', 'Customers', 'Total Outstanding', 'Total Overdue', 'Status']);

    groups.forEach((g) => {
      ws.addRow([
        g.name,
        g.contact ? g.contact.name : 'Unmatched',
        g.contact ? `+${g.contact.fullPhone}` : 'N/A',
        g.customersCount,
        g.totalOutstanding,
        g.totalOverdue,
        g.contact && g.contact.isValid ? 'Valid' : 'Action Required',
      ]);
    });

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `FINORA_Validation_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-[#091322] border border-slate-800 rounded-2xl p-6 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-[#c9a227]" />
              <span>Step 4: Data Validation & Salesperson Contact Matching</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Reconciles total customer records & financial totals, checks contact numbers, and resolves unmatched salespeople.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={exportValidationExcel}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-4 py-2.5 rounded-xl text-xs border border-slate-700 transition-colors"
            >
              <Download className="w-4 h-4 text-[#c9a227]" />
              <span>Export Validation Report</span>
            </button>

            <button
              onClick={onNext}
              className="flex items-center gap-2 bg-[#c9a227] hover:bg-[#e5ba33] text-[#0b2447] font-bold px-5 py-2.5 rounded-xl text-xs shadow-md transition-all shrink-0"
            >
              <span>Continue to Image Preview</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Reconciliation KPI Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
            <span className="text-xs text-slate-400">Total Salespeople</span>
            <p className="text-2xl font-extrabold text-white mt-1">{groups.length}</p>
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
            <span className="text-xs text-emerald-400">Matched & Valid Contacts</span>
            <p className="text-2xl font-extrabold text-emerald-400 mt-1">{matchedCount}</p>
          </div>

          <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4">
            <span className="text-xs text-rose-400">Unmatched / Invalid</span>
            <p className="text-2xl font-extrabold text-rose-400 mt-1">{unmatchedCount}</p>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
            <span className="text-xs text-blue-400">Reconciliation Status</span>
            <p className="text-sm font-extrabold text-blue-300 mt-1 flex items-center gap-1.5">
              {reconciliation.isReconciled ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>100% Balanced</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Delta: SAR {formatCurrency(reconciliation.outstandingDelta)}</span>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Verification Audit Checklist */}
      <div className="bg-[#091322] border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <h3 className="font-bold text-white text-base border-b border-slate-800 pb-3">
          Source Data & Financial Audit Checklist
        </h3>

        <div className="space-y-2.5 text-xs">
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-slate-200">
                Source Excel Rows = Assigned Customer Rows + Missing Salesperson Rows + Excluded Total Lines
              </span>
            </div>
            <span className="font-mono font-bold text-white">
              {reconciliation.totalSourceRows} = {reconciliation.assignedRows} + {reconciliation.missingSalespersonRows} + {reconciliation.excludedTotalRows}
            </span>
          </div>

          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {Math.abs(reconciliation.outstandingDelta) < 0.01 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              <span className="text-slate-200">
                Total Source Outstanding vs. Grouped Salesperson Outstanding
              </span>
            </div>
            <span className="font-mono font-bold text-emerald-400">
              SAR {formatCurrency(reconciliation.sourceOutstanding)} / SAR {formatCurrency(reconciliation.groupedOutstanding)}
            </span>
          </div>

          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {unmatchedCount === 0 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              <span className="text-slate-200">Salespeople Needing Contact Match</span>
            </div>
            <span className="font-bold text-rose-400">{unmatchedCount} Unmatched</span>
          </div>
        </div>
      </div>

      {/* Salesperson Matching Grid */}
      <div className="bg-[#091322] border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="font-bold text-white text-base">Salesperson Contact Matching Table</h3>
          <span className="text-xs text-slate-400">Click "Manual Match" to assign or change WhatsApp contact</span>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#0b2447] text-white font-semibold">
                <th className="py-2.5 px-4">Salesperson (Report)</th>
                <th className="py-2.5 px-4 text-center">Customers</th>
                <th className="py-2.5 px-4 text-right">Outstanding</th>
                <th className="py-2.5 px-4 text-right">Overdue</th>
                <th className="py-2.5 px-4">Matched Contact</th>
                <th className="py-2.5 px-4">WhatsApp Phone</th>
                <th className="py-2.5 px-4 text-center">Status</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/50 text-slate-300">
              {groups.map((g) => (
                <tr key={g.id} className="hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-bold text-white">{g.name}</td>
                  <td className="py-3 px-4 text-center">{g.customersCount}</td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-400">
                    {formatCurrency(g.totalOutstanding)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-rose-400 font-bold">
                    {formatCurrency(g.totalOverdue)}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-200">
                    {g.contact ? g.contact.name : <span className="text-rose-400">Not Matched</span>}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                    {g.contact && g.contact.fullPhone ? `+${g.contact.fullPhone}` : '—'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {g.contact && g.contact.isValid ? (
                      <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                        Matched
                      </span>
                    ) : (
                      <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                        Missing Phone
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setManualMatchOpen(g.id)}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1 rounded-lg text-xs font-semibold transition-colors"
                    >
                      {g.contact ? 'Change Match' : 'Match Contact'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Matching Modal */}
      {manualMatchOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#091322] border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-3">
              Assign WhatsApp Contact to{' '}
              <span className="text-[#c9a227]">
                {groups.find((g) => g.id === manualMatchOpen)?.name}
              </span>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Select Contact from Directory
              </label>
              <select
                value={selectedContactId}
                onChange={(e) => setSelectedContactId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl p-3 focus:border-[#c9a227] focus:outline-none"
              >
                <option value="">— Select Contact —</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (+{c.fullPhone})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setManualMatchOpen(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-4 py-2 rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const found = contacts.find((c) => c.id === selectedContactId);
                  if (found) {
                    onUpdateGroupContact(manualMatchOpen, found);
                  }
                  setManualMatchOpen(null);
                  setSelectedContactId('');
                }}
                className="bg-[#c9a227] hover:bg-[#e5ba33] text-[#0b2447] font-bold px-4 py-2 rounded-xl text-xs"
              >
                Confirm Match
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
