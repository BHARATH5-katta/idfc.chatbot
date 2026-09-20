import React, { useState, useEffect } from 'react';
import {
  Building2,
  QrCode,
  Smartphone,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  Lock,
  CheckCircle2,
  Sparkles,
  KeyRound
} from 'lucide-react';

export default function AuthScreen({ onLoginSuccess }) {
  const [authMethod, setAuthMethod] = useState('qr'); // 'qr' | 'otp'
  const [phoneNumber, setPhoneNumber] = useState('+91 98201 23456');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [qrKey, setQrKey] = useState(1);
  const [qrCountdown, setQrCountdown] = useState(60);
  const [isScanning, setIsScanning] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [authError, setAuthError] = useState(null);

  // QR code expiration countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setQrCountdown((prev) => {
        if (prev <= 1) {
          setQrKey((k) => k + 1);
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [qrKey]);

  // Simulate QR Code scanning
  const handleSimulateScan = () => {
    setIsScanning(true);
    setAuthError(null);
    setTimeout(() => {
      setIsScanning(false);
      onLoginSuccess({
        name: 'Rohan Varma',
        role: 'Senior Lending Officer',
        branch: 'Mumbai - BKC Branch #402',
        phoneNumber: '+91 98*** **456',
        loginMethod: 'WhatsApp QR Scanner'
      });
    }, 1200);
  };

  // Send WhatsApp OTP
  const handleSendOtp = (e) => {
    e.preventDefault();
    if (!phoneNumber || phoneNumber.length < 10) {
      setAuthError('Please enter a valid 10-digit mobile number.');
      return;
    }
    setOtpSent(true);
    setOtpCode(['1', '8', '3', '4', '9', '2']); // Prefill demo OTP
    setAuthError(null);
  };

  // Verify WhatsApp OTP
  const handleVerifyOtp = (e) => {
    e.preventDefault();
    setIsVerifyingOtp(true);
    setAuthError(null);

    setTimeout(() => {
      setIsVerifyingOtp(false);
      onLoginSuccess({
        name: 'Rohan Varma',
        role: 'Senior Lending Officer',
        branch: 'Mumbai - BKC Branch #402',
        phoneNumber: phoneNumber.replace(/(\d{2})\d{5}(\d{3})/, '$1*** **$2'),
        loginMethod: 'WhatsApp OTP Verification'
      });
    }, 900);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-red-50/40 flex flex-col justify-center items-center p-4">
      {/* Brand Header */}
      <div className="text-center mb-6 max-w-md">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#9E1B32] text-white shadow-lg shadow-red-900/20 mb-3">
          <Building2 className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-[#9E1B32] tracking-tight">
          IDFC FIRST <span className="font-light text-slate-800">Bank</span>
        </h1>
        <p className="text-xs uppercase tracking-widest font-bold text-slate-500 mt-0.5">
          Retail Assets • Loan Origination Portal
        </p>
      </div>

      {/* Main Authentication Card */}
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200/80 max-w-md w-full overflow-hidden">
        {/* Method Selector Tabs */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-100/80 m-4 rounded-2xl border border-slate-200/60">
          <button
            type="button"
            onClick={() => {
              setAuthMethod('qr');
              setAuthError(null);
            }}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
              authMethod === 'qr'
                ? 'bg-white text-[#9E1B32] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>QR Scanner Login</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAuthMethod('otp');
              setAuthError(null);
            }}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
              authMethod === 'otp'
                ? 'bg-white text-[#9E1B32] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Login with WhatsApp</span>
          </button>
        </div>

        {/* Tab 1: WhatsApp QR Scanner Login */}
        {authMethod === 'qr' && (
          <div className="p-6 pt-2 text-center space-y-4 animate-fadeIn">
            <p className="text-xs text-slate-600 leading-relaxed">
              Use your authorized WhatsApp Business device to scan this code and log into the Loan Desk.
            </p>

            {/* QR Code Container with Scan Radar */}
            <div className="relative mx-auto w-56 h-56 p-3 bg-white rounded-2xl border-2 border-slate-200 shadow-inner flex items-center justify-center group">
              {/* Simulated QR Pattern Visual */}
              <div className="relative w-full h-full bg-slate-50 rounded-xl p-2 flex flex-col items-center justify-center overflow-hidden">
                {/* SVG QR Code Pattern */}
                <svg
                  className="w-full h-full text-slate-800"
                  viewBox="0 0 100 100"
                  fill="currentColor"
                >
                  <rect x="5" y="5" width="25" height="25" rx="3" fill="#9E1B32" />
                  <rect x="9" y="9" width="17" height="17" rx="2" fill="white" />
                  <rect x="13" y="13" width="9" height="9" fill="#9E1B32" />

                  <rect x="70" y="5" width="25" height="25" rx="3" fill="#9E1B32" />
                  <rect x="74" y="9" width="17" height="17" rx="2" fill="white" />
                  <rect x="78" y="13" width="9" height="9" fill="#9E1B32" />

                  <rect x="5" y="70" width="25" height="25" rx="3" fill="#9E1B32" />
                  <rect x="9" y="74" width="17" height="17" rx="2" fill="white" />
                  <rect x="13" y="78" width="9" height="9" fill="#9E1B32" />

                  {/* Dense Matrix Dots */}
                  <circle cx="40" cy="15" r="2.5" />
                  <circle cx="50" cy="15" r="2.5" />
                  <circle cx="60" cy="15" r="2.5" />
                  <circle cx="45" cy="25" r="2.5" />
                  <circle cx="55" cy="25" r="2.5" />

                  <circle cx="15" cy="40" r="2.5" />
                  <circle cx="25" cy="45" r="2.5" />
                  <circle cx="15" cy="55" r="2.5" />

                  <circle cx="40" cy="40" r="3.5" fill="#9E1B32" />
                  <circle cx="50" cy="50" r="4" fill="#9E1B32" />
                  <circle cx="60" cy="40" r="3.5" fill="#9E1B32" />
                  <circle cx="40" cy="60" r="3.5" fill="#9E1B32" />
                  <circle cx="60" cy="60" r="3.5" fill="#9E1B32" />

                  <circle cx="75" cy="45" r="2.5" />
                  <circle cx="85" cy="45" r="2.5" />
                  <circle cx="75" cy="55" r="2.5" />
                  <circle cx="85" cy="55" r="2.5" />

                  <circle cx="40" cy="75" r="2.5" />
                  <circle cx="50" cy="75" r="2.5" />
                  <circle cx="60" cy="75" r="2.5" />
                  <circle cx="45" cy="85" r="2.5" />
                  <circle cx="55" cy="85" r="2.5" />
                  <circle cx="75" cy="80" r="3" fill="#9E1B32" />
                  <circle cx="85" cy="80" r="2.5" />
                  <circle cx="80" cy="90" r="3" fill="#9E1B32" />
                </svg>

                {/* Animated Green Scanning Line */}
                <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 shadow-[0_0_8px_#10b981] animate-[bounce_2.5s_infinite]"></div>

                {/* Bank Emblem Center Overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-10 h-10 rounded-xl bg-white shadow-md border border-slate-200 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-[#9E1B32]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Countdown & Refresh Indicator */}
            <div className="flex items-center justify-center space-x-2 text-[11px] text-slate-400 font-medium">
              <RefreshCw className="w-3 h-3 animate-spin text-slate-400" />
              <span>QR code refreshes in <strong className="text-slate-700">{qrCountdown}s</strong></span>
            </div>

            {/* Scan Instructions */}
            <div className="bg-slate-50 rounded-2xl p-3.5 text-left border border-slate-200 text-xs text-slate-600 space-y-1.5">
              <p className="font-bold text-slate-800 text-[11px] uppercase tracking-wider mb-1">
                How to scan:
              </p>
              <div className="flex items-start space-x-2">
                <span className="w-4 h-4 rounded-full bg-red-100 text-[#9E1B32] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                <span>Open <strong>WhatsApp</strong> on your phone</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="w-4 h-4 rounded-full bg-red-100 text-[#9E1B32] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                <span>Tap <strong>Settings → Linked Devices</strong> or QR Scanner</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="w-4 h-4 rounded-full bg-red-100 text-[#9E1B32] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                <span>Point your phone at this screen to authenticate</span>
              </div>
            </div>

            {/* Simulate Scan Button */}
            <button
              type="button"
              onClick={handleSimulateScan}
              disabled={isScanning}
              className="w-full py-3 px-4 bg-[#9E1B32] hover:bg-[#831427] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 hover:scale-101 active:scale-99 disabled:opacity-50"
            >
              {isScanning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Authenticating WhatsApp Device...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simulate WhatsApp QR Scan (Instant Login)</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Tab 2: Login with WhatsApp Mobile & OTP */}
        {authMethod === 'otp' && (
          <div className="p-6 pt-2 space-y-4 animate-fadeIn">
            <p className="text-xs text-slate-600 leading-relaxed text-center">
              Enter your registered mobile number to receive a secure WhatsApp one-time login code.
            </p>

            {!otpSent ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    WhatsApp Mobile Number
                  </label>
                  <div className="relative">
                    <Smartphone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+91 98201 23456"
                      required
                      className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#9E1B32] outline-none font-mono"
                    />
                  </div>
                </div>

                {authError && (
                  <p className="text-xs text-rose-600 font-semibold">{authError}</p>
                )}

                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-[#9E1B32] hover:bg-[#831427] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2"
                >
                  <span>Send WhatsApp Login Code</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Code sent via WhatsApp</span> to{' '}
                    <span className="font-mono">{phoneNumber}</span>. Demo code filled below:
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 text-center">
                    Enter 6-Digit WhatsApp Code
                  </label>
                  <div className="flex justify-center space-x-2">
                    {otpCode.map((digit, index) => (
                      <input
                        key={index}
                        type="text"
                        maxLength="1"
                        value={digit}
                        onChange={(e) => {
                          const val = e.target.value;
                          const newCode = [...otpCode];
                          newCode[index] = val;
                          setOtpCode(newCode);
                        }}
                        className="w-10 h-12 text-center text-lg font-bold font-mono border-2 border-slate-300 rounded-xl focus:border-[#9E1B32] outline-none"
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isVerifyingOtp}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {isVerifyingOtp ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verifying Security Token...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>Verify & Access Loan Desk</span>
                    </>
                  )}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setOtpSent(false)}
                    className="text-[11px] text-slate-400 hover:text-slate-600 font-medium underline"
                  >
                    Change phone number
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Security Compliance Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center space-x-1">
            <Lock className="w-3 h-3 text-slate-400" />
            <span>256-Bit Bank Encryption</span>
          </span>
          <span className="text-emerald-700 font-semibold flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>IDFC FIRST Secured</span>
          </span>
        </div>
      </div>
    </div>
  );
}

