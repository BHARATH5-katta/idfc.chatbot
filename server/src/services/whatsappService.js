import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurable WhatsApp Session Path (e.g. WHATSAPP_SESSION_PATH=./whatsapp-session)
const SESSION_PATH = process.env.WHATSAPP_SESSION_PATH
  ? path.resolve(process.cwd(), process.env.WHATSAPP_SESSION_PATH)
  : path.resolve(__dirname, '../../whatsapp-session');

// Helper to locate Chrome/Edge on Windows
function getChromeExecutablePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
  ];
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    } catch {
      // Ignore
    }
  }
  return undefined;
}

// Exactly the connection states requested by the user:
// Disconnected | Initializing | Waiting for QR | QR Ready | Authenticating | Connected | Error
export const ConnectionState = {
  DISCONNECTED: 'Disconnected',
  INITIALIZING: 'Initializing',
  WAITING_FOR_QR: 'Waiting for QR',
  QR_READY: 'QR Ready',
  AUTHENTICATING: 'Authenticating',
  CONNECTED: 'Connected',
  ERROR: 'Error'
};

class WhatsAppService {
  constructor() {
    this.client = null;
    this.state = ConnectionState.DISCONNECTED;
    this.rawQr = null;
    this.qrDataUrl = null;
    this.accountInfo = null;
    this.lastError = null;
    this.qrTimeout = null;
    this.listeners = new Set();
    this.isStarting = false;

    this.customMessage =
      'You are pre-qualified for an IDFC FIRST Bank loan. If you’re interested, please contact me.';

    try {
      if (!fs.existsSync(SESSION_PATH)) {
        fs.mkdirSync(SESSION_PATH, { recursive: true });
      }
    } catch (e) {
      console.warn('[WhatsApp] Session directory creation warning:', e.message);
    }
  }

