import React, { useState } from 'react';
import { History, Download, Search, Filter, CheckCircle2, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { SendingHistoryItem } from '../types';
import { formatCurrency } from '../utils/excelParser';
import ExcelJS from 'exceljs';

interface SendingHistoryPageProps {
  historyItems: SendingHistoryItem[];
  onClearHistory: () => void;
}

export const SendingHistoryPage: React.FC<SendingHistoryPageProps> = ({ historyItems, onClearHistory }) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredItems = historyItems.filter((item) => {
    const matchesQ =
      item.salespersonName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.phone.includes(searchQuery);
    if (statusFilter === 'all') return matchesQ;
    return matchesQ && item.status === statusFilter;
  });

  const exportHistoryExcel = async () => {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'FINORA AUTOMATION';

    const ws = wb.addWorksheet('Sending History Log');
    ws.addRow([
      'Date',
      'Salesperson',
      'WhatsApp Phone',
      'Customers',
      'Total Outstanding',
      'Total Overdue',
      'Status',
      'Message ID',
      'Timestamp',
      'Mode',
      'Failure Reason',
    ]);

    filteredItems.forEach((item) => {
      ws.addRow([
        item.date,
        item.salespersonName,
        `+${item.phone}`,
        item.customerCount,
        item.totalOutstanding,
        item.totalOverdue,
        item.status,
        item.messageId || 'N/A',
        item.sentAt,
        item.mode,
        item.failureReason || '',
      ]);
    });

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `FINORA_Sending_History_${new Date().toISOString().slice(0, 10)}.xlsx`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#091322] border border-slate-800 rounded-2xl p-6 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
              <History className="w-6 h-6 text-[#c9a227]" />
              <span>WhatsApp Distribution History Log</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Audit log of all sent salesperson reports, Meta message IDs, timestamps, and delivery confirmations.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={exportHistoryExcel}
              className="flex items-center gap-2 bg-[#c9a227] hover:bg-[#e5ba33] text-[#0b2447] font-bold px-4 py-2.5 rounded-xl text-xs shadow-md transition-all shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Export History to Excel</span>
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 mt-5">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search salesperson or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-200 text-xs pl-9 pr-3 py-2 rounded-xl focus:border-[#c9a227] focus:outline-none"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs px-3 py-2 rounded-xl focus:border-[#c9a227] focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="sent">Sent / Delivered</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div className="text-xs text-slate-400">
            Total History Entries: <span className="text-white font-bold">{filteredItems.length}</span>
          </div>
        </div>

        {/* Log Table */}
        <div className="mt-4 overflow-x-auto border border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#0b2447] text-white font-semibold">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-4">Salesperson</th>
                <th className="py-2.5 px-4">Phone Number</th>
                <th className="py-2.5 px-4 text-center">Customers</th>
                <th className="py-2.5 px-4 text-right">Outstanding</th>
                <th className="py-2.5 px-4 text-right">Overdue</th>
                <th className="py-2.5 px-4 text-center">Status</th>
                <th className="py-2.5 px-4">Message ID</th>
                <th className="py-2.5 px-3">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/50 text-slate-300">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    No history log entries recorded yet.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-mono text-slate-400">{item.date}</td>
                    <td className="py-2.5 px-4 font-bold text-white">{item.salespersonName}</td>
                    <td className="py-2.5 px-4 font-mono font-bold text-emerald-400">+{item.phone}</td>
                    <td className="py-2.5 px-4 text-center">{item.customerCount}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-emerald-400">
                      {formatCurrency(item.totalOutstanding)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-rose-400 font-bold">
                      {formatCurrency(item.totalOverdue)}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          item.status === 'sent' || item.status === 'delivered'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-400">
                      {item.messageId || '—'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">{item.sentAt}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
