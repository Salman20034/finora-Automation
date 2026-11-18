import React from 'react';
import {
  Users,
  Building2,
  DollarSign,
  AlertTriangle,
  ShieldAlert,
  TrendingUp,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  XCircle,
  FileSpreadsheet,
  ArrowRight,
  Play,
  Zap,
  Send,
} from 'lucide-react';
import { SalespersonGroup, ReportUploadData, ContactUploadData } from '../types';
import { formatCurrency } from '../utils/excelParser';

interface DashboardPageProps {
  groups: SalespersonGroup[];
  reportData: ReportUploadData | null;
  contactData: ContactUploadData | null;
  onNavigate: (tab: string) => void;
  onLoadSampleData: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  groups,
  reportData,
  contactData,
  onNavigate,
  onLoadSampleData,
}) => {
  // Calculate dynamic KPIs
  const totalSalespeople = groups.length;
  const totalCustomers = groups.reduce((acc, g) => acc + g.customersCount, 0);
  const totalOutstanding = groups.reduce((acc, g) => acc + g.totalOutstanding, 0);
  const totalOverdue = groups.reduce((acc, g) => acc + g.totalOverdue, 0);
  const totalOverRiskDue = groups.reduce((acc, g) => acc + g.totalOverRiskDue, 0);
  const totalOverLimit = groups.reduce((acc, g) => acc + g.totalOverLimit, 0);

  const imagesGenerated = groups.filter(
    (g) => g.status !== 'pending' && g.status !== 'unmatched_contact'
  ).length;
  const successfullySent = groups.filter((g) => g.status === 'sent' || g.status === 'delivered' || g.status === 'read').length;
  const pendingMessages = groups.filter((g) => g.status === 'pending' || g.status === 'queued').length;
  const failedMessages = groups.filter((g) => g.status === 'failed').length;

  const kpiCards = [
    {
      title: 'Total Salespeople',
      value: totalSalespeople.toString(),
      icon: Users,
      color: 'border-l-blue-500 text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      title: 'Total Customers',
      value: totalCustomers.toString(),
      icon: Building2,
      color: 'border-l-indigo-500 text-indigo-400',
      bg: 'bg-indigo-500/10',
    },
    {
      title: 'Total Outstanding',
      value: `SAR ${formatCurrency(totalOutstanding)}`,
      icon: DollarSign,
      color: 'border-l-emerald-500 text-emerald-400',
      bg: 'bg-emerald-500/10',
      isCurrency: true,
    },
    {
      title: 'Total Overdue',
      value: `SAR ${formatCurrency(totalOverdue)}`,
      icon: AlertTriangle,
      color: 'border-l-amber-500 text-amber-400',
      bg: 'bg-amber-500/10',
      isCurrency: true,
    },
    {
      title: 'Total Over Risk Due',
      value: `SAR ${formatCurrency(totalOverRiskDue)}`,
      icon: ShieldAlert,
      color: 'border-l-[#c9a227] text-[#e5ba33]',
      bg: 'bg-[#c9a227]/10',
      isCurrency: true,
    },
    {
      title: 'Total Over Limit',
      value: `SAR ${formatCurrency(totalOverLimit)}`,
      icon: TrendingUp,
      color: 'border-l-rose-500 text-rose-400',
      bg: 'bg-rose-500/10',
      isCurrency: true,
    },
    {
      title: 'Images Generated',
      value: imagesGenerated.toString(),
      icon: ImageIcon,
      color: 'border-l-cyan-500 text-cyan-400',
      bg: 'bg-cyan-500/10',
    },
    {
      title: 'Successfully Sent',
      value: successfullySent.toString(),
      icon: CheckCircle2,
      color: 'border-l-emerald-400 text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      title: 'Pending Messages',
      value: pendingMessages.toString(),
      icon: Clock,
      color: 'border-l-slate-400 text-slate-300',
      bg: 'bg-slate-500/10',
    },
    {
      title: 'Failed Messages',
      value: failedMessages.toString(),
      icon: XCircle,
      color: 'border-l-red-500 text-red-400',
      bg: 'bg-red-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner */}
      <div className="bg-gradient-to-r from-[#0b2447] via-[#19376d] to-[#0b2447] border border-slate-700/80 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#c9a227]/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                FINORA AUTOMATION
              </h1>
              <span className="bg-[#c9a227] text-[#0b2447] text-xs font-bold px-3 py-1 rounded-full uppercase">
                Executive Control
              </span>
            </div>
            <p className="text-slate-300 mt-2 max-w-2xl text-sm leading-relaxed">
              Salesperson-wise financial overdue reporting, automated PNG report image generation & WhatsApp Business Cloud distribution engine.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {!reportData && (
              <button
                onClick={onLoadSampleData}
                className="flex items-center gap-2 bg-gradient-to-r from-[#c9a227] to-[#e5ba33] text-[#0b2447] font-bold px-4 py-2.5 rounded-xl hover:brightness-110 shadow-lg transition-all text-sm"
              >
                <Zap className="w-4 h-4" />
                <span>Load FINORA Sample Data</span>
              </button>
            )}

            <button
              onClick={() => onNavigate('upload-report')}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold px-4 py-2.5 rounded-xl border border-slate-600 transition-all text-sm"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#c9a227]" />
              <span>Upload Report Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid (10 Cards) */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
          <span>Real-Time Financial & Automation KPIs</span>
          <span className="text-xs font-normal text-slate-500">(Calculated dynamically)</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {kpiCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div
                key={idx}
                className={`bg-[#091322] border-t border-b border-r border-slate-800 border-l-4 ${card.color.split(' ')[0]} rounded-xl p-4 shadow-md hover:border-slate-700 transition-all`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-400">{card.title}</span>
                  <div className={`p-2 rounded-lg ${card.bg}`}>
                    <Icon className={`w-4 h-4 ${card.color.split(' ')[1]}`} />
                  </div>
                </div>
                <div className="mt-3">
                  <span
                    className={`font-extrabold text-white text-xl ${
                      card.isCurrency ? 'font-tabular text-lg' : ''
                    }`}
                  >
                    {card.value}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Secondary Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Salesperson Distribution Summary */}
        <div className="lg:col-span-2 bg-[#091322] border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
            <div>
              <h3 className="font-bold text-white text-base">Salesperson Overview & Overdue Status</h3>
              <p className="text-xs text-slate-400">Customer breakdown and financial outstanding per salesperson</p>
            </div>

            <button
              onClick={() => onNavigate('whatsapp-automation')}
              className="flex items-center gap-1.5 text-xs font-bold text-[#c9a227] hover:text-[#e5ba33]"
            >
              <span>View WhatsApp Queue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {groups.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 text-slate-600 opacity-60" />
              <p className="font-medium">No report dataset uploaded yet.</p>
              <p className="text-xs text-slate-500 mt-1">
                Upload your customer overdue Excel file or click "Load FINORA Sample Data".
              </p>
              <button
                onClick={onLoadSampleData}
                className="mt-4 bg-[#c9a227] text-[#0b2447] text-xs font-bold px-4 py-2 rounded-lg"
              >
                Load Pre-Loaded Sample Data
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Salesperson</th>
                    <th className="py-2.5 px-3 text-center">Customers</th>
                    <th className="py-2.5 px-3 text-right">Outstanding</th>
                    <th className="py-2.5 px-3 text-right">Overdue</th>
                    <th className="py-2.5 px-3">Contact</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {groups.slice(0, 7).map((g, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40 text-slate-200 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-white">{g.name}</td>
                      <td className="py-2.5 px-3 text-center">{g.customersCount}</td>
                      <td className="py-2.5 px-3 text-right font-tabular text-emerald-400">
                        {formatCurrency(g.totalOutstanding)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-tabular text-rose-400 font-bold">
                        {formatCurrency(g.totalOverdue)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {g.contact && g.contact.isValid ? (
                          <span className="font-tabular text-slate-300">+{g.contact.fullPhone}</span>
                        ) : (
                          <span className="text-rose-400 text-[11px] font-semibold">Unmatched</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            g.status === 'sent' || g.status === 'delivered' || g.status === 'read'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : g.status === 'failed'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}
                        >
                          {g.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {groups.length > 7 && (
                <div className="text-center pt-3 text-xs text-slate-400 border-t border-slate-800">
                  Showing 7 of {groups.length} salespeople.{' '}
                  <button
                    onClick={() => onNavigate('whatsapp-automation')}
                    className="text-[#c9a227] hover:underline font-semibold"
                  >
                    View all in WhatsApp Sending Dashboard
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Actions & System Status Panel */}
        <div className="space-y-6">
          <div className="bg-[#091322] border border-slate-800 rounded-2xl p-5 shadow-lg">
            <h3 className="font-bold text-white text-base mb-3 flex items-center gap-2">
              <Play className="w-4 h-4 text-[#c9a227]" />
              <span>Automation Workflow Shortcuts</span>
            </h3>

            <div className="space-y-2.5">
              <button
                onClick={() => onNavigate('upload-report')}
                className="w-full text-left p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="font-semibold text-white text-xs group-hover:text-[#c9a227] transition-colors">
                    1. Upload Overdue Report Excel
                  </div>
                  <div className="text-[11px] text-slate-400">Detect columns & dynamic schema</div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-[#c9a227] transition-colors" />
              </button>

              <button
                onClick={() => onNavigate('column-config')}
                className="w-full text-left p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="font-semibold text-white text-xs group-hover:text-[#c9a227] transition-colors">
                    2. Column Selection & Formatting
                  </div>
                  <div className="text-[11px] text-slate-400">Choose WhatsApp image columns & totals</div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-[#c9a227] transition-colors" />
              </button>

              <button
                onClick={() => onNavigate('contacts')}
                className="w-full text-left p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="font-semibold text-white text-xs group-hover:text-[#c9a227] transition-colors">
                    3. Manage Salesperson Contacts
                  </div>
                  <div className="text-[11px] text-slate-400">Map WhatsApp numbers & country codes</div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-[#c9a227] transition-colors" />
              </button>

              <button
                onClick={() => onNavigate('whatsapp-automation')}
                className="w-full text-left p-3 rounded-xl bg-gradient-to-r from-[#0b2447] to-[#19376d] hover:brightness-110 border border-[#c9a227]/40 transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="font-bold text-[#e5ba33] text-xs">
                    4. Start Automated WhatsApp Sending
                  </div>
                  <div className="text-[11px] text-slate-300">Run sequential automated dispatch</div>
                </div>
                <Send className="w-4 h-4 text-[#c9a227]" />
              </button>
            </div>
          </div>

          <div className="bg-[#091322] border border-slate-800 rounded-2xl p-5 shadow-lg">
            <h3 className="font-bold text-white text-xs uppercase tracking-wider text-slate-400 mb-3">
              Loaded Files Summary
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/40 border border-slate-800">
                <span className="text-slate-400">Report Excel:</span>
                <span className="font-semibold text-slate-200">
                  {reportData ? reportData.fileName : 'Not loaded'}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/40 border border-slate-800">
                <span className="text-slate-400">Contact Excel:</span>
                <span className="font-semibold text-slate-200">
                  {contactData ? contactData.fileName : 'Not loaded'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
