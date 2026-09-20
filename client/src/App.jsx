import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import WhatsAppConnection from './components/WhatsAppConnection';
import {
  CheckCircle2,
  AlertCircle,
  Upload,
  FileSpreadsheet,
  ShieldCheck,
  Send,
  RotateCcw
} from 'lucide-react';

const APPROVED_MESSAGE =
  'You are pre-qualified for an IDFC FIRST Bank loan. If you’re interested, please contact me.';

function maskPhone(p) {
  if (!p) return '***';
  const cleaned = String(p).replace(/\D/g, '');
  if (cleaned.length < 10) return '***' + cleaned.slice(-3);
  const main = cleaned.slice(-10);
  return `+91 ${main.slice(0, 2)}*** **${main.slice(-3)}`;
}

export default function App() {
  // Real WhatsApp Connection State (Strictly from Backend)
  const [waConnection, setWaConnection] = useState({
    state: 'Disconnected', // Disconnected | Initializing | Waiting for QR | QR Ready | Authenticating | Connected | Error
    connected: false,
    qr: null,
    accountInfo: null,
    error: null
  });
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  // Customer List State (No mock/demo data)
  const [customers, setCustomers] = useState([]);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // WhatsApp Message Confirmation State
  const [isMessageConfirmed, setIsMessageConfirmed] = useState(false);

  // Ready to Send Confirmation Modal
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // Sending / Campaign Progress State
  const [campaignStatus, setCampaignStatus] = useState('idle'); // 'idle' | 'sending' | 'completed'
  const [campaignStats, setCampaignStats] = useState({
    total: 0,
    sent: 0,
    failed: 0,
    remaining: 0
  });

  const [notification, setNotification] = useState(null);
  const simulationTimerRef = useRef(null);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Fetch initial WhatsApp connection status from backend
  const fetchWhatsAppStatus = async () => {
    try {
      const res = await fetch('/api/whatsapp/status');
      if (res.ok) {
        const data = await res.json();
        setWaConnection(data);
      }
    } catch {
      // Backend offline
    }
  };

  // Active state polling fallback (every 1.5s while connection is progressing)
  useEffect(() => {
    const activeStates = ['Initializing', 'Waiting for QR', 'Authenticating'];
    if (!activeStates.includes(waConnection.state)) return;

    const intervalId = setInterval(async () => {
      try {
        const res = await fetch('/api/whatsapp/status');
        if (res.ok) {
          const data = await res.json();
          setWaConnection(data);
          if (data.state === 'Connected') {
            setIsQrModalOpen(false);
            showNotification('success', '🟢 WhatsApp Connected! WhatsApp is ready.');
          }
        }
      } catch {
        // Backend offline
      }
    }, 1500);

    return () => clearInterval(intervalId);
  }, [waConnection.state]);

  // WhatsApp SSE stream listener (Backend is source of truth)
  useEffect(() => {
    fetchWhatsAppStatus();

    let waEventSource = null;
    try {
      waEventSource = new EventSource('/api/whatsapp/stream');
      waEventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setWaConnection(data);

          // When real authentication succeeds
          if (data.state === 'Connected' || data.connected) {
            setIsQrModalOpen(false);
            showNotification('success', '🟢 WhatsApp Connected! WhatsApp is ready.');
          } else if (data.state === 'Error') {
            showNotification('error', data.error || 'Unable to generate WhatsApp QR');
          }
        } catch (err) {
          console.error('Error parsing WhatsApp SSE data:', err);
        }
      };

      waEventSource.onerror = () => {
        waEventSource?.close();
      };
    } catch {
      // SSE unavailable
    }

    // Campaign SSE stream listener
    let campaignEventSource = null;
    try {
      campaignEventSource = new EventSource('/api/campaign/stream');
      campaignEventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.status === 'running') {
            setCampaignStatus('sending');
            setCampaignStats({
              total: data.stats?.total || 0,
              sent: data.stats?.sent || 0,
              failed: data.stats?.failed || 0,
              remaining: data.stats?.remaining || 0
            });
            if (Array.isArray(data.customers)) {
              setCustomers(data.customers);
            }
          } else if (data.status === 'completed') {
            setCampaignStatus('completed');
            setCampaignStats({
              total: data.stats?.total || 0,
              sent: data.stats?.sent || 0,
              failed: data.stats?.failed || 0,
              remaining: 0
            });
            if (Array.isArray(data.customers)) {
              setCustomers(data.customers);
            }
          }
        } catch (err) {
          console.error('Error parsing Campaign SSE data:', err);
        }
      };

      campaignEventSource.onerror = () => {
        campaignEventSource?.close();
      };
    } catch {
      // SSE unavailable
    }

    return () => {
      waEventSource?.close();
      campaignEventSource?.close();
      if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
    };
  }, []);

  // Connect WhatsApp (calls backend whatsapp-web.js session)
  const handleConnectWhatsApp = async () => {
    setIsQrModalOpen(true);
    try {
      const res = await fetch('/api/whatsapp/connect', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setWaConnection(data.status || data);
      }
    } catch {
      showNotification('error', 'Unable to reach WhatsApp service.');
    }
  };

  // Disconnect WhatsApp
  const handleDisconnectWhatsApp = async () => {
    try {
      const res = await fetch('/api/whatsapp/disconnect', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setWaConnection(data.status || { state: 'Disconnected', connected: false, qr: null, accountInfo: null, error: null });
        showNotification('info', 'WhatsApp disconnected.');
      }
    } catch {
      showNotification('error', 'Failed to disconnect WhatsApp.');
    }
  };

  // Refresh QR (regenerates fresh session and QR from WhatsApp Web)
  const handleRefreshQr = async () => {
    try {
      const res = await fetch('/api/whatsapp/refresh-qr', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setWaConnection(data.status || data);
      }
    } catch {
      showNotification('error', 'Failed to refresh WhatsApp QR code.');
    }
  };

  // File Upload Handler (Excel, CSV, JSON)
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadSuccessMessage('');

    // Try backend upload endpoint first
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        if (data.sampleCustomers && data.sampleCustomers.length > 0) {
          const campaignRes = await fetch('/api/campaign/status');
          if (campaignRes.ok) {
            const campData = await campaignRes.json();
            if (campData.customers && campData.customers.length > 0) {
              setCustomers(campData.customers);
              setCampaignStats({
                total: campData.customers.length,
                sent: 0,
                failed: 0,
                remaining: campData.customers.length
              });
              setCampaignStatus('idle');
              setUploadSuccessMessage(`Customer list loaded successfully (${campData.customers.length} recipients).`);
              setIsUploading(false);
              return;
            }
          }
        }
      }
    } catch {
      // Backend not available, parse client-side
    }

    // Client-side parser fallback
    try {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          let rows = [];
          if (file.name.endsWith('.json')) {
            rows = JSON.parse(evt.target.result);
          } else {
            const buffer = new Uint8Array(evt.target.result);
            const workbook = XLSX.read(buffer, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
          }

          if (!rows || rows.length === 0) {
            showNotification('error', 'File contains no rows.');
            setIsUploading(false);
            return;
          }

          const parsed = rows.map((r, i) => {
            const name = r.Name || r['Customer Name'] || r.Customer || r.name || `Customer #${i + 1}`;
            const rawPhone = String(
              r['Phone Number'] || r.Phone || r.Mobile || r['Mobile Number'] || r.phone || ''
            );
            const digits = rawPhone.replace(/\D/g, '');
            const phone = digits.length === 10 ? '91' + digits : digits;

            return {
              id: `cust_${i + 1}`,
              name,
              phone: phone || '919800000000',
              maskedPhone: maskPhone(phone || '919800000000'),
              status: 'pending' // 'pending' | 'sending' | 'sent' | 'failed'
            };
          });

          setCustomers(parsed);
          setCampaignStats({
            total: parsed.length,
            sent: 0,
            failed: 0,
            remaining: parsed.length
          });
          setCampaignStatus('idle');
          setUploadSuccessMessage(`Customer list loaded successfully (${parsed.length} recipients).`);
          showNotification('success', `Customer list loaded successfully (${parsed.length} recipients).`);
        } catch (err) {
          showNotification('error', `Failed to parse file: ${err.message}`);
        } finally {
          setIsUploading(false);
        }
      };

      if (file.name.endsWith('.json')) {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    } catch (err) {
      showNotification('error', 'File read error.');
      setIsUploading(false);
    }
  };

  // Start Sending Campaign
  const handleConfirmAndSend = async () => {
    setIsConfirmModalOpen(false);
    setCampaignStatus('sending');

    try {
      const res = await fetch('/api/campaign/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorizationConfirmed: true,
          bypassTest: true
        })
      });

      if (res.ok) {
        showNotification('success', 'Sending WhatsApp messages via linked device...');
        return;
      }
    } catch {
      showNotification('error', 'Failed to communicate with campaign server.');
      setCampaignStatus('idle');
    }
  };

  // Reset Campaign
  const handleReset = () => {
    if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
    setCampaignStatus('idle');
    setCustomers((prev) => prev.map((c) => ({ ...c, status: 'pending' })));
    setCampaignStats({
      total: customers.length,
      sent: 0,
      failed: 0,
      remaining: customers.length
    });
  };

  const isConnected = waConnection.connected || waConnection.state === 'CONNECTED';
  const hasCustomers = customers.length > 0;
  const isSendEnabled = isConnected && hasCustomers && isMessageConfirmed && campaignStatus !== 'sending';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-5 right-5 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div
            className={`px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold flex items-center space-x-2 ${
              notification.type === 'success'
                ? 'bg-emerald-600 text-white border-emerald-700'
                : notification.type === 'error'
                ? 'bg-rose-600 text-white border-rose-700'
                : 'bg-slate-800 text-white border-slate-900'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* 1. Header: 🤖 WhatsApp Loan Chatbot */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#9E1B32] flex items-center justify-center text-white font-bold shadow-xs shrink-0">
              <span className="text-xl">🤖</span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                  🤖 WhatsApp Loan Chatbot
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-50 text-[#9E1B32] border border-red-100">
                  IDFC FIRST Bank
                </span>
              </div>
              <p className="text-xs text-slate-500 font-normal">
                Send approved loan messages to your authorized customer list through WhatsApp.
              </p>
            </div>
          </div>

          {/* Top Status Badge */}
          <div>
            {isConnected ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                🟢 Connected
              </span>
            ) : waConnection.state === 'Initializing' || waConnection.state === 'Waiting for QR' || waConnection.state === 'Authenticating' ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <span className="w-2 h-2 rounded-full bg-amber-500 mr-1.5 animate-pulse"></span>
                🟡 Connecting
              </span>
            ) : waConnection.state === 'QR Ready' ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
                <span className="w-2 h-2 rounded-full bg-amber-500 mr-1.5"></span>
                📱 QR Ready
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                <span className="w-2 h-2 rounded-full bg-rose-500 mr-1.5"></span>
                🔴 Disconnected
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* 2. WhatsApp Connection Card (Using Real WhatsApp Web Session) */}
        <WhatsAppConnection
          connectionState={waConnection.state}
          qrData={waConnection.qr}
          accountInfo={waConnection.accountInfo}
          errorMessage={waConnection.error}
          onConnect={handleConnectWhatsApp}
          onDisconnect={handleDisconnectWhatsApp}
          onRefreshQr={handleRefreshQr}
          isModalOpen={isQrModalOpen}
          setIsModalOpen={setIsQrModalOpen}
        />

        {/* 3. Customer List Card */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Customer List</h2>
              <p className="text-xs text-slate-500">
                Upload your pre-qualified loan customers in Excel (.xlsx), CSV (.csv), or JSON (.json) format
              </p>
            </div>

            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.json"
                className="hidden"
                onChange={handleFileUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || campaignStatus === 'sending'}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                <span>{hasCustomers ? 'Upload New Customer List' : 'Upload Customer List'}</span>
              </button>
            </div>
          </div>

          {/* Success Banner */}
          {uploadSuccessMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2 text-xs font-semibold text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{uploadSuccessMessage}</span>
            </div>
          )}

          {/* Customer Table */}
          {hasCustomers ? (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center">#</th>
                      <th className="py-2.5 px-4 font-bold">Customer Name</th>
                      <th className="py-2.5 px-4 font-bold">Phone Number</th>
                      <th className="py-2.5 px-4 font-bold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {customers.map((c, index) => (
                      <tr key={c.id || index} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                          {index + 1}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-slate-900">{c.name}</td>
                        <td className="py-2.5 px-4 font-mono text-slate-600">
                          {c.maskedPhone || maskPhone(c.phone)}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              c.status === 'sent'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : c.status === 'sending'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200 animate-pulse'
                                : c.status === 'failed'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {c.status === 'sent' && '✓ Sent'}
                            {c.status === 'sending' && 'Sending...'}
                            {c.status === 'failed' && '✕ Failed'}
                            {c.status === 'pending' && 'Pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-slate-300 rounded-xl p-6 text-center text-xs text-slate-500 space-y-1">
              <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="font-semibold text-slate-700">No customer list loaded</p>
              <p className="text-[11px] text-slate-400">
                Click <strong>Upload Customer List</strong> above to load your Excel, CSV, or JSON file with{' '}
                <code className="bg-slate-100 px-1 py-0.5 rounded">Name</code> and{' '}
                <code className="bg-slate-100 px-1 py-0.5 rounded">Phone Number</code>.
              </p>
            </div>
          )}
        </section>

        {/* 4. WhatsApp Message Card */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">WhatsApp Message</h2>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>Approved Template</span>
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p className="text-sm text-slate-800 font-medium italic leading-relaxed">
              "{APPROVED_MESSAGE}"
            </p>
          </div>

          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-slate-500">
              Approved loan outreach template configured for IDFC FIRST Bank borrower communication.
            </p>
            <button
              type="button"
              onClick={() => setIsMessageConfirmed((prev) => !prev)}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 shadow-2xs ${
                isMessageConfirmed
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
              }`}
            >
              {isMessageConfirmed ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>✓ Message Confirmed</span>
                </>
              ) : (
                <span>Confirm Message</span>
              )}
            </button>
          </div>
        </section>

        {/* 5. Send Action & 6. Simple Sending Status */}
        <section className="space-y-4 pt-2">
          {/* Action Button */}
          <div className="flex flex-col items-center justify-center space-y-2">
            <button
              type="button"
              onClick={() => setIsConfirmModalOpen(true)}
              disabled={!isSendEnabled}
              className="w-full sm:w-96 py-3.5 px-6 bg-[#9E1B32] hover:bg-[#831427] text-white font-bold text-sm rounded-2xl shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-101 active:scale-99"
            >
              <Send className="w-4 h-4" />
              <span>Send WhatsApp Messages</span>
            </button>

            {!isSendEnabled && campaignStatus !== 'sending' && (
              <p className="text-xs text-slate-400 text-center">
                {!hasCustomers
                  ? '• Please upload your customer list'
                  : !isConnected
                  ? '• Please connect your WhatsApp device'
                  : !isMessageConfirmed
                  ? '• Please click [Confirm Message] above'
                  : ''}
              </p>
            )}
          </div>

          {/* 6. Simple Sending Status Display */}
          {campaignStatus === 'sending' && (
            <div className="bg-white rounded-2xl border border-blue-200 p-5 shadow-xs space-y-3 text-center animate-in fade-in duration-200">
              <div className="flex items-center justify-center space-x-2 text-sm font-bold text-slate-800">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping"></span>
                <span>
                  Sending... {campaignStats.sent + campaignStats.failed} / {campaignStats.total}
                </span>
              </div>

              {/* Clean Minimalist Progress Bar */}
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden max-w-md mx-auto">
                <div
                  className="bg-[#9E1B32] h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${
                      campaignStats.total > 0
                        ? Math.round(((campaignStats.sent + campaignStats.failed) / campaignStats.total) * 100)
                        : 0
                    }%`
                  }}
                ></div>
              </div>
            </div>
          )}

          {campaignStatus === 'completed' && (
            <div className="bg-white rounded-2xl border border-emerald-200 p-5 shadow-xs space-y-3 text-center animate-in fade-in duration-200">
              <div className="flex items-center justify-center space-x-2 text-sm font-bold text-emerald-800">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>🟢 Messages processed</span>
              </div>
              <div className="flex items-center justify-center space-x-6 text-xs font-semibold">
                <span className="text-emerald-700">Sent: {campaignStats.sent}</span>
                <span className="text-rose-600">Failed: {campaignStats.failed}</span>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors inline-flex items-center space-x-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Campaign</span>
                </button>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center text-xs text-slate-400">
          IDFC FIRST Bank • Authorized WhatsApp Outreach Platform
        </div>
      </footer>

      {/* Confirmation Dialog: Ready to send */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 animate-in fade-in zoom-in duration-150">
            <h3 className="text-base font-bold text-slate-900">Ready to send</h3>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="font-semibold text-slate-500 block mb-0.5">Recipients:</span>
                <span className="text-sm font-bold text-slate-900">{customers.length}</span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="font-semibold text-slate-500 block mb-1">Message:</span>
                <p className="italic text-slate-800 font-medium leading-relaxed">
                  "{APPROVED_MESSAGE}"
                </p>
              </div>

              <p className="text-[11px] text-slate-500 leading-normal">
                Only send to authorized recipients and follow applicable WhatsApp messaging/consent requirements.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAndSend}
                className="py-2.5 px-4 bg-[#9E1B32] hover:bg-[#831427] text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
              >
                Confirm & Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
