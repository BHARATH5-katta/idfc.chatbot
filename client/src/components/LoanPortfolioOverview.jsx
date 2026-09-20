import React from 'react';
import {
  TrendingUp,
  CreditCard,
  Building,
  CheckCircle,
  Clock,
  ArrowUpRight,
  MessageSquare,
  ShieldCheck,
  Send,
  Users
} from 'lucide-react';

export default function LoanPortfolioOverview({ onOpenChatbot, totalCustomers }) {
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Officer & Branch Banner */}
      <div className="bg-gradient-to-r from-[#9E1B32] via-[#851629] to-[#1E254B] rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-red-200">
                Loan Origination System (LOS) • Retail Assets
              </span>
            </div>
            <h2 className="text-2xl font-black mt-1 tracking-tight">
              Pre-Qualified Retail Lending Desk
            </h2>
            <p className="text-xs text-red-100 max-w-xl mt-1 leading-relaxed">
              Disburse pre-screened personal and MSME credit lines to pre-qualified IDFC FIRST Bank account holders via authorized WhatsApp automated outreach.
            </p>
          </div>

          <button
            onClick={onOpenChatbot}
            className="self-start md:self-center px-5 py-3 bg-white text-[#9E1B32] hover:bg-red-50 font-bold text-xs rounded-xl shadow-md transition-all flex items-center space-x-2 hover:scale-102"
          >
            <MessageSquare className="w-4 h-4 fill-[#9E1B32]" />
            <span>Launch WhatsApp Auto-Messenger</span>
          </button>
        </div>
      </div>

      {/* Lending KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Pre-Qualified Pipeline
            </span>
            <div className="w-8 h-8 rounded-lg bg-red-50 text-[#9E1B32] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-800 font-mono">
              {totalCustomers > 0 ? totalCustomers : '500+'}
            </span>
            <span className="text-xs text-slate-500 ml-1.5 font-medium">Eligible Borrowers</span>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" /> ₹14.8 Cr Pre-Approved Sanction Pool
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Avg. Pre-Approved Ticket
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-800 font-mono">₹4,25,000</span>
            <p className="text-[11px] text-slate-500 mt-1">
              Interest rates: 10.49% – 13.99% p.a.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Outreach Channel
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-lg font-bold text-slate-800">Official WhatsApp</span>
            <p className="text-[11px] text-slate-500 mt-1">
              Meta Cloud API v19.0 (High Engagement Rate)
            </p>
          </div>
        </div>
      </div>

      {/* Quick Launch Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-[#9E1B32]" />
            <span>Ready to dispatch pre-qualified loan notices?</span>
          </h3>
          <p className="text-xs text-slate-500">
            Upload your customer Excel, CSV, or JSON list directly to the embedded <strong>🤖 Loan Assistant</strong>. The assistant will read names, mask phone numbers, verify connectivity, and automatically send the approved template.
          </p>
        </div>

        <button
          onClick={onOpenChatbot}
          className="px-5 py-2.5 bg-[#9E1B32] hover:bg-[#831427] text-white font-bold text-xs rounded-xl shadow-xs transition-colors whitespace-nowrap flex items-center space-x-1.5"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Go to WhatsApp Chatbot</span>
        </button>
      </div>
    </div>
  );
}

