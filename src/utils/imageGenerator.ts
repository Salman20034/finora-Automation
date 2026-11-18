import { SalespersonGroup, ExcelColumnConfig, ImageDesignSettings } from '../types';
import { formatCurrency, formatDate, cleanString, parseNumber } from './excelParser';

const FONT_FAMILY = '"Plus Jakarta Sans", "Segoe UI", Arial, sans-serif';
const MONO_FONT_FAMILY = '"JetBrains Mono", monospace';

export const defaultImageDesignSettings: ImageDesignSettings = {
  headerBgColor: '#0b2447',
  headerTextColor: '#ffffff',
  accentColor: '#c9a227',
  overdueBgColor: '#fde4de',
  overdueTextColor: '#c00000',
  grandTotalBgColor: '#f1f5f9',
  fontSize: 13,
  rowHeight: 34,
  maxRowsPerPage: 25,
  showCompanyLogo: true,
  reportTitle: 'Customer Overdue & Credit Risk Report',
  companyName: 'FINORA AUTOMATION',
};

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let str = text;
  while (str.length > 1 && ctx.measureText(str + '…').width > maxWidth) {
    str = str.slice(0, -1);
  }
  return str + '…';
}

function wrapHeaderText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = String(text).split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (current && ctx.measureText(test).width > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

export const generateSalespersonReportCanvases = (
  group: SalespersonGroup,
  columns: ExcelColumnConfig[],
  reportDate: string,
  customSettings?: Partial<ImageDesignSettings>
): HTMLCanvasElement[] => {
  const settings: ImageDesignSettings = { ...defaultImageDesignSettings, ...customSettings };
  const selectedCols = columns.filter((c) => c.show && c.includeInWhatsApp);

  if (!selectedCols.length) return [];

  const scale = 2; // High DPI 2x retina
  const padding = 20;
  const rowHeight = settings.rowHeight;
  const rows = group.rows;

  // Calculate Column Totals
  const totals = selectedCols.map((col) => {
    if (col.isGrandTotalSum || col.isOverdue || col.isAmount) {
      return rows.reduce((acc, r) => {
        const val = r.raw[col.originalHeader] ?? r.raw[col.id];
        return acc + parseNumber(val).n;
      }, 0);
    }
    return null;
  });

  // Calculate column widths
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d')!;

  const colWidths = selectedCols.map((col, k) => {
    tempCtx.font = `13px ${col.isAmount ? MONO_FONT_FAMILY : FONT_FAMILY}`;
    let maxW = 0;

    rows.forEach((r) => {
      const val = r.raw[col.originalHeader] ?? r.raw[col.id];
      let displayStr = cleanString(val);
      if (col.isAmount) {
        const p = parseNumber(val);
        displayStr = p.n === 0 ? '-' : formatCurrency(p.n);
      }
      maxW = Math.max(maxW, tempCtx.measureText(displayStr).width);
    });

    if (totals[k] !== null) {
      tempCtx.font = `bold 13px ${MONO_FONT_FAMILY}`;
      maxW = Math.max(maxW, tempCtx.measureText(formatCurrency(totals[k]!)).width);
    }

    tempCtx.font = `bold 12px ${FONT_FAMILY}`;
    const headerLines = wrapHeaderText(tempCtx, col.label, 300);
    const headerW = Math.max(...headerLines.map((line) => tempCtx.measureText(line).width), 0);

    return Math.round(Math.min(k === 0 ? 380 : 220, Math.max(maxW + 28, headerW + 24, 80)));
  });

  tempCtx.font = `bold 12px ${FONT_FAMILY}`;
  const headerWrapped = selectedCols.map((col, k) => wrapHeaderText(tempCtx, col.label, colWidths[k] - 12));
  const tableHeaderHeight = Math.max(...headerWrapped.map((l) => l.length)) * 18 + 16;

  // Split into pages if too long
  const perPage = settings.maxRowsPerPage;
  const pages: (typeof rows)[] = [];
  for (let i = 0; i < rows.length; i += perPage) {
    pages.push(rows.slice(i, i + perPage));
  }
  if (!pages.length) pages.push([]);

  const tableTotalWidth = colWidths.reduce((a, b) => a + b, 0);
  const canvasWidth = Math.max(680, tableTotalWidth + padding * 2);

  return pages.map((pageRows, pageIdx) => {
    const isLastPage = pageIdx === pages.length - 1;
    const headerBlockHeight = 85;
    const canvasHeight =
      padding +
      headerBlockHeight +
      tableHeaderHeight +
      pageRows.length * rowHeight +
      (isLastPage ? rowHeight + 8 : 0) +
      padding;

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth * scale;
    canvas.height = canvasHeight * scale;

    const ctx = canvas.getContext('2d')!;
    ctx.scale(scale, scale);

    // Canvas background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    ctx.textBaseline = 'middle';

    // 1. TOP HEADER BANNER
    ctx.fillStyle = settings.headerBgColor;
    ctx.fillRect(padding, padding, tableTotalWidth, 70);

    // Accent Line
    ctx.fillStyle = settings.accentColor;
    ctx.fillRect(padding, padding + 67, tableTotalWidth, 3);

    // Header Text
    ctx.fillStyle = settings.headerTextColor;
    ctx.font = `bold 16px ${FONT_FAMILY}`;
    ctx.textAlign = 'left';
    ctx.fillText(`${settings.companyName} — ${settings.reportTitle}`, padding + 16, padding + 26);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = `12px ${FONT_FAMILY}`;
    const formattedDate = formatDate(reportDate || new Date());
    const pageText = pages.length > 1 ? ` | Page ${pageIdx + 1} of ${pages.length}` : '';
    ctx.fillText(
      `Salesperson: ${group.name} | Customers: ${group.customersCount} | As of: ${formattedDate}${pageText}`,
      padding + 16,
      padding + 48
    );

    let currentY = padding + headerBlockHeight;
    let currentX = padding;

    // 2. TABLE HEADERS
    selectedCols.forEach((col, k) => {
      ctx.fillStyle = '#19376d';
      ctx.fillRect(currentX, currentY, colWidths[k], tableHeaderHeight);

      // Divider line
      ctx.strokeStyle = settings.accentColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(currentX + 0.5, currentY + 0.5, colWidths[k] - 1, tableHeaderHeight - 1);

      ctx.fillStyle = '#ffffff';
      ctx.font = `bold 12px ${FONT_FAMILY}`;
      ctx.textAlign = 'center';

      const lines = headerWrapped[k];
      lines.forEach((line, lineIdx) => {
        const lineY = currentY + tableHeaderHeight / 2 + (lineIdx - (lines.length - 1) / 2) * 16;
        ctx.fillText(line, currentX + colWidths[k] / 2, lineY);
      });

      currentX += colWidths[k];
    });

    currentY += tableHeaderHeight;

    // 3. DATA ROWS
    pageRows.forEach((record, rowIdx) => {
      currentX = padding;
      const isEven = rowIdx % 2 === 0;

      selectedCols.forEach((col, colIdx) => {
        const rawVal = record.raw[col.originalHeader] ?? record.raw[col.id];
        const numResult = parseNumber(rawVal);

        // Highlight OVERDUE or Over Limit values in Red
        const isHighlightNeeded =
          col.isOverdue || (col.isAmount && col.label.toLowerCase().includes('limit') && numResult.n > 0);

        if (isHighlightNeeded && numResult.n > 0) {
          ctx.fillStyle = settings.overdueBgColor;
        } else {
          ctx.fillStyle = isEven ? '#ffffff' : '#f8fafc';
        }

        ctx.fillRect(currentX, currentY, colWidths[colIdx], rowHeight);

        // Border line
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1;
        ctx.strokeRect(currentX + 0.5, currentY + 0.5, colWidths[colIdx] - 1, rowHeight - 1);

        // Cell Text
        let cellTextStr = cleanString(rawVal);
        if (col.isAmount) {
          cellTextStr = numResult.n === 0 ? '-' : formatCurrency(numResult.n);
          ctx.font = `${isHighlightNeeded && numResult.n > 0 ? 'bold ' : ''}13px ${MONO_FONT_FAMILY}`;
        } else {
          ctx.font = `13px ${FONT_FAMILY}`;
        }

        if (isHighlightNeeded && numResult.n > 0) {
          ctx.fillStyle = settings.overdueTextColor;
        } else {
          ctx.fillStyle = '#0f172a';
        }

        if (colIdx === 0) {
          ctx.textAlign = 'left';
          ctx.fillText(truncateText(ctx, cellTextStr, colWidths[colIdx] - 16), currentX + 10, currentY + rowHeight / 2);
        } else if (col.isAmount) {
          ctx.textAlign = 'right';
          ctx.fillText(cellTextStr, currentX + colWidths[colIdx] - 10, currentY + rowHeight / 2);
        } else {
          ctx.textAlign = 'center';
          ctx.fillText(truncateText(ctx, cellTextStr, colWidths[colIdx] - 10), currentX + colWidths[colIdx] / 2, currentY + rowHeight / 2);
        }

        currentX += colWidths[colIdx];
      });

      currentY += rowHeight;
    });

    // 4. GRAND TOTAL ROW (on last page)
    if (isLastPage) {
      currentY += 2;
      currentX = padding;

      selectedCols.forEach((col, colIdx) => {
        ctx.fillStyle = settings.grandTotalBgColor;
        ctx.fillRect(currentX, currentY, colWidths[colIdx], rowHeight);

        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1;
        ctx.strokeRect(currentX + 0.5, currentY + 0.5, colWidths[colIdx] - 1, rowHeight - 1);

        ctx.font = `bold 13px ${col.isAmount ? MONO_FONT_FAMILY : FONT_FAMILY}`;

        if (colIdx === 0) {
          ctx.fillStyle = '#0f172a';
          ctx.textAlign = 'left';
          ctx.fillText('Grand Total', currentX + 10, currentY + rowHeight / 2);
        } else if (totals[colIdx] !== null) {
          ctx.textAlign = 'right';
          ctx.fillStyle = col.isOverdue ? settings.overdueTextColor : '#0f172a';
          ctx.fillText(formatCurrency(totals[colIdx]!), currentX + colWidths[colIdx] - 10, currentY + rowHeight / 2);
        }

        currentX += colWidths[colIdx];
      });

      // Double underline accent for totals
      ctx.fillStyle = '#0b2447';
      ctx.fillRect(padding, currentY, tableTotalWidth, 2);
      ctx.fillRect(padding, currentY + rowHeight, tableTotalWidth, 2);
    }

    return canvas;
  });
};

export const canvasToDataURL = (canvas: HTMLCanvasElement): string => {
  return canvas.toDataURL('image/png');
};

export const canvasToBlob = (canvas: HTMLCanvasElement): Promise<Blob> => {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
    }, 'image/png');
  });
};

export const downloadCanvasImage = (canvas: HTMLCanvasElement, filename: string) => {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const copyCanvasToClipboard = async (canvas: HTMLCanvasElement): Promise<boolean> => {
  if (!navigator.clipboard || !window.ClipboardItem) return false;
  try {
    const blob = await canvasToBlob(canvas);
    const item = new ClipboardItem({ 'image/png': blob });
    await navigator.clipboard.write([item]);
    return true;
  } catch (err) {
    console.warn('Clipboard copy failed:', err);
    return false;
  }
};
