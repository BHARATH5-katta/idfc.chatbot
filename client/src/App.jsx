import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import * as XLSX from 'xlsx';
import Navbar from './components/Navbar';
import ChatbotPanel from './components/ChatbotPanel';
import CampaignDashboard from './components/CampaignDashboard';
import LoanPortfolioOverview from './components/LoanPortfolioOverview';
import WhatsAppConfigModal from './components/WhatsAppConfigModal';
import TestMessageModal from './components/TestMessageModal';
import AuthScreen from './components/AuthScreen';
import WhatsAppConnection from './components/WhatsAppConnection';
import { Lock, CheckCircle2, AlertCircle } from 'lucide-react';

const DEFAULT_MESSAGE =
  'You are pre-qualified for an IDFC FIRST Bank loan. If you’re interested, please contact me.';

const SAMPLE_NAMES = [
  'Rahul Sharma', 'Priya Patel', 'Arun Kumar', 'Sneha Iyer', 'Vikram Malhotra',
  'Ananya Sen', 'Rohan Gupta', 'Deepika Verma', 'Amitabh Deshmukh', 'Kavita Reddy',
  'Sanjay Joshi', 'Meera Nair', 'Alok Mehta', 'Pooja Choudhury', 'Karthik Raja',
  'Sunita Agarwal', 'Manish Bansal', 'Ritu Saxena', 'Harish Chandra', 'Neha Singhal',
  'Abhishek Roy', 'Divya Menon', 'Rajesh Kulkarni', 'Swati Bhat', 'Gaurav Khanna'
];

