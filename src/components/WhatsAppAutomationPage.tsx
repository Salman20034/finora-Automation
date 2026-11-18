import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Play,
  Pause,
  Square,
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  Copy,
  ExternalLink,
  Share2,
  Download,
  Settings as SettingsIcon,
  Zap,
  Globe,
  QrCode,
  SkipForward,
  RotateCcw,
  Eye,
} from 'lucide-react';
import {
  SalespersonGroup,
  ExcelColumnConfig,
  WhatsAppApiConfig,
  WhatsAppSendingStatus,
  SendingHistoryItem,
  WhatsAppWebBridgeStatus,
} from '../types';
import { formatCurrency } from '../utils/excelParser';
import { generateSalespersonReportCanvases, copyCanvasToClipboard, downloadCanvasImage } from '../utils/imageGenerator';
import {
  sendWhatsAppImageApi,
  buildWaMeUrl,
  buildTextMessageText,
  sendWhatsAppWebPlaywrightReport,
} from '../utils/whatsappService';

interface WhatsAppAutomationPageProps {
  groups: SalespersonGroup[];
  columns: ExcelColumnConfig[];
  reportDate: string;
  apiConfig: WhatsAppApiConfig;
  onUpdateGroupStatus: (
    groupId: string,
    status: WhatsAppSendingStatus,
    extra?: { messageId?: string; failureReason?: string }
  ) => void;
  onAddHistoryItem: (item: SendingHistoryItem) => void;
  onNavigate: (tab: string) => void;
  onToast: (msg: string) => void;
}

