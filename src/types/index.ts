export interface ExcelColumnConfig {
  id: string;
  originalHeader: string;
  label: string;
  show: boolean;
  includeInWhatsApp: boolean;
  includeInExport: boolean;
  isAmount: boolean;
  isGrandTotalSum: boolean;
  isOverdue: boolean;
  order: number;
  sampleValue?: any;
}

export interface CustomerRecord {
  rowNo: number;
  raw: Record<string, any>;
  salesperson: string;
  customerName: string;
  branch: string;
  totalOutstanding: number;
  totalOverdue: number;
  overRiskDue: number;
  overLimit: number;
  creditLimit: number;
  customerDays: number;
  invMaxDays: number;
  todayDue: number;
}

export interface SalespersonContact {
  id: string;
  name: string;
  key: string;
  countryCode: string;
  mobile: string;
  fullPhone: string;
  isValid: boolean;
  reason: string;
  rowNo?: number;
}

export type WhatsAppSendingStatus =
  | 'pending'
  | 'image_generated'
  | 'chat_opened'
  | 'attaching_image'
  | 'image_attached'
  | 'queued'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed'
  | 'skipped'
  | 'unmatched_contact';

export interface WhatsAppWebBridgeStatus {
  isConnected: boolean;
  isQrNeeded: boolean;
  qrDataUrl?: string;
  sessionDir?: string;
  lastError?: string;
}

export interface SalespersonGroup {
  id: string;
  name: string;
  key: string;
  rows: CustomerRecord[];
  totalOutstanding: number;
  totalOverdue: number;
  totalOverRiskDue: number;
  totalOverLimit: number;
  totalCreditLimit: number;
  totalTodayDue: number;
  customersCount: number;
  branches: string[];
  contact: SalespersonContact | null;
  status: WhatsAppSendingStatus;
  messageId?: string;
  failureReason?: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  imageUrls?: string[];
  imageBlobs?: Blob[];
}

export interface WhatsAppApiConfig {
  phoneNumberId: string;
  accessToken: string;
  wabaId: string;
  webhookVerifyToken: string;
  sendDelaySec: number;
  enableAutoRetry: boolean;
  maxRetries: number;
  defaultMessage: string;
  isConfigured: boolean;
}

export interface ImageDesignSettings {
  headerBgColor: string;
  headerTextColor: string;
  accentColor: string;
  overdueBgColor: string;
  overdueTextColor: string;
  grandTotalBgColor: string;
  fontSize: number;
  rowHeight: number;
  maxRowsPerPage: number;
  showCompanyLogo: boolean;
  reportTitle: string;
  companyName: string;
}

export interface ReportUploadData {
  fileName: string;
  sheetName: string;
  headerRow: number;
  rawData: any[][];
  headers: string[];
  records: any[];
}

export interface ContactUploadData {
  fileName: string;
  sheetName: string;
  headerRow: number;
  headers: string[];
  nameColIndex: number;
  countryCodeColIndex: number;
  mobileColIndex: number;
}

export interface ReconciliationReport {
  totalSourceRows: number;
  assignedRows: number;
  missingSalespersonRows: number;
  excludedTotalRows: number;
  isReconciled: boolean;
  sourceOutstanding: number;
  groupedOutstanding: number;
  outstandingDelta: number;
  unmatchedSalespeopleCount: number;
  missingNumberSalespeopleCount: number;
  invalidAmountRowsCount: number;
}

export interface SendingHistoryItem {
  id: string;
  date: string;
  fileName: string;
  salespersonName: string;
  phone: string;
  customerCount: number;
  totalOutstanding: number;
  totalOverdue: number;
  status: WhatsAppSendingStatus;
  messageId?: string;
  sentAt: string;
  failureReason?: string;
  mode: 'api' | 'manual' | 'web_share' | 'wa_me';
}
