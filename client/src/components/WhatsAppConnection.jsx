import React from 'react';
import {
  QrCode,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  PowerOff,
  X,
  ExternalLink
} from 'lucide-react';

export default function WhatsAppConnection({
  connectionState = 'DISCONNECTED', // DISCONNECTED | CONNECTING | QR_READY | AUTHENTICATING | CONNECTED | AUTH_FAILURE | ERROR
  qrData = null,
  accountInfo = null,
  errorMessage = null,
  onConnect,
  onDisconnect,
  onRefreshQr,
  isModalOpen,
  setIsModalOpen
}) {
  const isConnected = connectionState === 'CONNECTED';
  const isConnecting = connectionState === 'CONNECTING';
  const isQrReady = connectionState === 'QR_READY';
  const isAuthenticating = connectionState === 'AUTHENTICATING';
  const isAuthFailure = connectionState === 'AUTH_FAILURE';
  const isError = connectionState === 'ERROR';
  const isDisconnected = connectionState === 'DISCONNECTED';

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
      {/* Header with Title & Live Connection Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-xs ${
              isConnected
                ? 'bg-emerald-600'
                : isAuthenticating
                ? 'bg-blue-600'
                : isConnecting || isQrReady
                ? 'bg-amber-500'
                : isAuthFailure || isError
                ? 'bg-rose-600'
                : 'bg-slate-700'
            }`}
          >
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">WhatsApp Connection</h3>
            <p className="text-xs text-slate-500">
              Link authorized WhatsApp Web session to send approved customer loan notifications
            </p>
          </div>
        </div>

        {/* Real Status Badge (Driven exclusively by backend state) */}
        <div>
          {isConnected ? (
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
              <span>🟢 WhatsApp Connected</span>
            </span>
          ) : isConnecting ? (
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
              <RefreshCw className="w-3 h-3 mr-1.5 animate-spin text-amber-600" />
              <span>🟡 Connecting</span>
            </span>
          ) : isQrReady ? (
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs">
              <QrCode className="w-3 h-3 mr-1.5 text-amber-600" />
              <span>📱 Scan QR Code</span>
            </span>
          ) : isAuthenticating ? (
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
              <RefreshCw className="w-3 h-3 mr-1.5 animate-spin text-blue-600" />
              <span>🔵 Authenticating</span>
            </span>
          ) : isAuthFailure ? (
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
              <AlertCircle className="w-3 h-3 mr-1.5 text-rose-600" />
              <span>🔴 WhatsApp authentication failed</span>
            </span>
          ) : isError ? (
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
              <AlertCircle className="w-3 h-3 mr-1.5 text-rose-600" />
              <span>⚠️ Connection Error</span>
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-rose-500 mr-1.5"></span>
              <span>🔴 Not Connected</span>
            </span>
          )}
        </div>
      </div>

      {/* Connected Details or Connect Actions */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
        {isConnected ? (
          <>
            <div className="text-xs text-slate-600">
              <p className="font-bold text-emerald-800 flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>WhatsApp is ready</span>
              </p>
              <p className="text-slate-500 mt-0.5">
                {accountInfo?.name ? `${accountInfo.name} • ` : ''}
                {accountInfo?.number ? `${accountInfo.number} • ` : ''}
                {accountInfo?.device || 'WhatsApp Web'}
              </p>
            </div>
            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onRefreshQr}
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
            </div>
          </>
        ) : isAuthFailure ? (
          <>
            <div className="text-xs text-rose-800">
              <p className="font-bold">WhatsApp authentication failed</p>
              <p className="text-rose-600 text-[11px]">{errorMessage || 'The QR code was rejected or timed out.'}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(true);
                onRefreshQr();
              }}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Generate New QR</span>
            </button>
          </>
        ) : (
          <>
            <p className="text-xs text-slate-500">
              Click to launch WhatsApp Web session and scan the QR code from your phone.
            </p>
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(true);
                onConnect();
              }}
              className="w-full sm:w-auto px-5 py-2.5 bg-[#9E1B32] hover:bg-[#831427] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center space-x-2 hover:scale-101 active:scale-99"
            >
              <QrCode className="w-4 h-4" />
              <span>Connect WhatsApp</span>
            </button>
          </>
        )}
      </div>

      {/* Real QR Code Modal for "Link a Device" */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#9E1B32] to-[#7A1426] px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <QrCode className="w-5 h-5 text-white" />
                <div>
                  <h3 className="font-bold text-sm">Link WhatsApp Account</h3>
                  <p className="text-[11px] text-red-100">Scan this QR code using WhatsApp</p>
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
            <div className="p-6 text-center space-y-4">
              {/* Instructions */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left text-xs text-slate-700 space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-slate-900 text-xs">
                    Scan this QR code using WhatsApp → Linked Devices → Link a Device
                  </p>
                  <a
                    href="https://web.whatsapp.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-semibold text-[#9E1B32] hover:underline flex items-center space-x-1 shrink-0 ml-2"
                  >
                    <span>web.whatsapp.com</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-[11px] text-slate-500">
                  1. Open WhatsApp on your phone &nbsp;•&nbsp; 2. Tap Menu (⋮) or Settings (⚙️) &nbsp;•&nbsp; 3. Select Linked Devices &nbsp;•&nbsp; 4. Tap "Link a Device" and scan
                </p>
              </div>

              {/* QR Code Container */}
              <div className="relative mx-auto w-72 h-72 p-3 bg-white rounded-2xl border-2 border-slate-200 shadow-inner flex items-center justify-center">
                {isQrReady && qrData ? (
                  <div className="relative w-full h-full flex flex-col items-center justify-center">
                    <img
                      src={qrData}
                      alt="Actual WhatsApp Web Pairing QR Code"
                      className="w-full h-full object-contain rounded-xl"
                    />
                    {/* Centered Bank Icon */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-9 h-9 rounded-lg bg-white shadow-md border border-slate-200 flex items-center justify-center">
                        <span className="font-black text-xs text-[#9E1B32]">IDFC</span>
                      </div>
                    </div>
                  </div>
                ) : isAuthenticating ? (
                  <div className="flex flex-col items-center justify-center space-y-2 text-slate-600 p-4">
                    <RefreshCw className="w-10 h-10 text-blue-600 animate-spin" />
                    <p className="text-sm font-bold text-blue-900">🔵 Authenticating...</p>
                    <p className="text-xs text-slate-400">Verifying linked device credentials with WhatsApp...</p>
                  </div>
                ) : isConnecting ? (
                  <div className="flex flex-col items-center justify-center space-y-2 text-slate-600 p-4">
                    <RefreshCw className="w-10 h-10 text-[#9E1B32] animate-spin" />
                    <p className="text-sm font-bold text-slate-900">🟡 Connecting to WhatsApp Web...</p>
                    <p className="text-xs text-slate-400">Requesting pairing challenge from WhatsApp servers...</p>
                  </div>
                ) : isAuthFailure ? (
                  <div className="flex flex-col items-center justify-center space-y-2 text-slate-600 p-4">
                    <AlertCircle className="w-10 h-10 text-rose-600" />
                    <p className="text-sm font-bold text-rose-800">🔴 WhatsApp authentication failed</p>
                    <p className="text-xs text-slate-400">The session expired or was rejected by phone.</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-2 text-slate-500 p-4">
                    <QrCode className="w-10 h-10 text-slate-400 animate-pulse" />
                    <p className="text-xs font-semibold">Initializing WhatsApp Web session...</p>
                  </div>
                )}
              </div>

              {/* Status and Action Buttons */}
              <div className="space-y-2 pt-1">
                {isQrReady && (
                  <p className="text-xs font-semibold text-slate-600 animate-pulse">
                    Waiting for scan...
                  </p>
                )}

                <div className="flex items-center justify-center space-x-3 pt-1">
                  <button
                    type="button"
                    onClick={onRefreshQr}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors inline-flex items-center space-x-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Refresh QR</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
