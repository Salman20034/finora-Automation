import { WhatsAppApiConfig, SalespersonGroup, ExcelColumnConfig } from '../types';
import { formatCurrency, formatDate, cleanString } from './excelParser';
import { canvasToDataURL, generateSalespersonReportCanvases } from './imageGenerator';

export const buildTextMessageText = (
  group: SalespersonGroup,
  columns: ExcelColumnConfig[],
  reportDate: string
): string => {
  const selectedCols = columns.filter((c) => c.show && c.includeInWhatsApp);
  const formattedDate = formatDate(reportDate || new Date());

  const header = `Dear ${group.name},\n\nPlease find below your customer-wise overdue ageing report as of *${formattedDate}*.\n\n`;

  const blocks = group.rows.map((r, k) => {
    const lines = selectedCols
      .map((col) => {
        const val = r.raw[col.originalHeader] ?? r.raw[col.id];
        let str = cleanString(val);
        if (col.isAmount) {
          const p = parseFloat(String(val).replace(/,/g, ''));
          str = isNaN(p) || p === 0 ? '-' : formatCurrency(p);
        }
        return str === '' || str === '-' ? null : `    ${col.label}: ${str}`;
      })
      .filter(Boolean);
    return `*${k + 1}. ${r.customerName || `Customer #${k + 1}`}*\n${lines.join('\n')}`;
  });

  let summary = `\n\n*SUMMARY FOR ${group.name.toUpperCase()}:*\n`;
  summary += `• Total Customers: ${group.customersCount}\n`;
  summary += `• Total Outstanding: SAR ${formatCurrency(group.totalOutstanding)}\n`;
  summary += `• Total Overdue: SAR ${formatCurrency(group.totalOverdue)}\n`;
  if (group.totalOverLimit > 0) {
    summary += `• Total Over Limit: SAR ${formatCurrency(group.totalOverLimit)}\n`;
  }
  summary += `\nKindly review the outstanding balances and coordinate with your customers for collection follow-up. Please share payment updates.\n\nThank you,\n*FINORA AUTOMATION | Financial Control Dept*`;

  return header + blocks.join('\n\n') + summary;
};

export const buildWaMeUrl = (phone: string, textMessage: string): string => {
  const cleanPhone = phone.replace(/\D/g, '');
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(textMessage)}`;
};

export interface SendWhatsAppImageParams {
  phoneNumber: string;
  imageCanvas: HTMLCanvasElement;
  caption: string;
  apiConfig: WhatsAppApiConfig;
}

export interface SendWhatsAppResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export const sendWhatsAppImageApi = async (
  params: SendWhatsAppImageParams
): Promise<SendWhatsAppResult> => {
  const { phoneNumber, imageCanvas, caption, apiConfig } = params;

  if (!apiConfig.phoneNumberId || !apiConfig.accessToken) {
    return {
      success: false,
      error: 'WhatsApp Business API credentials (Phone Number ID / Access Token) are not configured.',
    };
  }

  try {
    const imageDataUrl = canvasToDataURL(imageCanvas);

    // Call backend proxy or Meta Graph API
    const response = await fetch('/api/whatsapp/send-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumber: phoneNumber.replace(/\D/g, ''),
        imageDataUrl,
        caption,
        phoneNumberId: apiConfig.phoneNumberId,
        accessToken: apiConfig.accessToken,
      }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      return {
        success: true,
        messageId: data.messageId || `wamid.${Date.now()}`,
      };
    } else {
      return {
        success: false,
        error: data.error || 'Failed to send image via Meta WhatsApp Business API.',
      };
    }
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Network error communicating with WhatsApp API server.',
    };
  }
};

export const sendWhatsAppWebPlaywrightReport = async (params: {
  salespersonName: string;
  phone: string;
  imageCanvas: HTMLCanvasElement;
  mode: 'attach_and_review' | 'automated_send';
}): Promise<{ success: boolean; status: string; error?: string }> => {
  try {
    const imageDataUrl = canvasToDataURL(params.imageCanvas);
    const res = await fetch('/api/whatsapp-web/send-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        salespersonName: params.salespersonName,
        phone: params.phone,
        imageDataUrl,
        mode: params.mode,
      }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, status: 'failed', error: err.message || 'Error communicating with local WhatsApp Web bridge' };
  }
};

