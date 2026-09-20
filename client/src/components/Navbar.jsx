import React from 'react';
import { Settings, Download, Sparkles, Building2, UserCheck, Briefcase } from 'lucide-react';

export default function Navbar({
  whatsAppStatus,
  onOpenSettings,
  onLoadSample,
  activeTab,
  setActiveTab,
  isGeneratingSample
}) {
  const isDemo = whatsAppStatus?.isDemoMode;
  const isConnected = whatsAppStatus?.connected;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Identity & Loan App Title */}
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#9E1B32] flex items-center justify-center text-white font-bold shadow-md shadow-red-900/20 shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-tight text-[#9E1B32]">IDFC FIRST</span>
                <span className="text-[11px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-red-50 text-[#9E1B32] border border-red-100">
                  Bank • Loan Origination
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                Pre-Approved Retail Lending Suite • WhatsApp Auto-Messaging Module
              </p>
            </div>
          </div>

          {/* Loan App Navigation Tabs */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('chatbot')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                activeTab === 'chatbot'
                  ? 'bg-white text-[#9E1B32] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🤖 WhatsApp Chatbot</span>
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                activeTab === 'dashboard'
                  ? 'bg-white text-[#9E1B32] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>📋 Review List & History</span>
            </button>
            <button
              onClick={() => setActiveTab('pipeline')}
              className={`hidden lg:flex px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all items-center space-x-1.5 ${
                activeTab === 'pipeline'
                  ? 'bg-white text-[#9E1B32] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>💼 Loan Portfolio</span>
            </button>
          </div>

          {/* Status & Actions */}
          <div className="flex items-center space-x-2.5">
            {/* WhatsApp Status Pill */}
            <div
              onClick={onOpenSettings}
              className={`cursor-pointer px-3 py-1.5 rounded-full text-xs font-semibold flex items-center space-x-1.5 border transition-all hover:scale-102 ${
                isConnected
                  ? isDemo
                    ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
              }`}
              title="Click to view official WhatsApp Business API configuration"
            >
              <span className="relative flex h-2 w-2">
                {isConnected && (
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      isDemo ? 'bg-amber-400' : 'bg-emerald-400'
                    }`}
                  ></span>
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isConnected ? (isDemo ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-rose-500'
                  }`}
                ></span>
              </span>
              <span className="text-[11px]">
                {isConnected
                  ? isDemo
                    ? 'Demo Mode'
                    : 'WhatsApp Connected'
                  : 'API Disconnected'}
              </span>
            </div>

            {/* Quick Sample Button */}
            <button
              onClick={onLoadSample}
              disabled={isGeneratingSample}
              className="hidden sm:inline-flex items-center space-x-1 text-xs font-medium text-slate-600 hover:text-[#9E1B32] bg-slate-50 hover:bg-red-50/50 border border-slate-200 hover:border-red-200 px-2.5 py-1.5 rounded-lg transition-colors"
              title="Load 25 pre-qualified test loan customers"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Load Sample</span>
            </button>

            {/* Download Sample Excel */}
            <a
              href="/api/download-sample"
              download
              className="hidden xl:inline-flex items-center space-x-1 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 px-2.5 py-1.5 rounded-lg transition-colors"
              title="Download Excel Template"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Template</span>
            </a>

            {/* Config Button */}
            <button
              onClick={onOpenSettings}
              className="p-2 text-slate-600 hover:text-[#9E1B32] hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="WhatsApp API Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
