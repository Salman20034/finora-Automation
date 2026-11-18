import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { SalespersonContact, ExcelColumnConfig, CustomerRecord } from '../types';

export const cleanString = (val: any): string => {
  if (val === null || val === undefined) return '';
  if (val instanceof Date) return '';
  return String(val).replace(/\s+/g, ' ').trim();
};

export const normalizeName = (val: any): string => {
  return cleanString(val).toLowerCase();
};

export const parseNumber = (val: any): { n: number; isBad: boolean; isEmpty: boolean } => {
  if (val === '' || val === null || val === undefined) {
    return { n: 0, isBad: false, isEmpty: true };
  }
  if (typeof val === 'number') {
    return isFinite(val) ? { n: val, isBad: false, isEmpty: false } : { n: 0, isBad: true, isEmpty: false };
  }
  if (val instanceof Date) {
    return { n: 0, isBad: true, isEmpty: false };
  }
  let str = String(val).trim();
  if (!str || str === '-') return { n: 0, isBad: false, isEmpty: true };

  let isNegative = false;
  if (/^\(.*\)$/.test(str)) {
    isNegative = true;
    str = str.slice(1, -1);
  }

  // Remove currency symbols, commas, spaces
  str = str.replace(/[,\s]/g, '').replace(/^(SAR|SR|USD|AED|INR|\$|₹|EGP)/i, '');

  if (/^-?\d*\.?\d+$/.test(str)) {
    const parsed = parseFloat(str);
    return { n: isNegative ? -parsed : parsed, isBad: false, isEmpty: false };
  }
  return { n: 0, isBad: true, isEmpty: false };
};

export const formatCurrency = (val: number): string => {
  if (isNaN(val)) return '0.00';
  return val.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const formatDate = (date: Date | string): string => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return String(date);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(d.getDate()).padStart(2, '0');
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

export const extractOnlyDigits = (val: any): string => {
  if (val === '' || val === null || val === undefined) return '';
  if (typeof val === 'number') {
    val = Number.isInteger(val) ? val.toFixed(0) : String(val);
  }
  return String(val).replace(/\D/g, '');
};

export const buildPhoneNumber = (
  countryCode: any,
  mobile: any,
  hasCountryCode: boolean
): { phone: string; isValid: boolean; reason: string } => {
  let cc = extractOnlyDigits(countryCode);
  let mob = extractOnlyDigits(mobile);

  if (!mob) {
    return { phone: '', isValid: false, reason: 'Missing mobile number' };
  }

  if (hasCountryCode) {
    if (!cc) {
      return { phone: '', isValid: false, reason: 'Missing country code' };
    }
    if (cc.startsWith('00')) cc = cc.slice(2);
    mob = mob.replace(/^0+/, '');
    const combined = cc + mob;
    const isValid = /^[1-9]\d{7,14}$/.test(combined);
    return {
      phone: combined,
      isValid,
      reason: isValid ? '' : 'Invalid length (must be 8–15 digits including country code)',
    };
  } else {
    if (mob.startsWith('00')) mob = mob.slice(2);
    const isValid = /^[1-9]\d{7,14}$/.test(mob);
    return {
      phone: mob,
      isValid,
      reason: isValid ? '' : 'Invalid mobile number or missing country code',
    };
  }
};

export const readWorkbook = (file: File): Promise<XLSX.WorkBook> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read Excel file.'));
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true });
        resolve(workbook);
      } catch (err: any) {
        reject(new Error(`Not a valid Excel file: ${err.message}`));
      }
    };
    reader.readAsArrayBuffer(file);
  });
};

export const getSheetRows = (workbook: XLSX.WorkBook, sheetName: string): any[][] => {
  const ws = workbook.Sheets[sheetName];
  if (!ws) return [];
  let maxR = -1;
  let maxC = -1;
  for (const k in ws) {
    if (k.charAt(0) === '!') continue;
    const cell = XLSX.utils.decode_cell(k);
    if (cell.r > maxR) maxR = cell.r;
    if (cell.c > maxC) maxC = cell.c;
  }
  if (maxR < 0) return [];
  return XLSX.utils.sheet_to_json(ws, {
    header: 1,
    raw: true,
    defval: '',
    range: { s: { r: 0, c: 0 }, e: { r: maxR, c: maxC } },
  }) as any[][];
};

export const guessHeaderRow = (rows: any[][]): number => {
  const limit = Math.min(rows.length, 30);
  const counts: number[] = [];
  let maxCols = 0;

  for (let i = 0; i < limit; i++) {
    const cnt = (rows[i] || []).filter((v) => cleanString(v) !== '').length;
    counts.push(cnt);
    if (cnt > maxCols) maxCols = cnt;
  }

  for (let i = 0; i < limit; i++) {
    if (counts[i] >= 2 && counts[i] >= maxCols * 0.6) {
      return i + 1;
    }
  }
  return 1;
};

export const parseTableFromRows = (
  rows: any[][],
  headerRow: number
): { headers: string[]; dataRows: { rowNo: number; values: any[] }[] } => {
  const hRow = rows[headerRow - 1] || [];
  let maxCols = 0;
  for (let i = headerRow - 1; i < Math.min(rows.length, headerRow + 300); i++) {
    maxCols = Math.max(maxCols, (rows[i] || []).length);
  }
  maxCols = Math.max(maxCols, hRow.length);

  const headers: string[] = [];
  const seen: Record<string, number> = {};

  for (let j = 0; j < maxCols; j++) {
    let name = cleanString(hRow[j]) || `Column ${j + 1}`;
    if (seen[name]) {
      seen[name]++;
      name = `${name} (${seen[name]})`;
    } else {
      seen[name] = 1;
    }
    headers.push(name);
  }

  const dataRows: { rowNo: number; values: any[] }[] = [];
  for (let i = headerRow; i < rows.length; i++) {
    const r = rows[i] || [];
    const hasData = r.some((val) => cleanString(val) !== '' || val instanceof Date);
    if (!hasData) continue;
    const vals: any[] = [];
    for (let j = 0; j < maxCols; j++) {
      vals.push(r[j] === undefined ? '' : r[j]);
    }
    dataRows.push({ rowNo: i + 1, values: vals });
  }

  return { headers, dataRows };
};

export const suggestColumnMapping = (headers: string[], regex: RegExp): number => {
  return headers.findIndex((h) => regex.test(h));
};

export const generateDefaultConfigs = (headers: string[], sampleRows: any[][]): ExcelColumnConfig[] => {
  const overdueRegex = /overdue|over due|\d+\s*[-–]\s*\d+|above|>\s*\d+|\d+\s*\+/i;
  const amountRegex = /limit|amount|total|balance|due|risk|credit|overdue|outstanding|\d+\s*[-–]\s*\d+|above/i;

  return headers.map((header, idx) => {
    const isOverdue = overdueRegex.test(header);
    const isAmount = amountRegex.test(header) || isOverdue;
    const isGrandTotalSum = /outstanding|balance|grand total|total|overdue|today due/i.test(header);
    const sample = sampleRows.map((r) => r[idx]).find((v) => cleanString(v) !== '' || v instanceof Date);

    // Default show & WhatsApp selection
    const isKeyField = /sales|rep\b|customer|display name|party|branch|limit|days|total|due|overdue|risk/i.test(header);

    return {
      id: `col_${idx}`,
      originalHeader: header,
      label: header,
      show: isKeyField,
      includeInWhatsApp: isKeyField && !/branch|sanad/i.test(header),
      includeInExport: true,
      isAmount,
      isGrandTotalSum,
      isOverdue,
      order: idx,
      sampleValue: sample,
    };
  });
};
