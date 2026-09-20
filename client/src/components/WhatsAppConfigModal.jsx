import React, { useState, useEffect } from 'react';
import { X, Shield, Key, Phone, CheckCircle2, AlertTriangle, RefreshCw, Layers } from 'lucide-react';

export default function WhatsAppConfigModal({ isOpen, onClose, currentStatus, onSaveConfig }) {
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [wabaId, setWabaId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [templateName, setTemplateName] = useState('idfc_loan_prequalified');
  const [languageCode, setLanguageCode] = useState('en');
  const [customMessage, setCustomMessage] = useState(
    'You are pre-qualified for an IDFC FIRST Bank loan. If you’re interested, please contact me.'
  );
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (currentStatus) {
      setIsDemoMode(!!currentStatus.isDemoMode);
      if (currentStatus.templateName) setTemplateName(currentStatus.templateName);
    }
  }, [currentStatus]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/whatsapp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isDemoMode,
          phoneNumberId,
          wabaId,
          accessToken,
          templateName,
          languageCode,
          customMessage
        })
      });

      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: 'success', text: 'WhatsApp configuration saved and verified!' });
        onSaveConfig && onSaveConfig(data.status);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setFeedback({ type: 'error', text: data.error || 'Failed to update configuration' });
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Connection test failed' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#9E1B32] to-[#731223] px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base">WhatsApp Integration Settings</h3>
              <p className="text-xs text-red-100">Official Meta WhatsApp Business Cloud API</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Mode Switcher */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
              Dispatch Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsDemoMode(true)}
                className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                  isDemoMode
                    ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-400/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center space-x-1.5 font-semibold text-xs text-amber-900 mb-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span>Demo / Simulation Mode</span>
                </div>
                <p className="text-xs text-slate-500">
                  Simulate live sending, delivery receipts, and queue without sending real messages.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setIsDemoMode(false)}
                className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                  !isDemoMode
                    ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center space-x-1.5 font-semibold text-xs text-emerald-900 mb-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Official WhatsApp API</span>
                </div>
                <p className="text-xs text-slate-500">
                  Direct Meta Graph API v19.0. Sends verified messages to customer phones.
                </p>
              </button>
            </div>
          </div>

          {/* Official API Fields (Enabled when not demo mode) */}
          {!isDemoMode && (
            <div className="space-y-3.5 animate-fadeIn">
              <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3 text-xs text-blue-800 flex items-start space-x-2">
                <Shield className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  Only the <strong>official WhatsApp Business Platform / Cloud API</strong> is supported. No scraping, Puppeteer, or unofficial QR code hacks.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone Number ID <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required={!isDemoMode}
                    value={phoneNumberId}
                    onChange={(e) => setPhoneNumberId(e.target.value)}
                    placeholder="e.g. 108492049182390"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#9E1B32] focus:border-transparent outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  WhatsApp Business Account (WABA) ID
                </label>
                <div className="relative">
                  <Layers className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={wabaId}
                    onChange={(e) => setWabaId(e.target.value)}
                    placeholder="e.g. 103984928172901"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#9E1B32] focus:border-transparent outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  System User Access Token (Bearer) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required={!isDemoMode}
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder="EAAG..."
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#9E1B32] focus:border-transparent outline-none font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Approved Template Settings */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Approved Template Name
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#9E1B32] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Language Code
                </label>
                <input
                  type="text"
                  value={languageCode}
                  onChange={(e) => setLanguageCode(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#9E1B32] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Approved Message Text
              </label>
              <textarea
                rows={2}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#9E1B32] outline-none bg-slate-50 text-slate-700"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Strict compliance: Only approved bank loan pre-qualification templates should be dispatched.
              </p>
            </div>
          </div>

          {/* Feedback banner */}
          {feedback && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center space-x-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#9E1B32] hover:bg-[#831427] rounded-lg transition-colors shadow-xs flex items-center space-x-1.5 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Verifying API...</span>
                </>
              ) : (
                <span>Save & Connect</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

