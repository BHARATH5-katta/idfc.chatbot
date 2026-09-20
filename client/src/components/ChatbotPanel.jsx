import React, { useRef, useState } from 'react';
import {
  Bot,
  User,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  Square,
  Sparkles,
  FileSpreadsheet,
  ShieldCheck,
  Send,
  Eye,
  Lock,
  XCircle,
  FileText
} from 'lucide-react';

export default function ChatbotPanel({
  campaignState,
  whatsAppStatus,
  onFileUpload,
  onLoadSample,
  onOpenTestModal,
  onOpenSettings,
  onStartCampaign,
  onPauseCampaign,
  onResumeCampaign,
  onStopCampaign,
  onReviewList,
  isUploading,
  uploadStats
}) {
  const fileInputRef = useRef(null);
  const [authorizedConsent, setAuthorizedConsent] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const stats = campaignState?.stats || {
    total: 0,
    sent: 0,
    delivered: 0,
    failed: 0,
    remaining: 0,
    progressPercent: 0
  };

  const status = campaignState?.status || 'idle';
  const isRunning = status === 'running';
  const isPaused = status === 'paused';
  const isCompleted = status === 'completed';
  const hasCustomers = stats.total > 0;
  const isTestVerified = campaignState?.testVerified;
  const isConnected = whatsAppStatus?.connected;
  const isDemo = whatsAppStatus?.isDemoMode;

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
      {/* Chatbot Header */}
      <div className="bg-white px-5 py-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#9E1B32] to-[#C5A059] p-0.5 shadow-xs">
              <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center">
                <Bot className="w-6 h-6 text-[#9E1B32]" />
              </div>
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-slate-800">🤖 Loan Assistant</h2>
              <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-red-50 text-[#9E1B32] border border-red-100">
                Official WhatsApp Outreach
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Campaign: <span className="font-mono text-slate-700 font-semibold">{campaignState?.campaignId || 'CAMP-IDFC-ACTIVE'}</span>
            </p>
          </div>
        </div>

        {/* WhatsApp Connection Status Indicator */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onOpenSettings}
            className={`text-xs px-3 py-1.5 rounded-full font-semibold border transition-all flex items-center space-x-1.5 ${
              isConnected
                ? isDemo
                  ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isConnected ? (isDemo ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-rose-500'}`}></span>
            <span>{isConnected ? (isDemo ? 'Demo Mode' : 'WhatsApp API') : 'Disconnected'}</span>
          </button>
        </div>
      </div>

      {/* Chat Messages Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
        {/* Assistant Turn 1: Welcome & Initial Prompt */}
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 rounded-lg bg-[#9E1B32] flex items-center justify-center text-white shrink-0 mt-0.5 shadow-xs">
            <Bot className="w-4 h-4" />
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm p-4 max-w-xl shadow-xs space-y-3">
            <p className="text-sm text-slate-800 leading-relaxed font-medium">
              Please provide your pre-qualified customer list.
            </p>

            {/* File Upload Box */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer ${
                dragActive
                  ? 'border-[#9E1B32] bg-red-50/50'
                  : 'border-slate-300 hover:border-[#9E1B32] bg-slate-50/50 hover:bg-red-50/20'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.json"
                className="hidden"
                onChange={handleFileInputChange}
              />
              <FileSpreadsheet className={`w-7 h-7 text-[#9E1B32] mx-auto mb-1.5 opacity-85 ${isUploading ? 'animate-bounce' : ''}`} />
              <p className="text-xs font-semibold text-slate-800">
                {isUploading ? 'Validating pre-qualified customer list...' : 'Upload Customer List'}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Supports Excel (.xlsx), CSV (.csv), or JSON (.json) with <code className="bg-slate-100 px-1 py-0.5 rounded">Name</code> & <code className="bg-slate-100 px-1 py-0.5 rounded">Phone Number</code>
              </p>

              <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-center space-x-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onLoadSample();
                  }}
                  className="text-xs font-semibold text-[#9E1B32] hover:text-[#7d1325] bg-red-50 hover:bg-red-100 px-3 py-1 rounded-lg transition-colors flex items-center space-x-1"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Use Sample Pre-Qualified List (25 Customers)</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* User Response Turn */}
        {hasCustomers && (
          <div className="flex items-start justify-end space-x-3 animate-fadeIn">
            <div className="bg-[#9E1B32] text-white rounded-2xl rounded-tr-sm p-3.5 max-w-md shadow-xs space-y-1 text-right">
              <div className="flex items-center justify-end space-x-1 text-xs font-bold">
                <FileText className="w-3.5 h-3.5" />
                <span>{uploadStats?.filename || 'Customer_List.xlsx'}</span>
              </div>
              <p className="text-xs text-red-100">
                Provided {stats.total} pre-qualified customer records.
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
              <User className="w-4 h-4" />
            </div>
          </div>
        )}

        {/* Assistant Turn 2: Exact prompt-matching response & confirmation */}
        {hasCustomers && (
          <div className="flex items-start space-x-3 animate-fadeIn">
            <div className="w-8 h-8 rounded-lg bg-[#9E1B32] flex items-center justify-center text-white shrink-0 mt-0.5 shadow-xs">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm p-5 max-w-xl shadow-xs space-y-4">
              {/* Recipient summary count matching prompt */}
              <div className="space-y-1 text-sm font-semibold text-slate-800">
                <p className="text-base font-bold text-slate-900">{stats.total} customers found.</p>
                <div className="flex items-center space-x-1.5 text-xs text-emerald-700 font-medium pt-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>✓ {stats.total} valid numbers</span>
                </div>
                <div className="flex items-center space-x-1.5 text-xs text-emerald-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>✓ {stats.total} ready for review</span>
                </div>
              </div>

              {/* Message preview prompt matching */}
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Here is the message that will be sent:
                </span>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 relative">
                  <div className="flex items-center space-x-1.5 mb-1.5 text-[11px] font-bold text-emerald-700 uppercase tracking-wide">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>IDFC FIRST Bank Approved Template</span>
                  </div>
                  <p className="text-sm text-slate-800 italic font-medium leading-relaxed">
                    "You are pre-qualified for an IDFC FIRST Bank loan. If you’re interested, please contact me."
                  </p>
                </div>
              </div>

              {/* Mandatory Test Message Sandbox Gate */}
              <div
                className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                  isTestVerified
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
                    : 'bg-amber-50/70 border-amber-200 text-amber-900'
                }`}
              >
                <div className="flex items-center space-x-2">
                  {isTestVerified ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  )}
                  <span>
                    {isTestVerified
                      ? 'Test Message Verified ✓'
                      : 'Test mode verification required before broadcast.'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onOpenTestModal}
                  className="px-2.5 py-1 text-xs font-semibold bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition-colors flex items-center space-x-1"
                >
                  <Send className="w-3 h-3" />
                  <span>{isTestVerified ? 'Re-Test' : 'Send Test'}</span>
                </button>
              </div>

              {/* Required Safety Confirmation Checkbox */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <label className="flex items-start space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={authorizedConsent}
                    onChange={(e) => setAuthorizedConsent(e.target.checked)}
                    className="mt-0.5 rounded text-[#9E1B32] focus:ring-[#9E1B32]"
                  />
                  <span className="text-xs font-medium text-slate-700 leading-normal">
                    "I confirm that I am authorized to contact these recipients and that this WhatsApp message is approved for this campaign."
                  </span>
                </label>
              </div>

              {/* Action Buttons: [REVIEW LIST] and [CONFIRM & SEND] */}
              {status === 'ready' || status === 'idle' ? (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={onReviewList}
                    className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center justify-center space-x-1.5 border border-slate-300"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>[REVIEW LIST]</span>
                  </button>

                  <button
                    type="button"
                    onClick={onStartCampaign}
                    disabled={!isTestVerified || !authorizedConsent || isRunning}
                    className="py-2.5 px-4 bg-[#9E1B32] hover:bg-[#831427] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-1.5 disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg hover:scale-101 active:scale-99"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>[CONFIRM & SEND]</span>
                  </button>
                </div>
              ) : null}

              {!isTestVerified && (
                <p className="text-[11px] text-amber-700 text-center">
                  ⚠️ Please dispatch a test message to unlock [CONFIRM & SEND].
                </p>
              )}
            </div>
          </div>
        )}

        {/* Live Campaign Status Turn (Prompt-exact after confirmation) */}
        {(isRunning || isPaused || isCompleted) && (
          <div className="flex items-start space-x-3 animate-fadeIn">
            <div className="w-8 h-8 rounded-lg bg-[#9E1B32] flex items-center justify-center text-white shrink-0 mt-0.5 shadow-xs">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm p-5 max-w-xl w-full shadow-xs space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${isRunning ? 'bg-blue-500 animate-ping' : isPaused ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {isCompleted
                      ? 'Campaign Complete'
                      : isPaused
                      ? 'Campaign Paused'
                      : 'Campaign started.'}
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold text-slate-600">
                  {stats.progressPercent}%
                </span>
              </div>

              {/* Exact format requested by user:
                  Sending: 125 / 500
                  ✓ Sent: 120
                  ✕ Failed: 5
                  Remaining: 375
              */}
              <div className="bg-slate-900 text-white rounded-xl p-4 font-mono text-xs space-y-1.5 shadow-xs">
                <p className="text-blue-300 font-bold">
                  Sending: {stats.sent + stats.failed} / {stats.total}
                </p>
                <p className="text-emerald-400">
                  ✓ Sent: {stats.sent}
                </p>
                <p className="text-rose-400">
                  ✕ Failed: {stats.failed}
                </p>
                <p className="text-slate-300">
                  Remaining: {stats.remaining}
                </p>

                {/* Visual Progress Bar */}
                <div className="pt-2">
                  <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isCompleted ? 'bg-emerald-500' : 'bg-[#9E1B32]'
                      }`}
                      style={{ width: `${stats.progressPercent}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Pause / Resume / Stop controls */}
              {!isCompleted && (
                <div className="flex items-center space-x-2 pt-1 border-t border-slate-100">
                  {isRunning ? (
                    <button
                      type="button"
                      onClick={onPauseCampaign}
                      className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors flex items-center justify-center space-x-1.5 shadow-xs"
                    >
                      <Pause className="w-3.5 h-3.5 fill-white" />
                      <span>PAUSE CAMPAIGN</span>
                    </button>
                  ) : isPaused ? (
                    <button
                      type="button"
                      onClick={onResumeCampaign}
                      className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center justify-center space-x-1.5 shadow-xs"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>RESUME CAMPAIGN</span>
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={onStopCampaign}
                    className="py-2 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors flex items-center space-x-1.5"
                  >
                    <Square className="w-3.5 h-3.5 fill-rose-700" />
                    <span>STOP</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
