import React, { useState } from 'react';
import {
  Server,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Terminal,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

export default function BackendSetupCard({
  backendUrl,
  onSaveBackendUrl,
  onRetry
}) {
  const [urlInput, setUrlInput] = useState(backendUrl || 'http://localhost:5000');
  const [testResult, setTestResult] = useState(null);
  const [isTesting, setIsTesting] = useState(false);

  const handleTest = async () => {
    const rawUrl = urlInput.trim().replace(/\/+$/, '');
    const endpoint = rawUrl ? `${rawUrl}/api/health` : '/api/health';

    setIsTesting(true);
    setTestResult(null);

    try {
      const startTime = Date.now();
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: { Accept: 'application/json' }
      });
      const latency = Date.now() - startTime;

      if (res.ok) {
        const data = await res.json();
        setTestResult({
          ok: true,
          message: `Backend reachable! (service: ${data.service || 'whatsapp-backend'}, latency: ${latency}ms)`
        });
      } else {
        setTestResult({
          ok: false,
          message: `Backend responded with HTTP ${res.status}: ${res.statusText}`
        });
      }
    } catch (err) {
      setTestResult({
        ok: false,
        message: `Backend is unreachable: ${err.message || 'Connection refused'}. Ensure persistent server is running.`
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleConnect = () => {
    const cleaned = urlInput.trim().replace(/\/+$/, '');
    onSaveBackendUrl(cleaned);
  };

  return (
    <section className="bg-white rounded-2xl border-2 border-amber-300 shadow-sm p-6 space-y-5 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-slate-900">
                Persistent Backend Required
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 uppercase">
                Action Needed
              </span>
            </div>
            <p className="text-xs text-slate-500">
              WhatsApp Web sessions run on a persistent Node.js server. Connect your backend below.
            </p>
          </div>
        </div>

        <div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-2 h-2 rounded-full bg-rose-500 mr-1.5 animate-pulse"></span>
            🔴 Backend Not Connected
          </span>
        </div>
      </div>

      {/* Explanation Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 space-y-1.5">
        <div className="flex items-center space-x-2 font-bold text-amber-950">
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
          <span>Vercel Frontend &harr; Persistent Node.js Backend Architecture</span>
        </div>
        <p className="text-[11px] leading-relaxed text-amber-900">
          The dashboard is hosted on Vercel as a static frontend. WhatsApp Web requires a persistent browser process (<code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold">whatsapp-web.js</code>) and writable session storage, which must run on a persistent server (not inside a Vercel serverless function).
        </p>
      </div>

      {/* Connection Form */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
        <label className="block text-xs font-bold text-slate-800">
          Persistent Backend URL
        </label>
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="http://localhost:5000 or https://your-backend.railway.app"
            className="flex-1 w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B32]"
          />
          <button
            type="button"
            onClick={handleTest}
            disabled={isTesting}
            className="w-full sm:w-auto px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-colors flex items-center justify-center space-x-1.5 shrink-0 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
            <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
          </button>
          <button
            type="button"
            onClick={handleConnect}
            className="w-full sm:w-auto px-4 py-2 bg-[#9E1B32] hover:bg-[#831427] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center space-x-1 shrink-0 cursor-pointer"
          >
            <span>Connect Backend</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Test Result Feedback */}
        {testResult && (
          <div
            className={`p-3 rounded-xl border flex items-start space-x-2 text-xs font-medium ${
              testResult.ok
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {testResult.ok ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <span className="break-all">{testResult.message}</span>
          </div>
        )}
      </div>

      {/* Quick Setup Instructions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
          <p className="font-bold text-slate-900 flex items-center space-x-1.5">
            <Terminal className="w-4 h-4 text-slate-600" />
            <span>Option 1: Run Locally</span>
          </p>
          <p className="text-[11px] text-slate-500">
            In your project directory, start the persistent backend server:
          </p>
          <pre className="bg-slate-900 text-emerald-400 p-2 rounded-lg font-mono text-[11px] select-all">
            npm run server
          </pre>
          <p className="text-[11px] text-slate-400">
            Then use <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-700">http://localhost:5000</code> above.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
          <p className="font-bold text-slate-900 flex items-center space-x-1.5">
            <Server className="w-4 h-4 text-slate-600" />
            <span>Option 2: Deploy to Cloud</span>
          </p>
          <p className="text-[11px] text-slate-500">
            Deploy the <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-700 font-mono">server/</code> directory to Railway, Render, Fly.io, or VPS.
          </p>
          <p className="text-[11px] text-slate-500">
            Set environment variable: <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-700 font-mono">FRONTEND_URL=https://your-app.vercel.app</code>
          </p>
          <p className="text-[11px] text-slate-400">
            Then enter your deployed backend URL above.
          </p>
        </div>
      </div>
    </section>
  );
}
