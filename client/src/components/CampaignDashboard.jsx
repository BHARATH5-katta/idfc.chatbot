import React, { useState } from 'react';
import {
  Users,
  Send,
  CheckCheck,
  AlertOctagon,
  Clock,
  Search,
  Download,
  Sliders,
  Pause,
  Play,
  Square,
  Lock,
  Tag,
  ShieldCheck,
  Radio
} from 'lucide-react';

export default function CampaignDashboard({
  campaignState,
  onPause,
  onResume,
  onStop,
  onThrottleChange
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [throttleInput, setThrottleInput] = useState(campaignState?.delayMs || 1500);

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
  const customers = campaignState?.customers || [];
  const logs = campaignState?.recentLogs || [];
  const campaignId = campaignState?.campaignId || 'CAMP-IDFC-ACTIVE';

  // Filtered customer list
  const filteredCustomers = customers.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      statusFilter === 'ALL' ? true : c.status.toUpperCase() === statusFilter.toUpperCase();
    return matchesSearch && matchesFilter;
  });

  const handleThrottleSlider = (e) => {
    const val = parseInt(e.target.value, 10);
    setThrottleInput(val);
    onThrottleChange && onThrottleChange(val);
  };

  // Export report as CSV
  const handleExportCSV = () => {
    if (customers.length === 0) return;
    const headers = ['Campaign ID', 'Customer Name', 'Masked Phone', 'Eligibility Status', 'Delivery Status', 'Timestamp', 'Error Notes'];
    const rows = customers.map((c) => [
      `"${campaignId}"`,
      `"${c.name}"`,
      `"${c.maskedPhone}"`,
      '"Pre-Qualified (IDFC FIRST Bank)"',
      `"${c.status}"`,
      `"${c.sentAt || 'Pending'}"`,
      `"${c.error || 'None'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${campaignId}_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* Campaign Metadata Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <Tag className="w-4 h-4 text-[#9E1B32]" />
          <span className="text-xs font-semibold text-slate-500">Active Campaign ID:</span>
          <span className="font-mono text-xs font-bold bg-slate-100 text-[#9E1B32] px-2.5 py-1 rounded-md border border-slate-200">
            {campaignId}
          </span>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-400">Security:</span>
          <span className="inline-flex items-center space-x-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold border border-emerald-100">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Duplicate Protected</span>
          </span>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* Total Pre-Qualified */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Pre-Qualified
            </span>
            <div className="w-7 h-7 rounded-lg bg-red-50 text-[#9E1B32] flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-black text-slate-800 font-mono">{stats.total}</span>
            <p className="text-[10px] text-slate-400 mt-0.5">Pre-screened borrowers</p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#9E1B32]"></div>
        </div>

        {/* Sent */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Sent
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Send className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-black text-blue-600 font-mono">{stats.sent}</span>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {stats.total > 0 ? `${Math.round((stats.sent / stats.total) * 100)}% dispatched` : '0%'}
            </p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500"></div>
        </div>

        {/* Delivered */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Delivered
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-black text-emerald-600 font-mono">{stats.delivered}</span>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {stats.sent > 0 ? `${Math.round((stats.delivered / stats.sent) * 100)}% delivery rate` : '0%'}
            </p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500"></div>
        </div>

        {/* Failed */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Failed
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertOctagon className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-black text-rose-600 font-mono">{stats.failed}</span>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {stats.total > 0 ? `${Math.round((stats.failed / stats.total) * 100)}% rejection` : 'Zero errors'}
            </p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-rose-500"></div>
        </div>
      </div>

      {/* Control & Throttling Card */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Speed Regulator */}
        <div className="flex-1 w-full max-w-md">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
              <Sliders className="w-3.5 h-3.5 text-[#9E1B32]" />
              <span>Sending Rate Throttling</span>
            </label>
            <span className="text-xs font-mono font-semibold text-slate-600">
              {throttleInput}ms / msg (~{Math.round(60000 / throttleInput)} msg/min)
            </span>
          </div>
          <input
            type="range"
            min="200"
            max="4000"
            step="100"
            value={throttleInput}
            onChange={handleThrottleSlider}
            className="w-full accent-[#9E1B32] cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
            <span>Fast (Demo)</span>
            <span>Recommended (1500ms)</span>
            <span>Safe (Meta API Tier 1)</span>
          </div>
        </div>

        {/* Live Action Controls */}
        <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
          {isRunning && (
            <button
              onClick={onPause}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5"
            >
              <Pause className="w-3.5 h-3.5 fill-white" />
              <span>Pause</span>
            </button>
          )}

          {isPaused && (
            <button
              onClick={onResume}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Resume</span>
            </button>
          )}

          {(isRunning || isPaused) && (
            <button
              onClick={onStop}
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5"
            >
              <Square className="w-3.5 h-3.5 fill-rose-700" />
              <span>Stop</span>
            </button>
          )}

          <button
            onClick={handleExportCSV}
            disabled={customers.length === 0}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Recipient Queue Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table Filter Toolbar */}
        <div className="p-3.5 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter customer name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#9E1B32]"
            />
          </div>

          <div className="flex items-center space-x-1 w-full sm:w-auto overflow-x-auto">
            {['ALL', 'PENDING', 'SENDING', 'SENT', 'DELIVERED', 'FAILED'].map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  statusFilter === tab
                    ? 'bg-[#9E1B32] text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Customer Queue Table */}
        <div className="overflow-x-auto max-h-80">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 sticky top-0 z-10 text-[10px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3.5">#</th>
                <th className="py-2.5 px-3.5">Customer Name</th>
                <th className="py-2.5 px-3.5">
                  <div className="flex items-center space-x-1">
                    <Lock className="w-3 h-3 text-slate-400" />
                    <span>Masked Mobile</span>
                  </div>
                </th>
                <th className="py-2.5 px-3.5">Eligibility</th>
                <th className="py-2.5 px-3.5">Status</th>
                <th className="py-2.5 px-3.5">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    No recipients in this filter. Upload a customer list or select another tab.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c, idx) => (
                  <tr key={c.id || idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3.5 font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-2.5 px-3.5 font-semibold text-slate-800">{c.name}</td>
                    <td className="py-2.5 px-3.5 font-mono text-slate-600">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {c.maskedPhone}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-[#9E1B32] border border-red-100">
                        Pre-Qualified
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                          c.status === 'delivered'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : c.status === 'sent'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : c.status === 'sending'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 animate-pulse'
                            : c.status === 'failed'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {c.status}
                      </span>
                      {c.error && (
                        <p className="text-[10px] text-rose-500 mt-0.5">{c.error}</p>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 text-slate-400 font-mono text-[11px]">
                      {c.sentAt ? new Date(c.sentAt).toLocaleTimeString() : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sending History Feed */}
      <div className="bg-slate-900 rounded-2xl p-4 text-white shadow-xs">
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Sending History & Live Activity Stream
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            Real-time SSE
          </span>
        </div>
        <div className="mt-3 max-h-36 overflow-y-auto space-y-1 font-mono text-xs text-slate-300">
          {logs.length === 0 ? (
            <p className="text-slate-500 text-xs italic py-1">No outreach activities logged yet.</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="flex items-start space-x-2 text-[11px]">
                <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                <span
                  className={
                    log.type === 'sent'
                      ? 'text-blue-400'
                      : log.type === 'success'
                      ? 'text-emerald-400'
                      : log.type === 'error' || log.type === 'danger'
                      ? 'text-rose-400'
                      : log.type === 'warning'
                      ? 'text-amber-400'
                      : 'text-slate-300'
                  }
                >
                  {log.text}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
