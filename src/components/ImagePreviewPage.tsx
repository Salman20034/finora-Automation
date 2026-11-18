import React, { useState, useEffect, useRef } from 'react';
import { Image as ImageIcon, Download, Copy, ZoomIn, Sliders, ArrowRight, RefreshCw, Layers } from 'lucide-react';
import { SalespersonGroup, ExcelColumnConfig, ImageDesignSettings } from '../types';
import {
  generateSalespersonReportCanvases,
  defaultImageDesignSettings,
  downloadCanvasImage,
  copyCanvasToClipboard,
} from '../utils/imageGenerator';
import { formatCurrency } from '../utils/excelParser';
import { ImagePreviewModal } from './ImagePreviewModal';

interface ImagePreviewPageProps {
  groups: SalespersonGroup[];
  columns: ExcelColumnConfig[];
  reportDate: string;
  onNext: () => void;
  onToast: (msg: string) => void;
}

export const ImagePreviewPage: React.FC<ImagePreviewPageProps> = ({
  groups,
  columns,
  reportDate,
  onNext,
  onToast,
}) => {
  const [selectedGroupIdx, setSelectedGroupIdx] = useState<number>(0);
  const [designSettings, setDesignSettings] = useState<ImageDesignSettings>(defaultImageDesignSettings);
  const [canvasesMap, setCanvasesMap] = useState<Record<string, HTMLCanvasElement[]>>({});
  const [modalCanvas, setModalCanvas] = useState<HTMLCanvasElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const selectedGroup = groups[selectedGroupIdx] || groups[0];

  // Render canvases for all salespeople
  const renderAllCanvases = () => {
    const map: Record<string, HTMLCanvasElement[]> = {};
    groups.forEach((g) => {
      const cvs = generateSalespersonReportCanvases(g, columns, reportDate, designSettings);
      map[g.id] = cvs;
    });
    setCanvasesMap(map);
  };

  useEffect(() => {
    if (groups.length && columns.length) {
      renderAllCanvases();
    }
  }, [groups, columns, reportDate, designSettings]);

  const activeCanvases = selectedGroup ? canvasesMap[selectedGroup.id] || [] : [];

  const handleDownloadActive = (canvas: HTMLCanvasElement, pageIdx: number) => {
    if (!selectedGroup) return;
    downloadCanvasImage(canvas, `FINORA_${selectedGroup.name.replace(/\s+/g, '_')}_Page${pageIdx + 1}.png`);
    onToast(`Downloaded PNG for ${selectedGroup.name}`);
  };

  const handleCopyActive = async (canvas: HTMLCanvasElement) => {
    const success = await copyCanvasToClipboard(canvas);
    if (success) {
      onToast('Image copied to clipboard! Paste in WhatsApp with Ctrl+V.');
    } else {
      onToast('Browser blocked clipboard copy. Downloaded PNG file instead.');
      handleDownloadActive(canvas, 0);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-[#091322] border border-slate-800 rounded-2xl p-6 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
              <ImageIcon className="w-6 h-6 text-[#c9a227]" />
              <span>Step 5: Salesperson PNG Image Preview & Verification</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Verify the exact financial report table image generated for each salesperson before sending via WhatsApp.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={renderAllCanvases}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-4 py-2.5 rounded-xl text-xs border border-slate-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4 text-[#c9a227]" />
              <span>Regenerate Images</span>
            </button>

            <button
              onClick={onNext}
              className="flex items-center gap-2 bg-[#c9a227] hover:bg-[#e5ba33] text-[#0b2447] font-bold px-5 py-2.5 rounded-xl text-xs shadow-md transition-all shrink-0"
            >
              <span>Continue to WhatsApp Sending</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Salesperson Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto py-3 scrollbar-none text-xs">
          {groups.map((g, idx) => (
            <button
              key={g.id}
              onClick={() => setSelectedGroupIdx(idx)}
              className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-all border shrink-0 ${
                selectedGroupIdx === idx
                  ? 'bg-[#c9a227] text-[#0b2447] border-[#c9a227] shadow-md'
                  : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
              }`}
            >
              <span>{g.name}</span>
              <span className="ml-2 opacity-80 font-normal">({g.customersCount})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Preview Container */}
      {selectedGroup && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Controls & Settings Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-[#091322] border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
              <h3 className="font-bold text-white text-sm border-b border-slate-800 pb-2">
                Salesperson Financial Summary
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Salesperson:</span>
                  <span className="font-bold text-white">{selectedGroup.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Total Customers:</span>
                  <span className="font-bold text-white">{selectedGroup.customersCount}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Total Outstanding:</span>
                  <span className="font-bold font-mono text-emerald-400">
                    SAR {formatCurrency(selectedGroup.totalOutstanding)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Total Overdue:</span>
                  <span className="font-bold font-mono text-rose-400">
                    SAR {formatCurrency(selectedGroup.totalOverdue)}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">WhatsApp Phone:</span>
                  <span className="font-bold font-mono text-[#c9a227]">
                    {selectedGroup.contact ? `+${selectedGroup.contact.fullPhone}` : 'Unmatched'}
                  </span>
                </div>
              </div>
            </div>

            {/* Visual Styling Settings */}
            <div className="bg-[#091322] border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3 text-xs">
              <h3 className="font-bold text-white text-sm flex items-center gap-1.5 border-b border-slate-800 pb-2">
                <Sliders className="w-4 h-4 text-[#c9a227]" />
                <span>Image Design Settings</span>
              </h3>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Row Height ({designSettings.rowHeight}px)</label>
                <input
                  type="range"
                  min="28"
                  max="44"
                  value={designSettings.rowHeight}
                  onChange={(e) => setDesignSettings({ ...designSettings, rowHeight: parseInt(e.target.value) })}
                  className="w-full accent-[#c9a227]"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Header Background Color</label>
                <input
                  type="color"
                  value={designSettings.headerBgColor}
                  onChange={(e) => setDesignSettings({ ...designSettings, headerBgColor: e.target.value })}
                  className="w-full h-8 bg-slate-900 border border-slate-700 rounded cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Overdue Highlight Color</label>
                <input
                  type="color"
                  value={designSettings.overdueTextColor}
                  onChange={(e) => setDesignSettings({ ...designSettings, overdueTextColor: e.target.value })}
                  className="w-full h-8 bg-slate-900 border border-slate-700 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Canvas Display Viewport */}
          <div className="lg:col-span-3 bg-[#091322] border border-slate-800 rounded-2xl p-6 shadow-lg space-y-6">
            {activeCanvases.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <p>Generating PNG image table...</p>
              </div>
            ) : (
              activeCanvases.map((canvas, pIdx) => {
                const dataUrl = canvas.toDataURL('image/png');
                return (
                  <div key={pIdx} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-[#c9a227]" />
                        <span>
                          Generated Report PNG {activeCanvases.length > 1 ? `(Part ${pIdx + 1} of ${activeCanvases.length})` : ''}
                        </span>
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setModalCanvas(canvas)}
                          className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                          <span>Zoom Modal</span>
                        </button>

                        <button
                          onClick={() => handleCopyActive(canvas)}
                          className="flex items-center gap-1.5 bg-[#0b2447] hover:bg-[#19376d] text-[#e5ba33] border border-[#c9a227]/40 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Image</span>
                        </button>

                        <button
                          onClick={() => handleDownloadActive(canvas, pIdx)}
                          className="flex items-center gap-1.5 bg-[#c9a227] hover:bg-[#e5ba33] text-[#0b2447] px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download PNG</span>
                        </button>
                      </div>
                    </div>

                    {/* Image Preview Box */}
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex justify-center overflow-x-auto shadow-inner">
                      <img
                        src={dataUrl}
                        alt={`Report for ${selectedGroup.name}`}
                        className="max-w-full h-auto rounded border border-slate-800 shadow-xl"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Zoom Modal */}
      {modalCanvas && (
        <ImagePreviewModal
          canvas={modalCanvas}
          salespersonName={selectedGroup?.name || ''}
          onClose={() => setModalCanvas(null)}
          onToast={onToast}
        />
      )}
    </div>
  );
};
