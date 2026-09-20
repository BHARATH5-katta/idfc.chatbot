import React, { useState, useEffect } from 'react';
import {
  Settings,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Globe,
  ExternalLink,
  ShieldCheck,
  Server
} from 'lucide-react';

export default function BackendConfigModal({
  isOpen,
  onClose,
  currentUrl,
  defaultEnvUrl,
  onSave
}) {
  const [urlInput, setUrlInput] = useState('');
  const [testStatus, setTestStatus] = useState(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setUrlInput(currentUrl || defaultEnvUrl || '');
      setTestStatus(null);
    }
  }, [isOpen, currentUrl, defaultEnvUrl]);

  if (!isOpen) return null;

  const handleTest = async () => {
    const rawUrl = urlInput.trim().replace(/\/+$/, '');
    const endpoint = rawUrl ? `${rawUrl}/api/health` : '/api/health';

    setIsTesting(true);
    setTestStatus(null);

    try {
      const startTime = Date.now();
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: { Accept: 'application/json' }
      });
      const latency = Date.now() - startTime;

      if (res.ok) {
        const data = await res.json();
        if (data.status === 'ok' && data.service === 'whatsapp-backend') {
          setTestStatus({
            ok: true,
            message: `Connected successfully! (status: ok, latency: ${latency}ms)`
          });
        } else {
          setTestStatus({
            ok: true,
            message: `Connected (${latency}ms), response: ${JSON.stringify(data)}`
          });
        }
      } else {
        setTestStatus({
          ok: false,
          message: `Backend returned HTTP ${res.status}: ${res.statusText}`
        });
      }
    } catch (err) {
      setTestStatus({
        ok: false,
        message: `Backend is not reachable (${err.message || 'Connection failed'}).`
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    const cleaned = urlInput.trim().replace(/\/+$/, '');
    onSave(cleaned);
  };

  const handleResetToEnv = () => {
    const envVal = (defaultEnvUrl || '').trim().replace(/\/+$/, '');
    setUrlInput(envVal);
    onSave(envVal);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Server className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-sm">Persistent Backend Configuration</h3>
              <p className="text-[11px] text-slate-300">
                Connect Vercel frontend to persistent Node.js WhatsApp backend
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs text-slate-700">
          <div>
            <label className="block font-bold text-slate-900 mb-1">
              Backend Server URL
            </label>
            <div className="relative">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://your-whatsapp-backend.railway.app"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9E1B32] focus:bg-white"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Example: <code className="bg-slate-100 px-1 py-0.5 rounded">https://your-service.onrender.com</code> or{' '}
              <code className="bg-slate-100 px-1 py-0.5 rounded">http://localhost:5000</code> in development.
            </p>
          </div>

          {/* Test Health Result */}
          {testStatus && (
            <div
              className={`p-3 rounded-xl border flex items-start space-x-2 text-xs font-medium ${
                testStatus.ok
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {testStatus.ok ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span className="break-all">{testStatus.message}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
            <button
              type="button"
              onClick={handleTest}
              disabled={isTesting}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition-colors flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'Testing /api/health...' : 'Test Health'}</span>
            </button>

            <div className="flex items-center space-x-2">
              {defaultEnvUrl && (
                <button
                  type="button"
                  onClick={handleResetToEnv}
                  className="px-3 py-2 text-slate-500 hover:text-slate-800 font-semibold transition-colors cursor-pointer"
                >
                  Use Vercel Env
                </button>
              )}
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 bg-[#9E1B32] hover:bg-[#831427] text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Save &amp; Reconnect
              </button>
            </div>
          </div>

          {/* Architecture info note */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-3.5 space-y-1.5 text-[11px] text-slate-500">
            <p className="font-bold text-slate-700 flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Persistent Node.js Backend Architecture</span>
            </p>
            <p>
              WhatsApp Web sessions use persistent browser processes and local disk auth. The React frontend on Vercel communicates with this backend over HTTPS via <code className="bg-slate-200 px-1 py-0.2 rounded font-mono">VITE_WHATSAPP_BACKEND_URL</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
