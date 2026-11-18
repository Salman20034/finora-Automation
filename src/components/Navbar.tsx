import React from 'react';
import {
  LayoutDashboard,
  FileSpreadsheet,
  SlidersHorizontal,
  Users,
  CheckCircle2,
  Image as ImageIcon,
  Send,
  History,
  Settings as SettingsIcon,
  Sparkles,
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  reportLoaded: boolean;
  contactsLoaded: boolean;
  validated: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  reportLoaded,
  contactsLoaded,
  validated,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, step: 0 },
    { id: 'upload-report', label: '1. Report Upload', icon: FileSpreadsheet, step: 1, ready: reportLoaded },
    { id: 'column-config', label: '2. Column Config', icon: SlidersHorizontal, step: 2, ready: reportLoaded },
    { id: 'contacts', label: '3. Contacts', icon: Users, step: 3, ready: contactsLoaded },
    { id: 'validation', label: '4. Validation & Match', icon: CheckCircle2, step: 4, ready: reportLoaded },
    { id: 'image-preview', label: '5. Image Preview', icon: ImageIcon, step: 5, ready: reportLoaded },
    { id: 'whatsapp-automation', label: '6. WhatsApp Sending', icon: Send, step: 6, ready: validated },
    { id: 'history', label: 'History Log', icon: History, step: 7 },
    { id: 'settings', label: 'Settings', icon: SettingsIcon, step: 8 },
  ];

  return (
    <header className="bg-gradient-to-r from-[#060d17] via-[#0b2447] to-[#19376d] border-b-2 border-[#c9a227] text-white sticky top-0 z-40 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand Logo */}
          <div
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-3 cursor-pointer group shrink-0"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#c9a227] to-[#e5ba33] text-[#0b2447] font-extrabold flex items-center justify-center text-lg shadow-md group-hover:scale-105 transition-transform">
              F
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-white group-hover:text-[#c9a227] transition-colors">
                  FINORA AUTOMATION
                </span>
                <span className="bg-[#c9a227]/20 border border-[#c9a227]/40 text-[#e5ba33] text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Pro
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium hidden sm:block">
                Smart Financial Communication & WhatsApp Engine
              </p>
            </div>
          </div>

          {/* Quick Badges */}
          <div className="hidden lg:flex items-center gap-2 text-xs font-medium">
            <span
              className={`px-2.5 py-1 rounded-full border ${
                reportLoaded
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              Report: {reportLoaded ? 'Loaded' : 'Pending'}
            </span>
            <span
              className={`px-2.5 py-1 rounded-full border ${
                contactsLoaded
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              Contacts: {contactsLoaded ? 'Loaded' : 'Pending'}
            </span>
          </div>
        </div>

        {/* Workflow Stepper Bar */}
        <div className="flex items-center gap-1 overflow-x-auto py-2 border-t border-slate-700/50 scrollbar-none text-xs">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg whitespace-nowrap transition-all font-medium shrink-0 ${
                  isActive
                    ? 'bg-[#c9a227] text-[#0b2447] font-bold shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#0b2447]' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.ready && !isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