export const WhatsAppAutomationPage: React.FC<WhatsAppAutomationPageProps> = ({
  groups,
  columns,
  reportDate,
  apiConfig,
  onUpdateGroupStatus,
  onAddHistoryItem,
  onNavigate,
  onToast,
}) => {
  // Mode selection: Mode A (Attach and Review) vs Mode B (Automated Browser Sending) vs wa_me fallback
  const [dispatchMode, setDispatchMode] = useState<'mode_a' | 'mode_b' | 'wa_me'>('mode_a');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // WhatsApp Web Playwright Bridge state
  const [bridgeStatus, setBridgeStatus] = useState<WhatsAppWebBridgeStatus>({
    isConnected: false,
    isQrNeeded: false,
  });
  const [isConnectingBridge, setIsConnectingBridge] = useState<boolean>(false);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);

  const isRunningRef = useRef(isRunning);
  const isPausedRef = useRef(isPaused);
  isRunningRef.current = isRunning;
  isPausedRef.current = isPaused;

  const eligibleGroups = groups.filter((g) => g.contact && g.contact.isValid);

  const sentCount = groups.filter(
    (g) => g.status === 'sent' || g.status === 'delivered' || g.status === 'read'
  ).length;
  const attachedCount = groups.filter((g) => g.status === 'image_attached').length;
  const failedCount = groups.filter((g) => g.status === 'failed').length;

  // Poll WhatsApp Web Bridge Status on mount
  const fetchBridgeStatus = async () => {
    try {
      const res = await fetch('/api/whatsapp-web/status');
      if (res.ok) {
        const data = await res.json();
        setBridgeStatus(data);
      }
    } catch (e) {
      // Bridge server offline or standard dev server
    }
  };

  useEffect(() => {
    fetchBridgeStatus();
    const interval = setInterval(fetchBridgeStatus, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleConnectBridge = async () => {
    setIsConnectingBridge(true);
    try {
      const res = await fetch('/api/whatsapp-web/connect', { method: 'POST' });
      const data = await res.json();
      setBridgeStatus(data);
      if (data.isQrNeeded) {
        setShowQrModal(true);
        onToast('WhatsApp Web QR Code generated. Scan with your mobile phone.');
      } else if (data.isConnected) {
        onToast('WhatsApp Web persistent browser session connected!');
      }
    } catch (e: any) {
      onToast(`Error connecting WhatsApp Web: ${e.message}`);
    } finally {
      setIsConnectingBridge(false);
    }
  };

  // SEND ALL REPORTS Execution Engine
  const startSendAllReports = async () => {
    if (!eligibleGroups.length) {
      onToast('No eligible salespeople with valid WhatsApp contacts found.');
      return;
    }

    setIsRunning(true);
    setIsPaused(false);

    for (let i = 0; i < eligibleGroups.length; i++) {
      if (!isRunningRef.current) break;

      while (isPausedRef.current) {
        await new Promise((res) => setTimeout(res, 500));
        if (!isRunningRef.current) break;
      }

      const group = eligibleGroups[i];
      setCurrentIndex(i + 1);

      if (group.status === 'sent' || group.status === 'delivered' || group.status === 'read') {
        continue; // Skip already finished
      }

      onUpdateGroupStatus(group.id, 'chat_opened');

      // Generate PNG Image for this specific salesperson
      const canvases = generateSalespersonReportCanvases(group, columns, reportDate);

      if (!canvases.length) {
        onUpdateGroupStatus(group.id, 'failed', { failureReason: 'Failed to generate PNG image canvas' });
        continue;
      }

      // Execute based on selected dispatch mode
      if (dispatchMode === 'mode_a' || dispatchMode === 'mode_b') {
        onUpdateGroupStatus(group.id, 'attaching_image');

        // Playwright Local Browser Bridge attachment call
        const modeParam = dispatchMode === 'mode_b' ? 'automated_send' : 'attach_and_review';
        const result = await sendWhatsAppWebPlaywrightReport({
          salespersonName: group.name,
          phone: group.contact!.fullPhone,
          imageCanvas: canvases[0],
          mode: modeParam,
        });

        if (result.success) {
          const finalStatus: WhatsAppSendingStatus =
            dispatchMode === 'mode_b' ? 'sent' : 'image_attached';
          onUpdateGroupStatus(group.id, finalStatus);

          onAddHistoryItem({
            id: `hist_${Date.now()}_${group.id}`,
            date: new Date().toISOString().slice(0, 10),
            fileName: 'Report.xlsx',
            salespersonName: group.name,
            phone: group.contact!.fullPhone,
            customerCount: group.customersCount,
            totalOutstanding: group.totalOutstanding,
            totalOverdue: group.totalOverdue,
            status: finalStatus,
            sentAt: new Date().toLocaleTimeString(),
            mode: 'wa_me',
          });

          if (dispatchMode === 'mode_a') {
            onToast(
              `Attached image for ${group.name}! Review in WhatsApp Web and click Send.`
            );
          } else {
            onToast(`Automated report sent to ${group.name} on WhatsApp Web!`);
          }
        } else {
          // Playwright bridge fallback to direct wa.me launcher + clipboard image copy
          onUpdateGroupStatus(group.id, 'chat_opened');
          await handleSingleWaMe(group);
        }
      } else {
        // Direct wa.me Launcher Mode
        await handleSingleWaMe(group);
      }

      // Pause delay between salespeople
      await new Promise((res) => setTimeout(res, (apiConfig.sendDelaySec || 3) * 1000));
    }

    setIsRunning(false);
    onToast('Finished processing SEND ALL REPORTS batch.');
  };

  const handleSingleWaMe = async (group: SalespersonGroup) => {
    if (!group.contact || !group.contact.isValid) return;

    // 1. Generate & Copy PNG Canvas image to clipboard
    const canvases = generateSalespersonReportCanvases(group, columns, reportDate);
    let copied = false;
    if (canvases.length > 0) {
      copied = await copyCanvasToClipboard(canvases[0]);
    }

    // 2. Open WhatsApp Web / App launcher with text summary
    const textMsg = buildTextMessageText(group, columns, reportDate);
    const url = buildWaMeUrl(group.contact.fullPhone, textMsg);
    window.open(url, '_blank');

    onUpdateGroupStatus(group.id, 'sent', { messageId: `wamid.manual.${Date.now()}` });
    onAddHistoryItem({
      id: `hist_${Date.now()}_${group.id}`,
      date: new Date().toISOString().slice(0, 10),
      fileName: 'Report.xlsx',
      salespersonName: group.name,
      phone: group.contact.fullPhone,
      customerCount: group.customersCount,
      totalOutstanding: group.totalOutstanding,
      totalOverdue: group.totalOverdue,
      status: 'sent',
      sentAt: new Date().toLocaleTimeString(),
      mode: 'wa_me',
    });

    if (copied) {
      onToast(`Opened chat for ${group.name} & image copied! Press Ctrl+V to attach table PNG.`);
    } else {
      onToast(`Opened WhatsApp Web chat for ${group.name}.`);
    }
  };

  const handleSkip = (group: SalespersonGroup) => {
    onUpdateGroupStatus(group.id, 'skipped');
    onToast(`Skipped ${group.name}`);
  };

  const filteredGroups = groups.filter((g) => {
    const matchesQ = g.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (statusFilter === 'all') return matchesQ;
    return matchesQ && g.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Top Controls Banner */}
      <div className="bg-[#091322] border border-slate-800 rounded-2xl p-6 shadow-lg space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <Globe className="w-6 h-6 text-[#c9a227]" />
                <span>WhatsApp Web Image Attachment Engine</span>
              </h2>
              <span className="bg-[#c9a227]/20 border border-[#c9a227]/40 text-[#e5ba33] text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">
                No API Key Needed
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Processes each salesperson, opens their WhatsApp Web chat, attaches their generated PNG report image, and submits.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {!isRunning ? (
              <button
                onClick={startSendAllReports}
                className="flex items-center gap-2 bg-gradient-to-r from-[#c9a227] to-[#e5ba33] text-[#0b2447] font-extrabold px-6 py-3 rounded-xl text-sm shadow-xl hover:brightness-110 transition-all shrink-0"
              >
                <Play className="w-4 h-4 fill-[#0b2447]" />
                <span>SEND ALL REPORTS</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5"
                >
                  <Pause className="w-4 h-4" />
                  <span>{isPaused ? 'Resume' : 'Pause'}</span>
                </button>
                <button
                  onClick={() => {
                    setIsRunning(false);
                    setIsPaused(false);
                  }}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5"
                >
                  <Square className="w-4 h-4 fill-white" />
                  <span>Stop</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Local WhatsApp Web Connection Status Bar */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full ${
                bridgeStatus.isConnected
                  ? 'bg-emerald-400 animate-pulse'
                  : bridgeStatus.isQrNeeded
                  ? 'bg-amber-400'
                  : 'bg-slate-600'
              }`}
            ></div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>WhatsApp Web Local Browser Session:</span>
                <span
                  className={
                    bridgeStatus.isConnected
                      ? 'text-emerald-400 font-extrabold'
                      : bridgeStatus.isQrNeeded
                      ? 'text-amber-400 font-extrabold'
                      : 'text-slate-400'
                  }
                >
                  {bridgeStatus.isConnected
                    ? 'Connected & Logged In'
                    : bridgeStatus.isQrNeeded
                    ? 'QR Code Scan Required'
                    : 'Not Connected (Browser Standby)'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Uses your persistent Chrome session. QR code scan required only once on initial setup.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleConnectBridge}
              disabled={isConnectingBridge}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
            >
              <QrCode className="w-4 h-4 text-[#c9a227]" />
              <span>{isConnectingBridge ? 'Connecting Browser...' : 'Connect WhatsApp Web'}</span>
            </button>
          </div>
        </div>

        {/* Sending Mode Options (Mode A vs Mode B) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setDispatchMode('mode_a')}
            className={`p-4 rounded-xl border text-left transition-all ${
              dispatchMode === 'mode_a'
                ? 'bg-[#0b2447] border-[#c9a227] text-white shadow-lg'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="font-extrabold text-xs flex items-center justify-between text-white">
              <span>Mode A – Attach and Review</span>
              <Eye className="w-4 h-4 text-[#c9a227]" />
            </div>
            <p className="text-[11px] text-slate-300 mt-1.5 leading-relaxed">
              Opens salesperson chat, attaches their individual PNG image, pauses for your review, and awaits your manual Send click.
            </p>
          </button>

          <button
            onClick={() => setDispatchMode('mode_b')}
            className={`p-4 rounded-xl border text-left transition-all ${
              dispatchMode === 'mode_b'
                ? 'bg-[#0b2447] border-[#c9a227] text-white shadow-lg'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="font-extrabold text-xs flex items-center justify-between text-white">
              <span>Mode B – Automated Browser Sending</span>
              <Zap className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-[11px] text-slate-300 mt-1.5 leading-relaxed">
              Opens chat, attaches PNG image, verifies preview & recipient, submits message automatically, and moves to next.
            </p>
          </button>

          <button
            onClick={() => setDispatchMode('wa_me')}
            className={`p-4 rounded-xl border text-left transition-all ${
              dispatchMode === 'wa_me'
                ? 'bg-[#0b2447] border-[#c9a227] text-white shadow-lg'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="font-extrabold text-xs flex items-center justify-between text-white">
              <span>Direct wa.me Launcher</span>
              <ExternalLink className="w-4 h-4 text-cyan-400" />
            </div>
            <p className="text-[11px] text-slate-300 mt-1.5 leading-relaxed">
              Opens WhatsApp chat with pre-filled text summary and copies image to clipboard for 1-tap `Ctrl+V` paste.
            </p>
          </button>
        </div>

        {/* Progress Bar */}
        {isRunning && (
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-white">
                Processing SEND ALL REPORTS: Salesperson {currentIndex} of {eligibleGroups.length} (
                {eligibleGroups[currentIndex - 1]?.name})
              </span>
              <span className="text-[#c9a227]">
                {Math.round((currentIndex / eligibleGroups.length) * 100)}% Completed
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#c9a227] to-emerald-400 h-full transition-all duration-300"
                style={{ width: `${(currentIndex / eligibleGroups.length) * 100}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Sequential Sending Queue Dashboard */}
      <div className="bg-[#091322] border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-white text-base">Salesperson WhatsApp Attachment Queue</h3>
            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs px-2.5 py-0.5 rounded-full font-bold">
              {sentCount} Sent
            </span>
            {attachedCount > 0 && (
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs px-2.5 py-0.5 rounded-full font-bold">
                {attachedCount} Attached (Mode A)
              </span>
            )}
            {failedCount > 0 && (
              <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs px-2.5 py-0.5 rounded-full font-bold">
                {failedCount} Failed
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search salesperson..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-xl focus:border-[#c9a227] focus:outline-none"
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-xl focus:border-[#c9a227] focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="image_attached">Image Attached</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
              <option value="skipped">Skipped</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#0b2447] text-white font-semibold">
                <th className="py-2.5 px-4">Salesperson</th>
                <th className="py-2.5 px-4">WhatsApp Mobile</th>
                <th className="py-2.5 px-4 text-center">Customers</th>
                <th className="py-2.5 px-4 text-right">Outstanding</th>
                <th className="py-2.5 px-4 text-right">Overdue</th>
                <th className="py-2.5 px-4 text-center">Attachment Status</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/50 text-slate-300">
              {filteredGroups.map((g) => (
                <tr key={g.id} className="hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-bold text-white">{g.name}</td>
                  <td className="py-3 px-4 font-mono text-slate-300">
                    {g.contact && g.contact.isValid ? (
                      `+${g.contact.fullPhone}`
                    ) : (
                      <span className="text-rose-400">Invalid / Unmatched</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">{g.customersCount}</td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-400">
                    {formatCurrency(g.totalOutstanding)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-rose-400 font-bold">
                    {formatCurrency(g.totalOverdue)}
                  </td>
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                        g.status === 'sent' || g.status === 'delivered' || g.status === 'read'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : g.status === 'image_attached'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : g.status === 'attaching_image' || g.status === 'chat_opened' || g.status === 'sending'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 animate-pulse'
                          : g.status === 'failed'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : g.status === 'skipped'
                          ? 'bg-slate-800 text-slate-400 border border-slate-700'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {g.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleSingleWaMe(g)}
                        title="Open WhatsApp Chat & Copy Image"
                        className="p-1.5 bg-[#0b2447] hover:bg-[#19376d] text-[#e5ba33] rounded-lg border border-[#c9a227]/40 font-bold text-[11px] flex items-center gap-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Send</span>
                      </button>

                      <button
                        onClick={() => handleSkip(g)}
                        title="Skip Salesperson"
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg border border-slate-700"
                      >
                        <SkipForward className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQrModal && bridgeStatus.qrDataUrl && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#091322] border border-slate-700 rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4">
            <h3 className="font-extrabold text-white text-lg">Scan WhatsApp Web QR Code</h3>
            <p className="text-xs text-slate-400">
              Open WhatsApp on your mobile phone -&gt; Linked Devices -&gt; Link a Device.
            </p>
            <div className="p-3 bg-white rounded-xl inline-block shadow-lg">
              <img src={bridgeStatus.qrDataUrl} alt="WhatsApp Web QR Code" className="w-56 h-56 mx-auto" />
            </div>
            <button
              onClick={() => setShowQrModal(false)}
              className="w-full bg-[#c9a227] hover:bg-[#e5ba33] text-[#0b2447] font-bold py-2 rounded-xl text-xs"
            >
              Done / Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
