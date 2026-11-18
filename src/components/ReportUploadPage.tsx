import React, { useState } from 'react';
import { FileSpreadsheet, Upload, CheckCircle2, AlertCircle, ArrowRight, Zap, RefreshCw } from 'lucide-react';
import { ReportUploadData } from '../types';
import {
  readWorkbook,
  getSheetRows,
  guessHeaderRow,
  parseTableFromRows,
  cleanString,
} from '../utils/excelParser';

interface ReportUploadPageProps {
  reportData: ReportUploadData | null;
  onUploadSuccess: (data: ReportUploadData) => void;
  onLoadSampleData: () => void;
  onNext: () => void;
}

export const ReportUploadPage: React.FC<ReportUploadPageProps> = ({
  reportData,
  onUploadSuccess,
  onLoadSampleData,
  onNext,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<any>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [headerRow, setHeaderRow] = useState<number>(1);
  const [allRows, setAllRows] = useState<any[][]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setErrorMsg('');
    setIsLoading(true);

    try {
      const wb = await readWorkbook(selected);
      setWorkbook(wb);
      setSheetNames(wb.SheetNames);
      const firstSheet = wb.SheetNames[0] || '';
      setSelectedSheet(firstSheet);

      const rows = getSheetRows(wb, firstSheet);
      setAllRows(rows);

      const guessedHr = guessHeaderRow(rows);
      setHeaderRow(guessedHr);

      const parsed = parseTableFromRows(rows, guessedHr);
      onUploadSuccess({
        fileName: selected.name,
        sheetName: firstSheet,
        headerRow: guessedHr,
        rawData: rows,
        headers: parsed.headers,
        records: parsed.dataRows,
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to read Excel file.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSheetChange = (sheet: string) => {
    setSelectedSheet(sheet);
    if (!workbook) return;
    const rows = getSheetRows(workbook, sheet);
    setAllRows(rows);
    const guessedHr = guessHeaderRow(rows);
    setHeaderRow(guessedHr);

    const parsed = parseTableFromRows(rows, guessedHr);
    if (file) {
      onUploadSuccess({
        fileName: file.name,
        sheetName: sheet,
        headerRow: guessedHr,
        rawData: rows,
        headers: parsed.headers,
        records: parsed.dataRows,
      });
    }
  };

  const handleHeaderRowChange = (hr: number) => {
    const validHr = Math.max(1, hr);
    setHeaderRow(validHr);
    if (!allRows.length) return;

    const parsed = parseTableFromRows(allRows, validHr);
    if (reportData) {
      onUploadSuccess({
        ...reportData,
        headerRow: validHr,
        headers: parsed.headers,
        records: parsed.dataRows,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-[#091322] border border-slate-800 rounded-2xl p-6 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
              <FileSpreadsheet className="w-6 h-6 text-[#c9a227]" />
              <span>Step 1: Customer Overdue Ageing Excel Upload</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Supports any column structure, arbitrary sheet names, flexible header row positions, and future columns.
            </p>
          </div>

          <button
            onClick={onLoadSampleData}
            className="flex items-center gap-2 bg-[#c9a227] hover:bg-[#e5ba33] text-[#0b2447] font-bold px-4 py-2 rounded-xl text-xs shadow-md transition-all shrink-0"
          >
            <Zap className="w-4 h-4" />
            <span>Load FINORA Sample Report</span>
          </button>
        </div>

        {/* Upload Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="md:col-span-1">
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Select Excel File (.xlsx, .xls, .xlsm, .csv)
            </label>
            <div className="relative border-2 border-dashed border-slate-700 hover:border-[#c9a227] bg-slate-900/60 rounded-xl p-4 text-center cursor-pointer transition-colors group">
              <input
                type="file"
                accept=".xlsx,.xls,.xlsm,.csv"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload className="w-8 h-8 text-slate-400 group-hover:text-[#c9a227] mx-auto mb-2 transition-colors" />
              <p className="text-xs font-bold text-slate-200">
                {file ? file.name : 'Click or Drag & Drop Excel File'}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">Accepts all standard financial report formats</p>
            </div>
          </div>

          {sheetNames.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Worksheet Selection
              </label>
              <select
                value={selectedSheet}
                onChange={(e) => handleSheetChange(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl p-3 focus:border-[#c9a227] focus:outline-none"
              >
                {sheetNames.map((sheet, idx) => (
                  <option key={idx} value={sheet}>
                    {sheet}
                  </option>
                ))}
              </select>
            </div>
          )}

          {allRows.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Header Row Number (Excel Row #)
              </label>
              <input
                type="number"
                min="1"
                value={headerRow}
                onChange={(e) => handleHeaderRowChange(parseInt(e.target.value) || 1)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl p-3 focus:border-[#c9a227] focus:outline-none"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Header automatically detected at row #{headerRow}
              </p>
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Active Dataset Inspection */}
      {reportData && (
        <div className="bg-[#091322] border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">
                  Active Report Dataset: {reportData.fileName}
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Worksheet: <span className="text-slate-200 font-semibold">{reportData.sheetName}</span> | Header Row:{' '}
                <span className="text-slate-200 font-semibold">{reportData.headerRow}</span> | Detected Columns:{' '}
                <span className="text-[#c9a227] font-bold">{reportData.headers.length}</span> | Total Data Records:{' '}
                <span className="text-emerald-400 font-bold">{reportData.records.length}</span>
              </p>
            </div>

            <button
              onClick={onNext}
              className="flex items-center gap-2 bg-[#c9a227] hover:bg-[#e5ba33] text-[#0b2447] font-bold px-5 py-2.5 rounded-xl text-xs shadow-md transition-all shrink-0"
            >
              <span>Continue to Column Config</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Detected Header Badges */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Detected Column Headers ({reportData.headers.length}):
            </h4>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
              {reportData.headers.map((h, idx) => (
                <span
                  key={idx}
                  className="bg-slate-800 text-slate-300 border border-slate-700 text-[11px] px-2.5 py-1 rounded-md font-medium"
                >
                  {h}
                </span>
              ))}
            </div>
          </div>

          {/* Raw Preview Table */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Raw Data Preview (First 10 Records):
            </h4>
            <div className="overflow-x-auto border border-slate-800 rounded-xl max-h-80 scrollbar-thin">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#0b2447] text-white font-semibold sticky top-0 z-10 whitespace-nowrap">
                    <th className="py-2.5 px-3 border-r border-slate-700 text-center">Row #</th>
                    {reportData.headers.map((h, idx) => (
                      <th key={idx} className="py-2.5 px-3 border-r border-slate-700">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900/40 text-slate-300 whitespace-nowrap font-mono">
                  {reportData.records.slice(0, 10).map((r, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-800/50">
                      <td className="py-2 px-3 border-r border-slate-800 text-center font-bold text-slate-400">
                        {r.rowNo}
                      </td>
                      {r.values.map((val: any, cIdx: number) => (
                        <td key={cIdx} className="py-2 px-3 border-r border-slate-800">
                          {cleanString(val)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
