import React, { useState } from 'react';
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  HelpCircle,
  MessageSquare,
  Filter,
  Send,
  FlaskConical,
  RefreshCw,
  Eye,
  ShieldCheck,
  ShieldAlert,
  Upload
} from 'lucide-react';

export default function CustomerResponsesCard({
  customers = [],
  stats = {},
  activeFilter = 'all',
  setActiveFilter,
  onViewChat,
  onSimulateReply,
  isTestMode = false,
  setIsTestMode,
  testPhoneNumber = '',
  setTestPhoneNumber,
  onSendTestInteractive,
  isSendingTest = false,
  onUploadClick,
  isUploading = false,
  uploadSuccessMessage = '',
  campaignStatus = 'idle'
}) {
  const [selectedSimCustomer, setSelectedSimCustomer] = useState('');
  const [simCustomText, setSimCustomText] = useState('');

  // Counters
  const totalCount = customers.length;
  const interestedCount = stats.interested || customers.filter(c => c.response === 'INTERESTED').length;
  const notInterestedCount = stats.notInterested || customers.filter(c => c.response === 'NOT_INTERESTED').length;
  const humanFollowupCount = stats.humanFollowup || customers.filter(c => c.response === 'HUMAN_FOLLOWUP').length;
  const noResponseCount = stats.noResponse !== undefined
    ? stats.noResponse
    : customers.filter(c => !c.response || c.response === 'NO_RESPONSE').length;

  // Filtered customer list
  const filteredCustomers = customers.filter(c => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'interested') return c.response === 'INTERESTED';
    if (activeFilter === 'not_interested') return c.response === 'NOT_INTERESTED';
    if (activeFilter === 'human_followup') return c.response === 'HUMAN_FOLLOWUP';
    if (activeFilter === 'no_response') return !c.response || c.response === 'NO_RESPONSE';
    return true;
  });

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-5">
      {/* Header & Test Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-slate-900">
              Customer Responses
            </h2>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Interactive Bot
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time customer responses from WhatsApp interactive buttons (✅ Interested / ❌ Not Interested) &amp; text
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {onUploadClick && (
            <button
              type="button"
              onClick={onUploadClick}
              disabled={isUploading || campaignStatus === 'sending'}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{customers.length > 0 ? 'Upload New List' : 'Upload Customer List'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsTestMode(prev => !prev)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer border ${
              isTestMode
                ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>{isTestMode ? '🧪 Test Mode Active' : '🧪 Enter Test Mode'}</span>
          </button>
        </div>
      </div>

      {/* Upload Success Banner */}
      {uploadSuccessMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2 text-xs font-semibold text-emerald-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{uploadSuccessMessage}</span>
        </div>
      )}

      {/* Response Counters Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => setActiveFilter('interested')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            activeFilter === 'interested'
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400/30'
              : 'bg-slate-50 hover:bg-emerald-50/50 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 flex items-center space-x-1">
              <span>🟢</span>
              <span>Interested</span>
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2 font-mono">
            {interestedCount}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Tapped Interested or replied Yes</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('not_interested')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            activeFilter === 'not_interested'
              ? 'bg-slate-100 border-slate-400 ring-2 ring-slate-400/30'
              : 'bg-slate-50 hover:bg-slate-100/50 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center space-x-1">
              <span>⚪</span>
              <span>Not Interested</span>
            </span>
            <XCircle className="w-4 h-4 text-slate-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2 font-mono">
            {notInterestedCount}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Opted out of promotional outreach</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('no_response')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            activeFilter === 'no_response'
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/30'
              : 'bg-slate-50 hover:bg-amber-50/50 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 flex items-center space-x-1">
              <span>⏳</span>
              <span>No Response</span>
            </span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2 font-mono">
            {noResponseCount}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Awaiting customer selection</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('human_followup')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            activeFilter === 'human_followup'
              ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-400/30'
              : 'bg-slate-50 hover:bg-blue-50/50 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-800 flex items-center space-x-1">
              <span>🟡</span>
              <span>Human Follow-up</span>
            </span>
            <HelpCircle className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2 font-mono">
            {humanFollowupCount}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Complex queries requiring agent</p>
        </button>
      </div>

      {/* Test Mode Panel (when active) */}
      {isTestMode && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-bold text-amber-950">
              <FlaskConical className="w-4 h-4 text-amber-600" />
              <span>Interactive Flow Test &amp; Verification Mode</span>
            </div>
            <span className="text-[11px] text-amber-800 font-medium">
              Verify Buttons, Auto-Replies, Opt-out &amp; Chat History
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Test 1: Send real message with buttons to single phone */}
            <div className="bg-white p-3.5 rounded-xl border border-amber-200 space-y-2.5">
              <p className="font-bold text-slate-900">
                1. Test Initial Message with Buttons
              </p>
              <p className="text-[11px] text-slate-500">
                Dispatch the real approved message with ✅ Interested &amp; ❌ Not Interested buttons to a test phone number.
              </p>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={testPhoneNumber}
                  onChange={(e) => setTestPhoneNumber(e.target.value)}
                  placeholder="+91 98201 23456"
                  className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={onSendTestInteractive}
                  disabled={isSendingTest}
                  className="px-3 py-1.5 bg-[#9E1B32] hover:bg-[#831427] text-white font-bold rounded-lg transition-colors flex items-center space-x-1 shrink-0 disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSendingTest ? 'Sending...' : 'Send Test'}</span>
                </button>
              </div>
            </div>

            {/* Test 2: Simulate Customer Reply */}
            <div className="bg-white p-3.5 rounded-xl border border-amber-200 space-y-2.5">
              <p className="font-bold text-slate-900">
                2. Simulate Customer Response
              </p>
              <p className="text-[11px] text-slate-500">
                Test how the bot detects choices, triggers auto-replies, and updates the dashboard:
              </p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => onSimulateReply(selectedSimCustomer || customers[0]?.phone, '✅ Interested', true)}
                  disabled={customers.length === 0}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] transition-colors cursor-pointer disabled:opacity-50"
                >
                  Tap: ✅ Interested
                </button>
                <button
                  type="button"
                  onClick={() => onSimulateReply(selectedSimCustomer || customers[0]?.phone, '❌ Not Interested', true)}
                  disabled={customers.length === 0}
                  className="px-2.5 py-1 bg-slate-700 hover:bg-slate-800 text-white rounded-lg font-bold text-[11px] transition-colors cursor-pointer disabled:opacity-50"
                >
                  Tap: ❌ Not Interested
                </button>
                <button
                  type="button"
                  onClick={() => onSimulateReply(selectedSimCustomer || customers[0]?.phone, 'yes, send details', false)}
                  disabled={customers.length === 0}
                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-[11px] transition-colors cursor-pointer disabled:opacity-50"
                >
                  Text: "yes"
                </button>
                <button
                  type="button"
                  onClick={() => onSimulateReply(selectedSimCustomer || customers[0]?.phone, 'stop messages', false)}
                  disabled={customers.length === 0}
                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-[11px] transition-colors cursor-pointer disabled:opacity-50"
                >
                  Text: "stop"
                </button>
                <button
                  type="button"
                  onClick={() => onSimulateReply(selectedSimCustomer || customers[0]?.phone, 'What is the interest rate?', false)}
                  disabled={customers.length === 0}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] transition-colors cursor-pointer disabled:opacity-50"
                >
                  Complex Inquiry
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-slate-500 mr-1 flex items-center space-x-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </span>
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            All ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('interested')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeFilter === 'interested'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
            }`}
          >
            🟢 Interested ({interestedCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('not_interested')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeFilter === 'not_interested'
                ? 'bg-slate-700 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            ⚪ Not Interested ({notInterestedCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('no_response')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeFilter === 'no_response'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-800'
            }`}
          >
            ⏳ No Response ({noResponseCount})
          </button>
          {humanFollowupCount > 0 && (
            <button
              type="button"
              onClick={() => setActiveFilter('human_followup')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeFilter === 'human_followup'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 hover:bg-blue-100 text-blue-800'
              }`}
            >
              🟡 Human Follow-up ({humanFollowupCount})
            </button>
          )}
        </div>

        <span className="text-[11px] text-slate-400 font-medium">
          Showing {filteredCustomers.length} of {totalCount} recipients
        </span>
      </div>

      {/* Customer Table */}
      {filteredCustomers.length > 0 ? (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3 w-12 text-center">#</th>
                  <th className="py-2.5 px-4 font-bold">Customer</th>
                  <th className="py-2.5 px-4 font-bold">Phone</th>
                  <th className="py-2.5 px-4 font-bold">Message Status</th>
                  <th className="py-2.5 px-4 font-bold">Customer Response</th>
                  <th className="py-2.5 px-4 font-bold text-right">Conversation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.map((c, index) => (
                  <tr key={c.id || index} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                      {index + 1}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">
                      {c.name}
                      {c.optedOut && (
                        <span className="ml-1.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-700">
                          Opted Out
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-600">
                      {c.maskedPhone}
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          c.status === 'sent' || c.status === 'delivered'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : c.status === 'sending'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200 animate-pulse'
                            : c.status === 'failed'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {c.status === 'sent' && '✓ Sent'}
                        {c.status === 'delivered' && '✓ Delivered'}
                        {c.status === 'sending' && 'Sending...'}
                        {c.status === 'failed' && '✕ Failed'}
                        {c.status === 'pending' && 'Pending'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      {c.response === 'INTERESTED' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
                          🟢 Interested
                        </span>
                      )}
                      {c.response === 'NOT_INTERESTED' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5"></span>
                          ⚪ Not Interested
                        </span>
                      )}
                      {c.response === 'HUMAN_FOLLOWUP' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></span>
                          🟡 Human Follow-up Required
                        </span>
                      )}
                      {(!c.response || c.response === 'NO_RESPONSE') && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-50 text-slate-500 border border-slate-200">
                          ⏳ No Response
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onViewChat(c)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-[#9E1B32] hover:text-white text-slate-700 text-[11px] font-bold rounded-lg transition-colors inline-flex items-center space-x-1 cursor-pointer"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>View Chat ({c.conversationHistory?.length || 0})</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : totalCount === 0 ? (
        <div className="border border-dashed border-slate-300 rounded-xl p-8 text-center text-xs text-slate-500 space-y-2">
          <Users className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="font-semibold text-slate-700">No customer records loaded</p>
          <p className="text-[11px] text-slate-400">
            Upload an authorized pre-qualified borrower list (.xlsx, .csv, .json) to start WhatsApp outreach.
          </p>
          {onUploadClick && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onUploadClick}
                disabled={isUploading}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs transition-colors inline-flex items-center space-x-2 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Customer List</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="border border-dashed border-slate-200 rounded-xl p-8 text-center text-xs text-slate-400 space-y-2">
          <Users className="w-8 h-8 text-slate-300 mx-auto mb-1" />
          <p className="font-semibold text-slate-600">No customers match the selected filter</p>
          <p className="text-[11px]">Switch filter back to 'All' to view all {totalCount} recipients.</p>
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Show All Customers
          </button>
        </div>
      )}
    </section>
  );
}
