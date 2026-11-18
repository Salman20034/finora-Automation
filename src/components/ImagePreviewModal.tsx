import React from 'react';
import { X, Download, Copy, ZoomIn } from 'lucide-react';
import { downloadCanvasImage, copyCanvasToClipboard } from '../utils/imageGenerator';

interface ImagePreviewModalProps {
  canvas: HTMLCanvasElement | null;
  salespersonName: string;
  onClose: () => void;
  onToast: (msg: string) => void;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  canvas,
  salespersonName,
  onClose,
  onToast,
}) => {
  if (!canvas) return null;

  const dataUrl = canvas.toDataURL('image/png');

  const handleDownload = () => {
    downloadCanvasImage(canvas, `FINORA_Report_${salespersonName.replace(/\s+/g, '_')}.png`);
    onToast('PNG image downloaded successfully.');
  };

  const handleCopy = async () => {
    const success = await copyCanvasToClipboard(canvas);
    if (success) {
      onToast('Image copied to clipboard! Paste directly into WhatsApp with Ctrl+V.');
    } else {
      onToast('Browser blocked direct clipboard copy. Image downloaded as fallback.');
      handleDownload();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-auto">
      <div className="bg-[#091322] border border-slate-700 rounded-2xl max-w-5xl w-full p-6 shadow-2xl relative space-y-4 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
          <div>
            <h3 className="font-extrabold text-white text-lg">
              High-Resolution Generated PNG Image Preview
            </h3>
            <p className="text-xs text-slate-400">Salesperson: {salespersonName}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 bg-[#0b2447] hover:bg-[#19376d] text-[#e5ba33] border border-[#c9a227]/40 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Image</span>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 bg-[#c9a227] hover:bg-[#e5ba33] text-[#0b2447] px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PNG</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Image Display */}
        <div className="flex-1 overflow-auto bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-center">
          <img
            src={dataUrl}
            alt="Financial Report Preview"
            className="max-w-full h-auto rounded-lg shadow-2xl border border-slate-800"
          />
        </div>
      </div>
    </div>
  );
};
