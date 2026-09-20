import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import Navbar from './components/Navbar';
import ChatbotPanel from './components/ChatbotPanel';
import CampaignDashboard from './components/CampaignDashboard';
import LoanPortfolioOverview from './components/LoanPortfolioOverview';
import WhatsAppConfigModal from './components/WhatsAppConfigModal';
import TestMessageModal from './components/TestMessageModal';
import { Lock, CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('chatbot');
  const [whatsAppStatus, setWhatsAppStatus] = useState(null);
  const [campaignState, setCampaignState] = useState({
    campaignId: 'CAMP-IDFC-ACTIVE',
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

  // Fetch initial WhatsApp status
  const fetchWhatsAppStatus = async () => {
    try {
      const res = await fetch('/api/whatsapp/status');
      const data = await res.json();
      setWhatsAppStatus(data);
    } catch (err) {
      console.error('Failed to fetch WhatsApp status:', err);
    }
  };

  useEffect(() => {
    fetchWhatsAppStatus();

    // Subscribe to Server-Sent Events for real-time campaign updates
    const eventSource = new EventSource('/api/campaign/stream');

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setCampaignState(data);

        // Confetti celebration when campaign completes
        if (data.status === 'completed' && !prevCompletedRef.current) {
          prevCompletedRef.current = true;
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 }
          });
        }

        if (data.status !== 'completed') {
          prevCompletedRef.current = false;
        }
      } catch (err) {
        console.error('Error parsing SSE data:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.warn('SSE connection error:', err);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
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

      const data = await res.json();
      if (res.ok) {
        setUploadStats(data);
        showNotification(
          'success',
          `Loaded ${data.validRecipients} pre-qualified customers from ${file.name}.`
        );
      } else {
        showNotification('error', data.error || 'Failed to parse file.');
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
      const res = await fetch('/api/sample-data', {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        setUploadStats({
          filename: 'IDFC_Prequalified_Borrowers_Sample.xlsx',
          totalRows: data.validRecipients,
          validRecipients: data.validRecipients,
          duplicatesCount: 0,
          invalidRowsCount: 0
        });
        showNotification('success', `Loaded ${data.validRecipients} sample pre-qualified loan customers!`);
      } else {
        showNotification('error', data.error || 'Failed to load sample.');
      }
    } catch (err) {
      showNotification('error', err.message || 'Error loading sample.');
    } finally {
      setIsGeneratingSample(false);
    }
  };

  // Campaign controls
  const handleStartCampaign = async () => {
    try {
      const res = await fetch('/api/campaign/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorizationConfirmed: true })
      });
      const data = await res.json();
      if (res.ok) {
        showNotification('success', 'Campaign started. Dispatching approved messages...');
      } else {
        showNotification('error', data.error || 'Failed to start campaign.');
      }
    } catch (err) {
      showNotification('error', err.message || 'Network error.');
    }
  };

  const handlePauseCampaign = async () => {
    try {
      await fetch('/api/campaign/pause', { method: 'POST' });
      showNotification('info', 'Campaign paused.');
    } catch (err) {
      showNotification('error', err.message);
    }
  };

  const handleResumeCampaign = async () => {
    try {
      await fetch('/api/campaign/resume', { method: 'POST' });
      showNotification('success', 'Campaign resumed.');
    } catch (err) {
      showNotification('error', err.message);
    }
  };

  const handleStopCampaign = async () => {
    try {
      await fetch('/api/campaign/stop', { method: 'POST' });
      showNotification('info', 'Campaign stopped.');
    } catch (err) {
      showNotification('error', err.message);
    }
  };

  const handleThrottleChange = async (delayMs) => {
    try {
      await fetch('/api/campaign/throttle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delayMs })
      });
    } catch (err) {
      console.error('Throttle update error:', err);
    }
  };

  const handleTestSuccess = (data) => {
    showNotification('success', `Test verified successfully to ${data.maskedPhone}!`);
    fetchWhatsAppStatus();
  };

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
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
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

        {/* Chatbot Tab: Split screen on Desktop, standalone on Mobile */}
        {activeTab === 'chatbot' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full items-start">
            {/* Left Column: Chatbot Assistant */}
            <div className="lg:col-span-6 h-[720px]">
              <ChatbotPanel
                campaignState={campaignState}
                whatsAppStatus={whatsAppStatus}
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

            {/* Right Column: Campaign Dashboard & Queue HUD */}
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
