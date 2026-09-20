import React, { useState, useEffect } from 'react';
import {
  QrCode,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  PowerOff,
  Link,
  ShieldCheck,
  X,
  Clock,
  ExternalLink,
  Lock,
  ChevronRight
} from 'lucide-react';

export default function WhatsAppConnection({
  connectionState = 'DISCONNECTED', // INITIALIZING | QR_READY | AUTHENTICATING | CONNECTED | DISCONNECTED | ERROR
  qrData = null,
  accountInfo = null,
  errorMessage = null,
  onConnect,
  onDisconnect,
  onReconnect,
  onSimulateScan,
  isModalOpen,
  setIsModalOpen
}) {
  const [countdown, setCountdown] = useState(30);

  // Countdown timer for QR expiration
  useEffect(() => {
    let timer = null;
    if (isModalOpen && connectionState === 'QR_READY') {
      setCountdown(30);
      timer = setInterval(() => {
        setCountdown((c) => (c > 1 ? c - 1 : 30));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isModalOpen, connectionState, qrData]);

  const isConnected = connectionState === 'CONNECTED';
  const isDisconnected = connectionState === 'DISCONNECTED';
  const isError = connectionState === 'ERROR';
  const isLoading = connectionState === 'INITIALIZING' || connectionState === 'AUTHENTICATING';

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-xs ${
              isConnected
                ? 'bg-emerald-600'
                : isDisconnected
                ? 'bg-slate-600'
                : 'bg-[#9E1B32]'
            }`}
          >
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-slate-800">WhatsApp Device Link</h3>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                Official Web Protocol
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Link authorized loan officer device to dispatch approved loan campaigns
            </p>
          </div>
        </div>

        {/* Live Status Pill */}
        <div className="flex items-center space-x-2">
          {isConnected ? (
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
              <span>🟢 WhatsApp Connected</span>
            </span>
          ) : isDisconnected ? (
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-slate-400 mr-1.5"></span>
              <span>WhatsApp Not Connected</span>
            </span>
          ) : isError ? (
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
              <span className="w-2 h-2 rounded-full bg-rose-500 mr-1.5"></span>
              <span>🔴 WhatsApp Disconnected</span>
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
              <RefreshCw className="w-3 h-3 mr-1.5 animate-spin text-amber-600" />
              <span>{connectionState}</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Connection Status Body */}
      <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        {isConnected ? (
          <div className="space-y-1 text-left w-full sm:w-auto">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-800">
                {accountInfo?.name || 'IDFC FIRST Bank Loan Desk'}
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                ({accountInfo?.number || '+91 98201 23456'})
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Linked via <strong>{accountInfo?.device || 'WhatsApp Web'}</strong> • Session active & safe
            </p>
          </div>
        ) : (
          <div className="space-y-1 text-left w-full sm:w-auto">
            <p className="text-xs font-semibold text-slate-700">
              Scan the QR code to pair your authorized WhatsApp Business device.
            </p>
            <p className="text-[11px] text-slate-400">
              Supports multi-device pairing without requiring your password or bypassing WhatsApp security.
            </p>
          </div>
        )}

        {/* Action Buttons based on state */}
        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          {isConnected ? (
            <>
              <button
                type="button"
                onClick={onReconnect}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center space-x-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reconnect</span>
              </button>
              <button
                type="button"
                onClick={onDisconnect}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition-colors flex items-center space-x-1.5"
              >
                <PowerOff className="w-3.5 h-3.5" />
                <span>Disconnect WhatsApp</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(true);
                onConnect();
              }}
              className="w-full sm:w-auto px-5 py-2.5 bg-[#9E1B32] hover:bg-[#831427] text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 hover:scale-101 active:scale-99"
            >
              <QrCode className="w-4 h-4" />
              <span>Connect WhatsApp</span>
            </button>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {isError && errorMessage && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={onReconnect}
            className="text-xs font-bold underline hover:text-rose-900"
          >
            Try Reconnecting
          </button>
        </div>
      )}

      {/* QR Code Modal for "Link a Device" */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#9E1B32] to-[#7A1426] px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <QrCode className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Link WhatsApp Account</h3>
                  <p className="text-xs text-red-100">Scan QR to pair loan outreach device</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 text-center space-y-5">
              {/* Instructions */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left text-xs text-slate-700 space-y-2">
                <p className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                  Open WhatsApp → Linked Devices → Link a Device → Scan this QR
                </p>
                <div className="space-y-1 text-slate-600 text-[11px]">
                  <p>1. Open <strong>WhatsApp</strong> on your authorized mobile phone</p>
                  <p>2. Tap <strong>Menu (⋮)</strong> or <strong>Settings (⚙️)</strong></p>
                  <p>3. Select <strong>Linked Devices</strong> and tap <strong>Link a Device</strong></p>
                  <p>4. Point your camera at this QR code to complete pairing</p>
                </div>
              </div>

              {/* QR Code Display Container */}
              <div className="relative mx-auto w-64 h-64 p-3 bg-white rounded-2xl border-2 border-slate-200 shadow-inner flex items-center justify-center">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center space-y-2 text-slate-500">
                    <RefreshCw className="w-8 h-8 text-[#9E1B32] animate-spin" />
                    <p className="text-xs font-semibold">
                      {connectionState === 'AUTHENTICATING'
                        ? 'Authenticating with WhatsApp...'
                        : 'Generating pairing QR code...'}
                    </p>
                  </div>
                ) : qrData ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <img
                      src={qrData}
                      alt="WhatsApp Link Device QR Code"
                      className="w-full h-full object-contain rounded-xl"
                    />
                    {/* Centered Bank Icon */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-9 h-9 rounded-lg bg-white shadow-md border border-slate-200 flex items-center justify-center">
                        <span className="font-black text-xs text-[#9E1B32]">IDFC</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-4 space-y-2">
                    <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                    <p className="text-xs text-slate-600 font-semibold">
                      QR code expired or not initialized.
                    </p>
                    <button
                      onClick={onConnect}
                      className="px-3 py-1.5 text-xs bg-[#9E1B32] text-white rounded-lg font-bold"
                    >
                      Regenerate QR
                    </button>
                  </div>
                )}
              </div>

              {/* Countdown & Refresh Indicator */}
              {qrData && (
                <div className="flex items-center justify-center space-x-1.5 text-xs text-slate-500 font-medium">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    Auto-refreshing QR in <strong className="text-slate-800">{countdown}s</strong>
                  </span>
                </div>
              )}

              {/* Simulation button for instant demo testing */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    onSimulateScan();
                  }}
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simulate Phone Scan (Instant Connect)</span>
                </button>
                <p className="text-[10px] text-slate-400">
                  Simulates authorized device camera scan for verification without manual camera capture.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
