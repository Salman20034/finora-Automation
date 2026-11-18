import React, { useState } from 'react';
import { Settings as SettingsIcon, Key, CheckCircle2, AlertCircle, RefreshCw, Save, ShieldCheck } from 'lucide-react';
import { WhatsAppApiConfig } from '../types';

interface SettingsPageProps {
  apiConfig: WhatsAppApiConfig;
  onUpdateApiConfig: (config: WhatsAppApiConfig) => void;
  onToast: (msg: string) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  apiConfig,
  onUpdateApiConfig,
  onToast,
}) => {
  const [form, setForm] = useState<WhatsAppApiConfig>({ ...apiConfig });
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; msg?: string } | null>(null);

  const handleSave = () => {
    onUpdateApiConfig({
      ...form,
      isConfigured: !!(form.phoneNumberId && form.accessToken),
    });
    onToast('Settings saved successfully.');
  };

  const handleTestApi = async () => {
    if (!form.phoneNumberId || !form.accessToken) {
      setTestResult({
        success: false,
        msg: 'Please enter both Meta Phone Number ID and Access Token before testing.',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/whatsapp/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumberId: form.phoneNumberId,
          accessToken: form.accessToken,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setTestResult({
          success: true,
          msg: `Connected successfully! Phone Number: ${data.displayPhoneNumber || 'Verified'} (${data.verifiedName || 'Meta WhatsApp Account'})`,
        });
        onUpdateApiConfig({ ...form, isConfigured: true });
      } else {
        setTestResult({
          success: false,
          msg: data.error || 'Failed to verify credentials with Meta Graph API.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        msg: err.message || 'Error reaching backend server endpoint.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#091322] border border-slate-800 rounded-2xl p-6 shadow-lg space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
              <SettingsIcon className="w-6 h-6 text-[#c9a227]" />
              <span>FINORA System & WhatsApp API Settings</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Configure Meta WhatsApp Business Cloud API credentials, sending delay, and default templates.
            </p>
          </div>

          <button
            onClick={handleSave}
            className="flex items-center gap-2 bg-[#c9a227] hover:bg-[#e5ba33] text-[#0b2447] font-bold px-5 py-2.5 rounded-xl text-xs shadow-md transition-all shrink-0"
          >
            <Save className="w-4 h-4" />
            <span>Save All Settings</span>
          </button>
        </div>

        {/* Meta WhatsApp API Cloud Configuration */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Key className="w-4 h-4 text-[#c9a227]" />
              <span>Official Meta WhatsApp Business Cloud API Credentials</span>
            </h3>
            <span
              className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                apiConfig.isConfigured
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {apiConfig.isConfigured ? 'API Connected' : 'Not Configured'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Meta Phone Number ID *
              </label>
              <input
                type="text"
                value={form.phoneNumberId}
                onChange={(e) => setForm({ ...form, phoneNumberId: e.target.value })}
                placeholder="e.g. 100594839201948"
                className="w-full bg-slate-950 border border-slate-700 text-white font-mono text-xs px-3 py-2.5 rounded-xl focus:border-[#c9a227] focus:outline-none"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                From Meta Developer Portal -&gt; WhatsApp -&gt; API Setup
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Permanent / System User Access Token *
              </label>
              <input
                type="password"
                value={form.accessToken}
                onChange={(e) => setForm({ ...form, accessToken: e.target.value })}
                placeholder="EAAG..."
                className="w-full bg-slate-950 border border-slate-700 text-white font-mono text-xs px-3 py-2.5 rounded-xl focus:border-[#c9a227] focus:outline-none"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Meta Access Token stored securely on server proxy
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                WhatsApp Business Account (WABA) ID
              </label>
              <input
                type="text"
                value={form.wabaId}
                onChange={(e) => setForm({ ...form, wabaId: e.target.value })}
                placeholder="e.g. 209485039281"
                className="w-full bg-slate-950 border border-slate-700 text-white font-mono text-xs px-3 py-2.5 rounded-xl focus:border-[#c9a227] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Webhook Verify Token
              </label>
              <input
                type="text"
                value={form.webhookVerifyToken}
                onChange={(e) => setForm({ ...form, webhookVerifyToken: e.target.value })}
                placeholder="finora_verify_token"
                className="w-full bg-slate-950 border border-slate-700 text-white font-mono text-xs px-3 py-2.5 rounded-xl focus:border-[#c9a227] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handleTestApi}
              disabled={isTesting}
              className="flex items-center gap-2 bg-[#0b2447] hover:bg-[#19376d] text-[#e5ba33] border border-[#c9a227]/40 font-bold px-4 py-2 rounded-xl text-xs transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'Testing Connection...' : 'Test Meta API Connection'}</span>
            </button>

            {testResult && (
              <div
                className={`text-xs font-semibold flex items-center gap-2 ${
                  testResult.success ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {testResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{testResult.msg}</span>
              </div>
            )}
          </div>
        </div>

        {/* Dispatch Options */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h3 className="font-bold text-white text-sm border-b border-slate-800 pb-3">
            Automation Delay & Sending Queue Controls
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Sequential Sending Delay ({form.sendDelaySec} Seconds)
              </label>
              <input
                type="range"
                min="1"
                max="15"
                value={form.sendDelaySec}
                onChange={(e) => setForm({ ...form, sendDelaySec: parseInt(e.target.value) })}
                className="w-full accent-[#c9a227]"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Controls delay between sending each salesperson image to prevent WhatsApp rate limits.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
