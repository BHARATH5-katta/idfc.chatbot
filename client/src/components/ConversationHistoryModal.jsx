import React from 'react';
import {
  MessageSquare,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldAlert,
  ArrowDownLeft,
  ArrowUpRight,
  User,
  Bot
} from 'lucide-react';

export default function ConversationHistoryModal({
  customer,
  isOpen,
  onClose
}) {
  if (!isOpen || !customer) return null;

  const history = customer.conversationHistory || [];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-sm text-white">{customer.name}</h3>
                {customer.response === 'INTERESTED' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    🟢 Interested
                  </span>
                )}
                {customer.response === 'NOT_INTERESTED' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/20 text-slate-300 border border-slate-500/30">
                    ⚪ Not Interested
                  </span>
                )}
                {customer.response === 'HUMAN_FOLLOWUP' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    🟡 Human Follow-up
                  </span>
                )}
                {(!customer.response || customer.response === 'NO_RESPONSE') && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/20 text-slate-300 border border-slate-500/30">
                    ⏳ No Response
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-300 font-mono">
                {customer.maskedPhone}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Opt-out Alert if customer opted out */}
        {customer.optedOut && (
          <div className="bg-rose-50 border-b border-rose-200 px-6 py-2.5 flex items-center space-x-2 text-xs text-rose-800 shrink-0">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              <strong>Customer Opted Out:</strong> Promotional outreach has been stopped for this customer.
            </span>
          </div>
        )}

        {/* Conversation Transcript */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 bg-slate-50">
          {history.length === 0 ? (
            <div className="text-center py-8 text-slate-400 space-y-1 text-xs">
              <Clock className="w-6 h-6 mx-auto text-slate-300 mb-1" />
              <p className="font-semibold text-slate-600">No conversation history yet</p>
              <p className="text-[11px]">Messages and customer responses will appear here in real time.</p>
            </div>
          ) : (
            history.map((msg, idx) => (
              <div
                key={msg.id || idx}
                className={`flex flex-col ${
                  msg.direction === 'out' ? 'items-end' : 'items-start'
                }`}
              >
                <div className="flex items-center space-x-1.5 mb-1 px-1 text-[10px] text-slate-400 font-medium">
                  {msg.direction === 'out' ? (
                    <>
                      <span>IDFC Loan Bot</span>
                      <Bot className="w-3 h-3 text-[#9E1B32]" />
                    </>
                  ) : (
                    <>
                      <User className="w-3 h-3 text-slate-600" />
                      <span>{customer.name}</span>
                      {msg.type === 'button_reply' && (
                        <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">
                          Button Tap
                        </span>
                      )}
                      {msg.type === 'text_reply' && (
                        <span className="bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-bold">
                          Text
                        </span>
                      )}
                    </>
                  )}
                  <span>•</span>
                  <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs shadow-xs leading-relaxed ${
                    msg.direction === 'out'
                      ? 'bg-[#9E1B32] text-white rounded-tr-none'
                      : 'bg-white border border-slate-200 text-slate-900 rounded-tl-none'
                  }`}
                >
                  <p>{msg.text}</p>

                  {/* Interactive Button Preview on Outgoing Message */}
                  {Array.isArray(msg.options) && msg.options.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-white/20 flex flex-wrap gap-1.5">
                      {msg.options.map((opt, oIdx) => (
                        <span
                          key={oIdx}
                          className="px-2.5 py-1 bg-white/15 rounded-lg text-[11px] font-semibold text-white border border-white/20"
                        >
                          {opt}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="bg-white px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span className="font-mono text-[11px]">
            Recipient: {customer.maskedPhone}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

