import React, { useState } from 'react';
import { Users, Upload, Plus, Trash2, Edit2, CheckCircle2, AlertTriangle, Download, Search, PhoneCall } from 'lucide-react';
import { SalespersonContact, ContactUploadData } from '../types';
import {
  readWorkbook,
  getSheetRows,
  guessHeaderRow,
  parseTableFromRows,
  buildPhoneNumber,
  cleanString,
  suggestColumnMapping,
} from '../utils/excelParser';

interface SalespersonContactsPageProps {
  contacts: SalespersonContact[];
  contactUpload: ContactUploadData | null;
  onUpdateContacts: (contacts: SalespersonContact[]) => void;
  onUploadContactSuccess: (data: ContactUploadData) => void;
  onNext: () => void;
}

export const SalespersonContactsPage: React.FC<SalespersonContactsPageProps> = ({
  contacts,
  contactUpload,
  onUpdateContacts,
  onUploadContactSuccess,
  onNext,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<any>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [headerRow, setHeaderRow] = useState<number>(1);
  const [headers, setHeaders] = useState<string[]>([]);
  const [allRows, setAllRows] = useState<any[][]>([]);

  const [nameCol, setNameCol] = useState<number>(-1);
  const [ccCol, setCcCol] = useState<number>(-1);
  const [mobCol, setMobCol] = useState<number>(-1);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterValid, setFilterValid] = useState<string>('all');

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', countryCode: '966', mobile: '' });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);

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
      setHeaders(parsed.headers);

      const nCol = suggestColumnMapping(parsed.headers, /sales|rep\b|executive|employee|name/i);
      const cCol = suggestColumnMapping(parsed.headers, /country|isd|dial|^code|cc\b/i);
      const mCol = suggestColumnMapping(parsed.headers, /mobile|whats|phone|cell|contact|tel|number/i);

      setNameCol(nCol >= 0 ? nCol : 0);
      setCcCol(cCol);
      setMobCol(mCol >= 0 ? mCol : 1);

      if (nCol >= 0 && mCol >= 0) {
        processAndSetContacts(parsed.dataRows, nCol, cCol, mCol);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const processAndSetContacts = (
    dataRows: { rowNo: number; values: any[] }[],
    nameIdx: number,
    ccIdx: number,
    mobIdx: number
  ) => {
    const hasCC = ccIdx >= 0;
    const newContacts: SalespersonContact[] = [];

    dataRows.forEach((row) => {
      const name = cleanString(row.values[nameIdx]);
      if (!name) return;

      const ccVal = hasCC ? row.values[ccIdx] : '';
      const mobVal = mobIdx >= 0 ? row.values[mobIdx] : '';
      const phoneRes = buildPhoneNumber(ccVal, mobVal, hasCC);

      newContacts.push({
        id: `c_${row.rowNo}_${Math.random()}`,
        name,
        key: name.toLowerCase(),
        countryCode: cleanString(ccVal),
        mobile: cleanString(mobVal),
        fullPhone: phoneRes.phone,
        isValid: phoneRes.isValid,
        reason: phoneRes.reason,
        rowNo: row.rowNo,
      });
    });

    onUpdateContacts(newContacts);
  };

  const handleConfirmMapping = () => {
    if (nameCol < 0 || mobCol < 0 || !allRows.length) return;
    const parsed = parseTableFromRows(allRows, headerRow);
    processAndSetContacts(parsed.dataRows, nameCol, ccCol, mobCol);
    if (file) {
      onUploadContactSuccess({
        fileName: file.name,
        sheetName: selectedSheet,
        headerRow,
        headers,
        nameColIndex: nameCol,
        countryCodeColIndex: ccCol,
        mobileColIndex: mobCol,
      });
    }
  };

  const handleSaveContactModal = () => {
    if (!formData.name.trim() || !formData.mobile.trim()) return;
    const phoneRes = buildPhoneNumber(formData.countryCode, formData.mobile, !!formData.countryCode);

    if (editingId) {
      const updated = contacts.map((c) =>
        c.id === editingId
          ? {
              ...c,
              name: formData.name.trim(),
              key: formData.name.trim().toLowerCase(),
              countryCode: formData.countryCode.trim(),
              mobile: formData.mobile.trim(),
              fullPhone: phoneRes.phone,
              isValid: phoneRes.isValid,
              reason: phoneRes.reason,
            }
          : c
      );
      onUpdateContacts(updated);
    } else {
      const newContact: SalespersonContact = {
        id: `manual_${Date.now()}`,
        name: formData.name.trim(),
        key: formData.name.trim().toLowerCase(),
        countryCode: formData.countryCode.trim(),
        mobile: formData.mobile.trim(),
        fullPhone: phoneRes.phone,
        isValid: phoneRes.isValid,
        reason: phoneRes.reason,
      };
      onUpdateContacts([...contacts, newContact]);
    }

    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ name: '', countryCode: '966', mobile: '' });
  };

  const handleDelete = (id: string) => {
    onUpdateContacts(contacts.filter((c) => c.id !== id));
  };

  const handleEdit = (c: SalespersonContact) => {
    setEditingId(c.id);
    setFormData({ name: c.name, countryCode: c.countryCode || '966', mobile: c.mobile });
    setIsModalOpen(true);
  };

  const filteredContacts = contacts.filter((c) => {
    const matchesQ = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.fullPhone.includes(searchQuery);
    if (filterValid === 'valid') return matchesQ && c.isValid;
    if (filterValid === 'invalid') return matchesQ && !c.isValid;
    return matchesQ;
  });

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-[#091322] border border-slate-800 rounded-2xl p-6 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-[#c9a227]" />
              <span>Step 3: Salesperson WhatsApp Directory</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Upload contact Excel or manage verified WhatsApp numbers and international dialing codes.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setEditingId(null);
                setFormData({ name: '', countryCode: '966', mobile: '' });
                setIsModalOpen(true);
              }}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold px-4 py-2.5 rounded-xl text-xs border border-slate-700 transition-colors"
            >
              <Plus className="w-4 h-4 text-[#c9a227]" />
              <span>Add Contact Manually</span>
            </button>

            <button
              onClick={onNext}
              className="flex items-center gap-2 bg-[#c9a227] hover:bg-[#e5ba33] text-[#0b2447] font-bold px-5 py-2.5 rounded-xl text-xs shadow-md transition-all shrink-0"
            >
              <span>Validate & Match Salespeople</span>
            </button>
          </div>
        </div>

        {/* Contact Excel Upload Box */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="md:col-span-1">
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Upload Contact Excel File
            </label>
            <div className="relative border-2 border-dashed border-slate-700 hover:border-[#c9a227] bg-slate-900/60 rounded-xl p-3 text-center cursor-pointer transition-colors group">
              <input
                type="file"
                accept=".xlsx,.xls,.xlsm,.csv"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload className="w-6 h-6 text-slate-400 group-hover:text-[#c9a227] mx-auto mb-1 transition-colors" />
              <p className="text-xs font-bold text-slate-200">{file ? file.name : 'Upload Contact Excel'}</p>
            </div>
          </div>

          {headers.length > 0 && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Salesperson Name *</label>
                <select
                  value={nameCol}
                  onChange={(e) => setNameCol(parseInt(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl p-2.5 focus:border-[#c9a227] focus:outline-none"
                >
                  {headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Country Code (Optional)</label>
                <select
                  value={ccCol}
                  onChange={(e) => setCcCol(parseInt(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl p-2.5 focus:border-[#c9a227] focus:outline-none"
                >
                  <option value="-1">— None (Number has ISD code) —</option>
                  {headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Mobile Number *</label>
                <select
                  value={mobCol}
                  onChange={(e) => setMobCol(parseInt(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl p-2.5 focus:border-[#c9a227] focus:outline-none"
                >
                  {headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h}
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleConfirmMapping}
                  className="mt-2 w-full bg-[#c9a227] text-[#0b2447] text-xs font-bold py-1.5 rounded-lg hover:brightness-110"
                >
                  Apply Mapping
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Directory Search & Table */}
      <div className="bg-[#091322] border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-white text-base">Contact Database ({contacts.length} Total)</h3>
            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs px-2.5 py-0.5 rounded-full font-bold">
              {contacts.filter((c) => c.isValid).length} Valid WhatsApp
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search name or number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-200 text-xs pl-9 pr-3 py-2 rounded-xl focus:border-[#c9a227] focus:outline-none"
              />
            </div>

            <select
              value={filterValid}
              onChange={(e) => setFilterValid(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs px-3 py-2 rounded-xl focus:border-[#c9a227] focus:outline-none"
            >
              <option value="all">All Contacts</option>
              <option value="valid">Valid WhatsApp Only</option>
              <option value="invalid">Invalid / Missing Only</option>
            </select>
          </div>
        </div>

        {/* Contacts Table */}
        <div className="overflow-x-auto border border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#0b2447] text-white font-semibold">
                <th className="py-2.5 px-3 text-center">Row</th>
                <th className="py-2.5 px-4">Salesperson Name</th>
                <th className="py-2.5 px-4">Country Code</th>
                <th className="py-2.5 px-4">Mobile Number</th>
                <th className="py-2.5 px-4">Full WhatsApp Number</th>
                <th className="py-2.5 px-4 text-center">Status</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/50 text-slate-300">
              {filteredContacts.map((c, idx) => (
                <tr key={c.id} className="hover:bg-slate-800/40">
                  <td className="py-2.5 px-3 text-center font-bold text-slate-400">{c.rowNo || idx + 1}</td>
                  <td className="py-2.5 px-4 font-semibold text-white">{c.name}</td>
                  <td className="py-2.5 px-4 font-mono text-slate-400">{c.countryCode || '—'}</td>
                  <td className="py-2.5 px-4 font-mono text-slate-400">{c.mobile || '—'}</td>
                  <td className="py-2.5 px-4 font-mono font-bold text-emerald-400">
                    {c.fullPhone ? `+${c.fullPhone}` : '—'}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    {c.isValid ? (
                      <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                        Valid
                      </span>
                    ) : (
                      <span
                        title={c.reason}
                        className="bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase cursor-help"
                      >
                        {c.reason || 'Invalid'}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(c)}
                        className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Add / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#091322] border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-3">
              {editingId ? 'Edit Salesperson Contact' : 'Add New Salesperson Contact'}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Salesperson Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Ibrahim Sulaiman"
                  className="w-full bg-slate-900 border border-slate-700 text-white text-xs px-3 py-2 rounded-xl focus:border-[#c9a227] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Country Code (ISD)</label>
                <input
                  type="text"
                  value={formData.countryCode}
                  onChange={(e) => setFormData({ ...formData, countryCode: e.target.value })}
                  placeholder="e.g. 966"
                  className="w-full bg-slate-900 border border-slate-700 text-white text-xs px-3 py-2 rounded-xl focus:border-[#c9a227] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Mobile Number *</label>
                <input
                  type="text"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  placeholder="e.g. 501234567"
                  className="w-full bg-slate-900 border border-slate-700 text-white text-xs px-3 py-2 rounded-xl focus:border-[#c9a227] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsModalOpen(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-4 py-2 rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveContactModal}
                className="bg-[#c9a227] hover:bg-[#e5ba33] text-[#0b2447] font-bold px-4 py-2 rounded-xl text-xs"
              >
                Save Contact
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