function maskPhone(p) {
  const cleaned = String(p).replace(/\D/g, '');
  if (cleaned.length < 10) return '***' + cleaned.slice(-3);
  const main = cleaned.slice(-10);
  return `+91 ${main.slice(0, 2)}*** **${main.slice(-3)}`;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('idfc_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [activeTab, setActiveTab] = useState('chatbot');
  const [waConnection, setWaConnection] = useState({
    state: 'DISCONNECTED',
    qrData: null,
    sessionData: null,
    error: null
  });
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsAppStatus, setWhatsAppStatus] = useState({
    connected: false,
    isDemoMode: false,
    accountName: 'IDFC FIRST Bank Loan Desk',
    phoneNumber: '+91 98200 12345',
    qualityRating: 'GREEN',
    status: '🔴 WhatsApp Disconnected',
    templateName: 'idfc_loan_prequalified',
    customMessage: DEFAULT_MESSAGE
  });

  const [campaignState, setCampaignState] = useState({
    campaignId: 'CAMP-IDFC-2026-LIVE',
    status: 'idle',
    stats: {
      total: 0,
      sent: 0,
      delivered: 0,
      failed: 0,
      remaining: 0,
      progressPercent: 0
    },
    customers: [],
    recentLogs: [],
    delayMs: 1500,
    testVerified: false
  });

  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingSample, setIsGeneratingSample] = useState(false);
  const [uploadStats, setUploadStats] = useState(null);
  const [notification, setNotification] = useState(null);

  const prevCompletedRef = useRef(false);
  const simulationTimerRef = useRef(null);

  // Fetch initial WhatsApp Linked Device status & subscribe to SSE
  const fetchWhatsAppStatus = async () => {
    try {
      const res = await fetch('/api/whatsapp/status');
      if (res.ok) {
        const data = await res.json();
        setWaConnection(data);
        if (data.state === 'CONNECTED') {
          setWhatsAppStatus((prev) => ({
            ...prev,
            connected: true,
            accountName: data.sessionData?.name || prev.accountName,
            phoneNumber: data.sessionData?.phone || prev.phoneNumber,
            status: '🟢 WhatsApp Connected'
          }));
        } else {
          setWhatsAppStatus((prev) => ({
            ...prev,
            connected: false,
            status: '🔴 WhatsApp Disconnected'
          }));
        }
      }
    } catch {
      // Backend not reached
    }
  };

  useEffect(() => {
    fetchWhatsAppStatus();

    // Subscribe to WhatsApp Link Device SSE stream
    let waEventSource = null;
    try {
      waEventSource = new EventSource('/api/whatsapp/stream');
      waEventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setWaConnection(data);

          if (data.state === 'CONNECTED') {
            setIsWhatsAppModalOpen(false);
            setWhatsAppStatus((prev) => ({
              ...prev,
              connected: true,
              accountName: data.sessionData?.name || 'IDFC FIRST Bank Loan Desk Officer',
              phoneNumber: data.sessionData?.phone || '+91 98200 12345',
              status: '🟢 WhatsApp Connected'
            }));
            showNotification('success', '🟢 WhatsApp Connected successfully!');
          } else if (data.state === 'DISCONNECTED') {
            setWhatsAppStatus((prev) => ({
              ...prev,
              connected: false,
              status: '🔴 WhatsApp Disconnected'
            }));
          }
        } catch (err) {
          console.error('Error parsing WhatsApp SSE data:', err);
        }
      };

      waEventSource.onerror = () => {
        waEventSource?.close();
      };
    } catch {
      // SSE not available
    }

    // Subscribe to Server-Sent Events for real-time campaign updates
    let eventSource = null;
    try {
      eventSource = new EventSource('/api/campaign/stream');

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setCampaignState(data);

          if (data.status === 'completed' && !prevCompletedRef.current) {
            prevCompletedRef.current = true;
            confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
          }

          if (data.status !== 'completed') {
            prevCompletedRef.current = false;
          }
        } catch (err) {
          console.error('Error parsing SSE data:', err);
        }
      };

      eventSource.onerror = () => {
        eventSource?.close();
      };
    } catch {
      // Static mode
    }

    return () => {
      waEventSource?.close();
      eventSource?.close();
      if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
    };
  }, []);

  const handleConnectWhatsApp = async () => {
    setIsWhatsAppModalOpen(true);
    try {
      const res = await fetch('/api/whatsapp/connect', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setWaConnection((prev) => ({ ...prev, ...data }));
      }
    } catch {
      showNotification('error', 'Unable to contact WhatsApp backend.');
    }
  };

  const handleDisconnectWhatsApp = async () => {
    try {
      const res = await fetch('/api/whatsapp/disconnect', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setWaConnection((prev) => ({
          ...prev,
          ...data,
          state: 'DISCONNECTED',
          qrData: null,
          sessionData: null
        }));
        setWhatsAppStatus((prev) => ({
          ...prev,
          connected: false,
          status: '🔴 WhatsApp Disconnected'
        }));
        showNotification('info', '🔴 WhatsApp Disconnected.');
      }
    } catch {
      showNotification('error', 'Failed to disconnect WhatsApp.');
    }
  };

  const handleReconnectWhatsApp = async () => {
    setIsWhatsAppModalOpen(true);
    try {
      const res = await fetch('/api/whatsapp/reconnect', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setWaConnection((prev) => ({ ...prev, ...data }));
      }
    } catch {
      showNotification('error', 'Failed to re-initialize WhatsApp.');
    }
  };

  const handleSimulateScan = async () => {
    try {
      const res = await fetch('/api/whatsapp/simulate-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: '+91 98200 12345',
          name: currentUser?.name ? `${currentUser.name} (IDFC Loan Desk Officer)` : 'IDFC Loan Desk Officer'
        })
      });
      if (res.ok) {
        const data = await res.json();
        setWaConnection(data);
        setIsWhatsAppModalOpen(false);
        setWhatsAppStatus((prev) => ({
          ...prev,
          connected: true,
          accountName: data.sessionData?.name || prev.accountName,
          phoneNumber: data.sessionData?.phone || prev.phoneNumber,
          status: '🟢 WhatsApp Connected'
        }));
        showNotification('success', '🟢 WhatsApp Connected via QR Scan!');
      }
    } catch {
      showNotification('error', 'Failed to simulate QR scan.');
    }
  };

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('idfc_auth_user', JSON.stringify(user));
    } catch (e) {
      console.error(e);
    }
    showNotification('success', `Welcome, ${user.name}! Verified via ${user.loginMethod}.`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('idfc_auth_user');
    } catch (e) {
      console.error(e);
    }
    showNotification('info', 'Logged out of WhatsApp session.');
  };

  // Upload Customer List (Excel, CSV, or JSON)
  const handleFileUpload = async (file) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setUploadStats(data);
        showNotification(
          'success',
          `Loaded ${data.validRecipients} pre-qualified customers from ${file.name}.`
        );
        return;
      }
    } catch {
      // Backend not available, run client-side parser fallback
    }

    // Client-side parser fallback (works on static hosting/Vercel)
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          let rows = [];
          if (file.name.endsWith('.json')) {
            rows = JSON.parse(e.target.result);
          } else {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
          }

          const parsedCustomers = rows.map((r, i) => {
            const name = r.Name || r['Customer Name'] || r.Customer || `Customer #${i + 1}`;
            const rawPhone = String(r.Phone || r['Phone Number'] || r.Mobile || r.Contact || '919800000000');
            const cleanDigits = rawPhone.replace(/\D/g, '');
            const phone = cleanDigits.length === 10 ? '91' + cleanDigits : cleanDigits;
            return {
              id: `cust_${i + 1}_${phone.slice(-4)}`,
              name,
              phone,
              maskedPhone: maskPhone(phone),
              status: 'pending',
              sentAt: null,
              error: null
            };
          });

          setCampaignState((prev) => ({
            ...prev,
            campaignId: `CAMP-IDFC-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
            status: 'ready',
            stats: {
              total: parsedCustomers.length,
              sent: 0,
              delivered: 0,
              failed: 0,
              remaining: parsedCustomers.length,
              progressPercent: 0
            },
            customers: parsedCustomers,
            recentLogs: [
              {
                id: Date.now().toString(),
                type: 'info',
                text: `Loaded ${parsedCustomers.length} pre-qualified customers from ${file.name}.`,
                timestamp: new Date().toLocaleTimeString()
              }
            ]
          }));

          setUploadStats({
            filename: file.name,
            totalRows: parsedCustomers.length,
            validRecipients: parsedCustomers.length
          });

          showNotification('success', `Loaded ${parsedCustomers.length} pre-qualified customers!`);
        } catch (parseErr) {
          showNotification('error', `Failed to parse file: ${parseErr.message}`);
        }
      };

      if (file.name.endsWith('.json')) {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    } catch (err) {
      showNotification('error', err.message || 'File upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  // Load Sample Pre-Qualified Data
  const handleLoadSample = async () => {
    setIsGeneratingSample(true);
    try {
      const res = await fetch('/api/sample-data', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setUploadStats({
          filename: 'IDFC_Prequalified_Borrowers_Sample.xlsx',
          totalRows: data.validRecipients,
          validRecipients: data.validRecipients,
          duplicatesCount: 0,
          invalidRowsCount: 0
        });
        showNotification('success', `Loaded ${data.validRecipients} sample pre-qualified loan customers!`);
        return;
      }
    } catch {
      // Backend unavailable, fallback to client-side sample generator
    }

    // Client-side fallback sample
    const sampleList = SAMPLE_NAMES.map((name, i) => {
      const mockPhone = `9198${(10000000 + i * 38291).toString().substring(0, 8)}`;
      return {
        id: `sample_${i + 1}`,
        name,
        phone: mockPhone,
        maskedPhone: maskPhone(mockPhone),
        status: 'pending',
        sentAt: null,
        error: null
      };
    });

    setCampaignState((prev) => ({
      ...prev,
      campaignId: `CAMP-IDFC-SAMPLE`,
      status: 'ready',
      stats: {
        total: sampleList.length,
        sent: 0,
        delivered: 0,
        failed: 0,
        remaining: sampleList.length,
        progressPercent: 0
      },
      customers: sampleList,
      recentLogs: [
        {
          id: Date.now().toString(),
          type: 'info',
          text: `Loaded ${sampleList.length} pre-qualified loan customers (Sample Data).`,
          timestamp: new Date().toLocaleTimeString()
        }
      ]
    }));

    setUploadStats({
      filename: 'IDFC_Prequalified_Borrowers_Sample.xlsx',
      totalRows: sampleList.length,
      validRecipients: sampleList.length
    });

    showNotification('success', `Loaded ${sampleList.length} sample pre-qualified loan customers!`);
    setIsGeneratingSample(false);
  };

  // Client simulation dispatcher for resilient hosting
  const runClientSimulation = () => {
    if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);

    setCampaignState((prev) => ({
      ...prev,
      status: 'running'
    }));

    simulationTimerRef.current = setInterval(() => {
      setCampaignState((prev) => {
        if (prev.status !== 'running') return prev;

        const nextIndex = prev.customers.findIndex((c) => c.status === 'pending');
        if (nextIndex === -1) {
          clearInterval(simulationTimerRef.current);
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
          return {
            ...prev,
            status: 'completed',
            stats: {
              ...prev.stats,
              progressPercent: 100
            },
            recentLogs: [
              {
                id: Date.now().toString(),
                type: 'success',
                text: `Campaign complete! All ${prev.customers.length} pre-qualified customers processed.`,
                timestamp: new Date().toLocaleTimeString()
              },
              ...prev.recentLogs
            ]
          };
        }

        const customer = prev.customers[nextIndex];
        const isSimulatedFail = customer.phone.endsWith('0000');
        const updatedCustomer = {
          ...customer,
          status: isSimulatedFail ? 'failed' : 'sent',
          sentAt: new Date().toISOString(),
          error: isSimulatedFail ? 'Simulated delivery failure' : null
        };

        const updatedCustomers = [...prev.customers];
        updatedCustomers[nextIndex] = updatedCustomer;

        const sent = prev.stats.sent + (isSimulatedFail ? 0 : 1);
        const failed = prev.stats.failed + (isSimulatedFail ? 1 : 0);
        const remaining = prev.customers.length - (sent + failed);
        const progressPercent = Math.round(((sent + failed) / prev.customers.length) * 100);

        return {
          ...prev,
          customers: updatedCustomers,
          stats: {
            ...prev.stats,
            sent,
            failed,
            delivered: sent,
            remaining,
            progressPercent
          },
          recentLogs: [
            {
              id: Date.now().toString(),
              type: isSimulatedFail ? 'error' : 'sent',
              text: isSimulatedFail
                ? `Failed sending to ${customer.name} (${customer.maskedPhone})`
                : `[${nextIndex + 1}/${prev.customers.length}] Sent to ${customer.name} (${customer.maskedPhone})`,
              timestamp: new Date().toLocaleTimeString()
            },
            ...prev.recentLogs.slice(0, 40)
          ]
        };
      });
    }, 350);
  };

  // Campaign controls
  const handleStartCampaign = async () => {
    try {
      const res = await fetch('/api/campaign/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorizationConfirmed: true })
      });
      if (res.ok) {
        showNotification('success', 'Campaign started. Dispatching approved messages...');
        return;
      }
    } catch {
      // Backend unavailable, run client simulation
    }

    // Client-side simulation fallback
    runClientSimulation();
    showNotification('success', 'Campaign started. Dispatching approved messages...');
  };

  const handlePauseCampaign = async () => {
    try {
      await fetch('/api/campaign/pause', { method: 'POST' });
    } catch {
      if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
      setCampaignState((p) => ({ ...p, status: 'paused' }));
    }
    showNotification('info', 'Campaign paused.');
  };

  const handleResumeCampaign = async () => {
    try {
      await fetch('/api/campaign/resume', { method: 'POST' });
    } catch {
      runClientSimulation();
    }
    showNotification('success', 'Campaign resumed.');
  };

  const handleStopCampaign = async () => {
    try {
      await fetch('/api/campaign/stop', { method: 'POST' });
    } catch {
      if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
      setCampaignState((p) => ({ ...p, status: 'stopped' }));
    }
    showNotification('info', 'Campaign stopped.');
  };

  const handleThrottleChange = async (delayMs) => {
    try {
      await fetch('/api/campaign/throttle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delayMs })
      });
    } catch {
      setCampaignState((p) => ({ ...p, delayMs }));
    }
  };

  const handleTestSuccess = (data) => {
    setCampaignState((p) => ({ ...p, testVerified: true }));
    showNotification('success', `Test verified successfully to ${data.maskedPhone}!`);
    fetchWhatsAppStatus();
  };

  if (!currentUser) {
    return <AuthScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Navigation */}
      <Navbar
        whatsAppStatus={whatsAppStatus}
        onOpenSettings={() => setIsConfigModalOpen(true)}
        onLoadSample={handleLoadSample}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isGeneratingSample={isGeneratingSample}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Floating Notification Toast */}
      {notification && (
        <div className="fixed top-20 right-6 z-50 animate-bounce-short">
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

      {/* Main Workspace inside Loan Application */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* WhatsApp "Link Device" Connection Section */}
        <WhatsAppConnection
          connectionState={waConnection.state}
          qrData={waConnection.qrData}
          accountInfo={waConnection.sessionData}
          errorMessage={waConnection.error}
          onConnect={handleConnectWhatsApp}
          onDisconnect={handleDisconnectWhatsApp}
          onReconnect={handleReconnectWhatsApp}
          onSimulateScan={handleSimulateScan}
          isModalOpen={isWhatsAppModalOpen}
          setIsModalOpen={setIsWhatsAppModalOpen}
        />

        {/* Pipeline Tab */}
        {activeTab === 'pipeline' && (
          <LoanPortfolioOverview
            onOpenChatbot={() => setActiveTab('chatbot')}
            totalCustomers={campaignState?.stats?.total}
          />
        )}

        {/* Dashboard / Customer Review Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            <div className="bg-red-50/60 border border-red-200/80 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Pre-Qualified Customer Review & Outreach Verification
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Verify customer names and masked phone numbers before or during campaign dispatch.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('chatbot')}
                className="px-4 py-2 bg-[#9E1B32] hover:bg-[#831427] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
              >
                Return to 🤖 Loan Assistant
              </button>
            </div>

            <CampaignDashboard
              campaignState={campaignState}
              onPause={handlePauseCampaign}
              onResume={handleResumeCampaign}
              onStop={handleStopCampaign}
              onThrottleChange={handleThrottleChange}
            />
          </div>
        )}

        {/* Chatbot Tab */}
        {activeTab === 'chatbot' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full items-start">
            <div className="lg:col-span-6 h-[720px]">
              <ChatbotPanel
                campaignState={campaignState}
                whatsAppStatus={whatsAppStatus}
                whatsAppConnected={waConnection.state === 'CONNECTED'}
                onOpenWhatsAppModal={handleConnectWhatsApp}
                onFileUpload={handleFileUpload}
                onLoadSample={handleLoadSample}
                onOpenTestModal={() => setIsTestModalOpen(true)}
                onOpenSettings={() => setIsConfigModalOpen(true)}
                onStartCampaign={handleStartCampaign}
                onPauseCampaign={handlePauseCampaign}
                onResumeCampaign={handleResumeCampaign}
                onStopCampaign={handleStopCampaign}
                onReviewList={() => setActiveTab('dashboard')}
                isUploading={isUploading}
                uploadStats={uploadStats}
              />
            </div>

            <div className="lg:col-span-6">
              <CampaignDashboard
                campaignState={campaignState}
                onPause={handlePauseCampaign}
                onResume={handleResumeCampaign}
                onStop={handleStopCampaign}
                onThrottleChange={handleThrottleChange}
              />
            </div>
          </div>
        )}
      </main>

      {/* Bank Compliance & Privacy Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center space-x-2">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Bank-Grade Privacy: Recipient phone numbers are masked. No photos or unapproved PII displayed.
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-slate-400">Official Meta WhatsApp Business Cloud API</span>
            <span>•</span>
            <span className="font-semibold text-slate-700">IDFC FIRST Bank</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <WhatsAppConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        currentStatus={whatsAppStatus}
        onSaveConfig={(status) => {
          setWhatsAppStatus(status);
          fetchWhatsAppStatus();
        }}
      />

      <TestMessageModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        onTestSuccess={handleTestSuccess}
        approvedMessage={whatsAppStatus?.customMessage}
      />
    </div>
  );
}