  // Real-time notification system for SSE
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    const payload = this.getStatus();
    for (const listener of this.listeners) {
      try {
        listener(payload);
      } catch (err) {
        console.error('[WhatsApp] Listener notification error:', err);
      }
    }
  }

  getStatus() {
    let statusFormatted = 'disconnected';
    if (this.state === ConnectionState.CONNECTED) statusFormatted = 'connected';
    else if (this.state === ConnectionState.QR_READY) statusFormatted = 'qr_ready';
    else if (this.state === ConnectionState.INITIALIZING || this.state === ConnectionState.WAITING_FOR_QR) statusFormatted = 'initializing';
    else if (this.state === ConnectionState.AUTHENTICATING) statusFormatted = 'authenticating';
    else if (this.state === ConnectionState.ERROR) statusFormatted = 'error';

    return {
      status: statusFormatted,
      state: this.state,
      connected: this.state === ConnectionState.CONNECTED,
      qr: this.state === ConnectionState.QR_READY ? this.qrDataUrl : null,
      rawQr: this.state === ConnectionState.QR_READY ? this.rawQr : null,
      accountInfo: this.accountInfo,
      error: this.lastError,
      customMessage: this.customMessage,
      timestamp: new Date().toISOString()
    };
  }

  getQr() {
    return {
      status: this.state === ConnectionState.QR_READY ? 'qr_ready' : 'unavailable',
      state: this.state,
      qr: this.qrDataUrl,
      rawQr: this.rawQr
    };
  }

  // Initialize and connect real WhatsApp Web client
  async connect() {
    if (this.state === ConnectionState.CONNECTED && this.client) {
      return this.getStatus();
    }

    if (this.isStarting) {
      return this.getStatus();
    }

    // Cleanly tear down any previous or stalled client
    await this.destroyClient();

    this.isStarting = true;
    this.lastError = null;
    this.rawQr = null;
    this.qrDataUrl = null;

    console.log('[WhatsApp] Starting client');
    console.log('[WhatsApp] Browser starting');
    this.state = ConnectionState.INITIALIZING;
    this.notify();

    try {
      // Ensure session directory exists recursively before client initialization
      if (!fs.existsSync(SESSION_PATH)) {
        fs.mkdirSync(SESSION_PATH, { recursive: true });
      }

      const executablePath = getChromeExecutablePath();
      if (executablePath) {
        console.log(`[WhatsApp] Browser executable: ${executablePath}`);
      }

      this.client = new Client({
        authStrategy: new LocalAuth({
          clientId: 'idfc_loan_client',
          dataPath: SESSION_PATH
        }),
        puppeteer: {
          headless: true,
          executablePath,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-extensions'
          ],
          timeout: 60000
        }
      });

      console.log('[WhatsApp] Waiting for QR');
      this.state = ConnectionState.WAITING_FOR_QR;
      this.notify();

      // 60-second QR Generation Timeout Guard
      this.qrTimeout = setTimeout(() => {
        if (
          this.state === ConnectionState.INITIALIZING ||
          this.state === ConnectionState.WAITING_FOR_QR
        ) {
          console.error('[WhatsApp] Error: Timeout waiting for WhatsApp QR code');
          this.state = ConnectionState.ERROR;
          this.lastError = 'WhatsApp service unavailable. Please start/reconnect the WhatsApp service.';
          this.notify();
          this.destroyClient().catch(() => {});
        }
      }, 60000);

      // Event 1: Real QR Event from WhatsApp Web
      this.client.on('qr', async (qr) => {
        if (this.qrTimeout) {
          clearTimeout(this.qrTimeout);
          this.qrTimeout = null;
        }

        console.log('[WhatsApp] QR received');
        console.log('[WhatsApp] Waiting for scan');
        this.rawQr = qr;
        this.state = ConnectionState.QR_READY;
        this.lastError = null;

        try {
          this.qrDataUrl = await QRCode.toDataURL(qr, {
            errorCorrectionLevel: 'M',
            margin: 2,
            width: 320,
            color: {
              dark: '#9E1B32', // IDFC FIRST Crimson
              light: '#FFFFFF'
            }
          });
        } catch (qrErr) {
          console.error('[WhatsApp] Error creating QR image Data URL:', qrErr);
          this.qrDataUrl = null;
        }

        this.notify();
      });

      // Event 2: Authentication in progress
      this.client.on('authenticated', () => {
        if (this.qrTimeout) {
          clearTimeout(this.qrTimeout);
          this.qrTimeout = null;
        }

        console.log('[WhatsApp] Authentication received');
        this.state = ConnectionState.AUTHENTICATING;
        this.rawQr = null;
        this.qrDataUrl = null;
        this.lastError = null;
        this.notify();
      });

      // Event 3: Client Ready & Fully Authenticated
      this.client.on('ready', async () => {
        if (this.qrTimeout) {
          clearTimeout(this.qrTimeout);
          this.qrTimeout = null;
        }

        console.log('[WhatsApp] Client ready');
        this.state = ConnectionState.CONNECTED;
        this.rawQr = null;
        this.qrDataUrl = null;
        this.lastError = null;

        try {
          const info = this.client.info || {};
          this.accountInfo = {
            name: info.pushname || 'IDFC FIRST Loan Officer',
            number: info.wid?.user ? `+${info.wid.user}` : '+91 98201 23456',
            device: info.platform || 'WhatsApp Web',
            connectedAt: new Date().toISOString()
          };
        } catch {
          this.accountInfo = {
            name: 'IDFC FIRST Loan Officer',
            number: '+91 98201 23456',
            device: 'WhatsApp Web',
            connectedAt: new Date().toISOString()
          };
        }

        this.notify();
      });

      // Event 4: Authentication failure
      this.client.on('auth_failure', (msg) => {
        if (this.qrTimeout) {
          clearTimeout(this.qrTimeout);
          this.qrTimeout = null;
        }

        console.error('[WhatsApp] Error: Auth failure:', msg);
        this.state = ConnectionState.ERROR;
        this.rawQr = null;
        this.qrDataUrl = null;
        this.lastError = `WhatsApp authentication failed: ${msg}`;
        this.notify();
      });

      // Event 5: Disconnected
      this.client.on('disconnected', async (reason) => {
        console.log('[WhatsApp] Disconnected:', reason);
        this.state = ConnectionState.DISCONNECTED;
        this.rawQr = null;
        this.qrDataUrl = null;
        this.accountInfo = null;
        this.lastError = `Disconnected: ${reason}`;
        if (this.client) {
          try {
            this.client.removeAllListeners();
          } catch {}
          this.client = null;
        }
        this.isStarting = false;
        this.notify();
      });

      // Start client
      this.client.initialize().catch((initErr) => {
        console.error('[WhatsApp] Error during initialize:', initErr?.message || initErr);
        this.state = ConnectionState.ERROR;
        this.lastError = 'WhatsApp service unavailable. Please start/reconnect the WhatsApp service.';
        this.isStarting = false;
        this.notify();
      });

      this.isStarting = false;
      return this.getStatus();
    } catch (err) {
      console.error('[WhatsApp] Error launching client:', err?.message || err);
      this.state = ConnectionState.ERROR;
      this.lastError = 'WhatsApp service unavailable. Please start/reconnect the WhatsApp service.';
      this.isStarting = false;
      this.notify();
      return this.getStatus();
    }
  }

  // Safely destroy client
  async destroyClient() {
    if (this.qrTimeout) {
      clearTimeout(this.qrTimeout);
      this.qrTimeout = null;
    }
    if (this.client) {
      const c = this.client;
      this.client = null;
      try {
        c.removeAllListeners();
        await c.destroy().catch(() => {});
      } catch (e) {
        console.warn('[WhatsApp] Warning during destroy:', e.message);
      }
    }
    this.isStarting = false;
  }

  // Explicit user disconnect
  async disconnect() {
    console.log('[WhatsApp] Disconnected');
    try {
      if (this.client) {
        const c = this.client;
        this.client = null;
        try {
          c.removeAllListeners();
          await c.logout().catch(() => {});
          await c.destroy().catch(() => {});
        } catch {}
      }
    } catch (err) {
      console.warn('[WhatsApp] Error during disconnect:', err.message);
    } finally {
      this.state = ConnectionState.DISCONNECTED;
      this.rawQr = null;
      this.qrDataUrl = null;
      this.accountInfo = null;
      this.lastError = null;
      this.isStarting = false;
      this.notify();
    }
    return this.getStatus();
  }

  // Refresh QR code
  async refreshQr() {
    console.log('[WhatsApp] Starting client (Refresh QR)');
    await this.disconnect();
    return this.connect();
  }

  // Send real WhatsApp message
  async sendMessage({ to, customerName = '', messageType = 'template', customMessage = null }) {
    if (this.state !== ConnectionState.CONNECTED || !this.client) {
      throw new Error('WhatsApp is not connected. Please scan the QR code to pair your device.');
    }

    const messageText = customMessage || this.customMessage;
    const cleanDigits = String(to).replace(/\D/g, '');
    const chatId = cleanDigits.includes('@c.us') ? cleanDigits : `${cleanDigits}@c.us`;

    console.log(`[WhatsApp] Dispatching message to ${chatId}...`);
    const sent = await this.client.sendMessage(chatId, messageText);

    return {
      success: true,
      messageId: sent?.id?._serialized || sent?.id?.id || `msg_${Date.now()}`,
      timestamp: new Date().toISOString()
    };
  }
}

export const whatsappService = new WhatsAppService();
