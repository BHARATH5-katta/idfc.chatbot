import React, { useState } from 'react';
import { X, Send, Phone, CheckCircle2, AlertCircle, Sparkles, Lock } from 'lucide-react';

export default function TestMessageModal({
  isOpen,
  onClose,
  onTestSuccess,
  approvedMessage
}) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [recipientName, setRecipientName] = useState('Authorized Test User');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  if (!isOpen) return null;

  const handleSendTest = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/whatsapp/test-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testPhoneNumber: phoneNumber,
          testName: recipientName
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(data.message || `Test message sent to ${data.maskedPhone}!`);
        onTestSuccess && onTestSuccess(data);
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setError(data.error || 'Failed to dispatch test message.');
      }
    } catch (err) {
      setError(err.message || 'Network error while dispatching test message.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base">Send Test Message</h3>
              <p className="text-xs text-emerald-100">Mandatory verification checkpoint</p>
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
        <form onSubmit={handleSendTest} className="p-6 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start space-x-2">
            <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Per bank compliance rules, you must successfully dispatch a test message to an authorized test number before unlocking the full campaign.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Authorized Test Recipient Name
            </label>
            <input
              type="text"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#9E1B32] outline-none"
              placeholder="e.g. Rahul (Tester)"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Test WhatsApp Mobile Number <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="e.g. 9820123456 or +919820123456"
                required
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#9E1B32] outline-none font-mono"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Supports 10-digit Indian numbers or full international format.
            </p>
          </div>

          {/* Message preview */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Message to be Dispatched
            </label>
            <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-xl p-3 text-xs text-slate-800 relative">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide block mb-1">
                IDFC FIRST Approved Loan Template
              </span>
              <p className="italic">
                "{approvedMessage || 'You are pre-qualified for an IDFC FIRST Bank loan. If you’re interested, please contact me.'}"
              </p>
            </div>
          </div>

          {/* Status feedback */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Action buttons */}
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
              disabled={loading || !phoneNumber.trim()}
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs flex items-center space-x-1.5 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Sending Test...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Test Message</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

