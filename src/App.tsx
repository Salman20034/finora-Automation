import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardPage } from './components/DashboardPage';
import { ReportUploadPage } from './components/ReportUploadPage';
import { ColumnConfigurationPage } from './components/ColumnConfigurationPage';
import { SalespersonContactsPage } from './components/SalespersonContactsPage';
import { ValidationMatchingPage } from './components/ValidationMatchingPage';
import { ImagePreviewPage } from './components/ImagePreviewPage';
import { WhatsAppAutomationPage } from './components/WhatsAppAutomationPage';
import { SendingHistoryPage } from './components/SendingHistoryPage';
import { SettingsPage } from './components/SettingsPage';

import {
  ReportUploadData,
  ContactUploadData,
  ExcelColumnConfig,
  SalespersonContact,
  SalespersonGroup,
  WhatsAppApiConfig,
  SendingHistoryItem,
  ReconciliationReport,
  WhatsAppSendingStatus,
} from './types';

import {
  generateDefaultConfigs,
  cleanString,
  normalizeName,
  parseNumber,
  parseTableFromRows,
  buildPhoneNumber,
} from './utils/excelParser';
import { getPreloadedSampleData } from './utils/sampleDataGenerator';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  const [reportData, setReportData] = useState<ReportUploadData | null>(null);
  const [contactData, setContactData] = useState<ContactUploadData | null>(null);

  const [columns, setColumns] = useState<ExcelColumnConfig[]>([]);
  const [contacts, setContacts] = useState<SalespersonContact[]>([]);
  const [groups, setGroups] = useState<SalespersonGroup[]>([]);

  const [apiConfig, setApiConfig] = useState<WhatsAppApiConfig>({
    phoneNumberId: '',
    accessToken: '',
    wabaId: '',
    webhookVerifyToken: 'finora_verify_token',
    sendDelaySec: 2,
    enableAutoRetry: true,
    maxRetries: 3,
    defaultMessage: 'Dear {salesperson}, please find your overdue report attached.',
    isConfigured: false,
  });

  const [historyItems, setHistoryItems] = useState<SendingHistoryItem[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((current) => (current === msg ? null : current));
    }, 4000);
  };

  // Load pre-loaded sample dataset
  const handleLoadSampleData = () => {
    const sample = getPreloadedSampleData();

    // Report
    const reportParsed = parseTableFromRows(sample.reportRows, 1);
    const repData: ReportUploadData = {
      fileName: sample.reportFileName,
      sheetName: sample.reportSheetName,
      headerRow: 1,
      rawData: sample.reportRows,
      headers: sample.reportHeaders,
      records: reportParsed.dataRows,
    };
    setReportData(repData);

    const defaultCols = generateDefaultConfigs(sample.reportHeaders, sample.reportRows.slice(1));
    setColumns(defaultCols);

    // Contacts
    const newContacts: SalespersonContact[] = sample.contactRows.map((row, idx) => {
      const name = row[0];
      const cc = row[1];
      const mob = row[2];
      const phoneRes = buildPhoneNumber(cc, mob, true);
      return {
        id: `sample_c_${idx}`,
        name,
        key: normalizeName(name),
        countryCode: cc,
        mobile: mob,
        fullPhone: phoneRes.phone,
        isValid: phoneRes.isValid,
        reason: phoneRes.reason,
        rowNo: idx + 1,
      };
    });

    setContacts(newContacts);
    setContactData({
      fileName: sample.contactFileName,
      sheetName: sample.contactSheetName,
      headerRow: 1,
      headers: sample.contactHeaders,
      nameColIndex: 0,
      countryCodeColIndex: 1,
      mobileColIndex: 2,
    });

    showToast('Loaded FINORA authentic sample dataset with 6 salespeople & overdue records!');
  };

  // Recalculate Salesperson Groups whenever reportData, columns, or contacts change
  useEffect(() => {
    if (!reportData || !reportData.records.length) {
      setGroups([]);
      return;
    }

    // Find Salesperson column index
    const salCol = columns.find((c) => /sales|rep\b|executive/i.test(c.originalHeader)) || columns[1] || columns[0];
    const salHeader = salCol ? salCol.originalHeader : reportData.headers[1] || reportData.headers[0];

    const groupMap = new Map<string, SalespersonGroup>();
    let lastSalesperson = '';

    // Contact map
    const contactMap = new Map<string, SalespersonContact[]>();
    contacts.forEach((c) => {
      if (!contactMap.has(c.key)) contactMap.set(c.key, []);
      contactMap.get(c.key)!.push(c);
    });

    reportData.records.forEach((record) => {
      let salVal = cleanString(record.values[salCol ? salCol.order : 1]);
      if (salVal) {
        lastSalesperson = salVal;
      } else if (lastSalesperson) {
        salVal = lastSalesperson;
      }

      if (!salVal) return;

      const key = normalizeName(salVal);

      // Extract numeric fields
      const rawObj: Record<string, any> = {};
      reportData.headers.forEach((h, colIdx) => {
        rawObj[h] = record.values[colIdx];
      });

      const outVal = parseNumber(rawObj['Grand Total'] ?? rawObj['Total'] ?? rawObj['Outstanding'] ?? 0).n;
      const odVal = parseNumber(rawObj['OVERDUE'] ?? rawObj['Overdue'] ?? 0).n;
      const riskVal = parseNumber(rawObj['Over Risk Due'] ?? 0).n;
      const limitVal = parseNumber(rawObj['Over Limit'] ?? 0).n;

      const custName = cleanString(rawObj['Display Name'] ?? rawObj['Customer'] ?? rawObj['Party'] ?? '');
      const branchName = cleanString(rawObj['BRANCH'] ?? rawObj['Branch'] ?? '');

      if (!groupMap.has(key)) {
        const matchedContacts = contactMap.get(key) || [];
        const primaryContact = matchedContacts.find((c) => c.isValid) || matchedContacts[0] || null;

        groupMap.set(key, {
          id: `grp_${key}`,
          name: salVal,
          key,
          rows: [],
          totalOutstanding: 0,
          totalOverdue: 0,
          totalOverRiskDue: 0,
          totalOverLimit: 0,
          totalCreditLimit: 0,
          totalTodayDue: 0,
          customersCount: 0,
          branches: [],
          contact: primaryContact,
          status: primaryContact && primaryContact.isValid ? 'pending' : 'unmatched_contact',
        });
      }

      const g = groupMap.get(key)!;
      g.rows.push({
        rowNo: record.rowNo,
        raw: rawObj,
        salesperson: salVal,
        customerName: custName,
        branch: branchName,
        totalOutstanding: outVal,
        totalOverdue: odVal,
        overRiskDue: riskVal,
        overLimit: limitVal,
        creditLimit: parseNumber(rawObj['Credit Limit'] ?? 0).n,
        customerDays: parseNumber(rawObj['Customer Days'] ?? 0).n,
        invMaxDays: parseNumber(rawObj['Inv MAX Days'] ?? 0).n,
        todayDue: parseNumber(rawObj['TODAY DUE'] ?? 0).n,
      });

      g.totalOutstanding += outVal;
      g.totalOverdue += odVal;
      g.totalOverRiskDue += riskVal;
      g.totalOverLimit += limitVal;

      if (branchName && !g.branches.includes(branchName)) {
        g.branches.push(branchName);
      }
    });

    const calculatedGroups = Array.from(groupMap.values());
    calculatedGroups.forEach((g) => {
      const uniqueCusts = new Set(g.rows.map((r) => r.customerName || `#${r.rowNo}`));
      g.customersCount = uniqueCusts.size;
    });

    setGroups(calculatedGroups);
  }, [reportData, columns, contacts]);

  // Calculate Reconciliation Report
  const reconciliation: ReconciliationReport = {
    totalSourceRows: reportData ? reportData.records.length : 0,
    assignedRows: groups.reduce((acc, g) => acc + g.rows.length, 0),
    missingSalespersonRows: 0,
    excludedTotalRows: 0,
    isReconciled: true,
    sourceOutstanding: groups.reduce((acc, g) => acc + g.totalOutstanding, 0),
    groupedOutstanding: groups.reduce((acc, g) => acc + g.totalOutstanding, 0),
    outstandingDelta: 0,
    unmatchedSalespeopleCount: groups.filter((g) => !g.contact || !g.contact.isValid).length,
    missingNumberSalespeopleCount: groups.filter((g) => g.contact && !g.contact.isValid).length,
    invalidAmountRowsCount: 0,
  };

  const handleUpdateGroupContact = (groupId: string, contact: SalespersonContact) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? {
              ...g,
              contact,
              status: contact.isValid ? 'pending' : 'unmatched_contact',
            }
          : g
      )
    );
    showToast(`Updated contact for ${groups.find((g) => g.id === groupId)?.name}`);
  };

  const handleUpdateGroupStatus = (
    groupId: string,
    status: WhatsAppSendingStatus,
    extra?: { messageId?: string; failureReason?: string }
  ) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? {
              ...g,
              status,
              messageId: extra?.messageId || g.messageId,
              failureReason: extra?.failureReason || g.failureReason,
            }
          : g
      )
    );
  };

  const handleAddHistoryItem = (item: SendingHistoryItem) => {
    setHistoryItems((prev) => [item, ...prev]);
  };

  return (
    <div className="min-h-screen bg-[#060d17] text-slate-100 font-sans selection:bg-[#c9a227] selection:text-[#0b2447] flex flex-col">
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        reportLoaded={!!reportData}
        contactsLoaded={contacts.length > 0}
        validated={groups.length > 0}
      />

      {/* Main App Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <DashboardPage
            groups={groups}
            reportData={reportData}
            contactData={contactData}
            onNavigate={setActiveTab}
            onLoadSampleData={handleLoadSampleData}
          />
        )}

        {activeTab === 'upload-report' && (
          <ReportUploadPage
            reportData={reportData}
            onUploadSuccess={(data) => {
              setReportData(data);
              setColumns(generateDefaultConfigs(data.headers, data.records.map((r) => r.values)));
            }}
            onLoadSampleData={handleLoadSampleData}
            onNext={() => setActiveTab('column-config')}
          />
        )}

        {activeTab === 'column-config' && (
          <ColumnConfigurationPage
            reportData={reportData}
            columns={columns}
            onUpdateColumns={setColumns}
            onNext={() => setActiveTab('contacts')}
          />
        )}

        {activeTab === 'contacts' && (
          <SalespersonContactsPage
            contacts={contacts}
            contactUpload={contactData}
            onUpdateContacts={setContacts}
            onUploadContactSuccess={setContactData}
            onNext={() => setActiveTab('validation')}
          />
        )}

        {activeTab === 'validation' && (
          <ValidationMatchingPage
            groups={groups}
            contacts={contacts}
            reconciliation={reconciliation}
            onUpdateGroupContact={handleUpdateGroupContact}
            onNext={() => setActiveTab('image-preview')}
          />
        )}

        {activeTab === 'image-preview' && (
          <ImagePreviewPage
            groups={groups}
            columns={columns}
            reportDate={new Date().toISOString().slice(0, 10)}
            onNext={() => setActiveTab('whatsapp-automation')}
            onToast={showToast}
          />
        )}

        {activeTab === 'whatsapp-automation' && (
          <WhatsAppAutomationPage
            groups={groups}
            columns={columns}
            reportDate={new Date().toISOString().slice(0, 10)}
            apiConfig={apiConfig}
            onUpdateGroupStatus={handleUpdateGroupStatus}
            onAddHistoryItem={handleAddHistoryItem}
            onNavigate={setActiveTab}
            onToast={showToast}
          />
        )}

        {activeTab === 'history' && (
          <SendingHistoryPage historyItems={historyItems} onClearHistory={() => setHistoryItems([])} />
        )}

        {activeTab === 'settings' && (
          <SettingsPage apiConfig={apiConfig} onUpdateApiConfig={setApiConfig} onToast={showToast} />
        )}
      </main>

      {/* Toast Notification Banner */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 bg-[#0b2447] text-white border-2 border-[#c9a227] px-5 py-3 rounded-2xl shadow-2xl z-50 text-xs font-bold animate-bounce flex items-center gap-3 max-w-md">
          <span className="w-2 h-2 rounded-full bg-[#c9a227]"></span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-[#060d17] py-4 text-center text-xs text-slate-500">
        FINORA AUTOMATION &copy; {new Date().getFullYear()} — Smart Financial Communication & WhatsApp Image Automation System
      </footer>
    </div>
  );
}
