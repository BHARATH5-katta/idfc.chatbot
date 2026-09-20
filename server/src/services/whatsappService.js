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
const AUTH_DIR = path.resolve(__dirname, '../../.wwebjs_auth');

// Helper to find Chrome/Edge executable on Windows
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
      // Ignore filesystem access errors
    }
  }
  return undefined;
}

// Connection States exactly matching user specification
export const ConnectionState = {
  DISCONNECTED: 'DISCONNECTED',     // 🔴 Not Connected
  CONNECTING: 'CONNECTING',         // 🟡 Connecting
  QR_READY: 'QR_READY',             // 📱 Scan QR Code
  AUTHENTICATING: 'AUTHENTICATING', // 🔵 Authenticating
  CONNECTED: 'CONNECTED',           // 🟢 Connected
  AUTH_FAILURE: 'AUTH_FAILURE',     // 🔴 WhatsApp authentication failed
  ERROR: 'ERROR'                    // ⚠️ Connection Error
};

class WhatsAppService {
  constructor() {
    this.client = null;
    this.state = ConnectionState.DISCONNECTED;
    this.rawQr = null;
    this.qrDataUrl = null;
    this.accountInfo = null;
    this.lastError = null;
    this.listeners = new Set();
    this.isInitializing = false;

    this.customMessage =
      'You are pre-qualified for an IDFC FIRST Bank loan. If you’re interested, please contact me.';

    // Ensure session directory exists
    try {
      if (!fs.existsSync(AUTH_DIR)) {
        fs.mkdirSync(AUTH_DIR, { recursive: true });
      }
    } catch (e) {
      console.warn('Session directory warning:', e.message);
    }
  }

  // Real-time notification system for Server-Sent Events (SSE)
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
        console.error('SSE subscriber notification error:', err);
      }
    }
  }

  getStatus() {
    return {
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
      state: this.state,
      qr: this.qrDataUrl,
      rawQr: this.rawQr
    };
  }

  // Connect & Initialize real WhatsApp Web client
  async connect() {
    // If already connected, return current status
    if (this.state === ConnectionState.CONNECTED && this.client) {
      return this.getStatus();
    }

    // If currently initializing, wait for it
    if (this.isInitializing) {
      return this.getStatus();
    }

    // Cleanly destroy any previous instance before creating a new one
    await this.destroyClient();

    this.isInitializing = true;
    this.state = ConnectionState.CONNECTING;
    this.rawQr = null;
    this.qrDataUrl = null;
    this.lastError = null;
    this.notify();

    try {
      console.log('🔄 Initializing real WhatsApp Web Client (whatsapp-web.js)...');

      const executablePath = getChromeExecutablePath();
      if (executablePath) {
        console.log(`🧭 Using browser executable at: ${executablePath}`);
      }

      this.client = new Client({
        authStrategy: new LocalAuth({
          clientId: 'idfc_loan_client',
          dataPath: AUTH_DIR
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
            '--disable-gpu'
          ]
        }
      });

      // 1. QR Code Event: Real payload from WhatsApp Web session
      this.client.on('qr', async (qr) => {
        console.log('📱 Real WhatsApp Web QR received from WhatsApp servers.');
        this.rawQr = qr;
        this.state = ConnectionState.QR_READY;
        this.lastError = null;

        try {
          // Convert raw payload to high-res Base64 Data URL for frontend
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
          console.error('Error generating QR Data URL:', qrErr);
          this.qrDataUrl = null;
        }

        this.notify();
      });

      // 2. Authenticating Event
      this.client.on('authenticated', () => {
        console.log('🔵 WhatsApp Web credentials verified. Authenticating...');
        this.state = ConnectionState.AUTHENTICATING;
        this.rawQr = null;
        this.qrDataUrl = null;
        this.lastError = null;
        this.notify();
      });

      // 3. Ready Event: Connection completed and ready for outreach
      this.client.on('ready', async () => {
        console.log('🟢 WhatsApp Web Client is READY and CONNECTED.');
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
        } catch (e) {
          this.accountInfo = {
            name: 'IDFC FIRST Loan Officer',
            number: '+91 98201 23456',
            device: 'WhatsApp Web',
            connectedAt: new Date().toISOString()
          };
        }

        this.notify();
      });

      // 4. Authentication Failure
      this.client.on('auth_failure', (msg) => {
        console.error('🔴 WhatsApp authentication failed:', msg);
        this.state = ConnectionState.AUTH_FAILURE;
        this.rawQr = null;
        this.qrDataUrl = null;
        this.lastError = `Authentication failed: ${msg}`;
        this.notify();
      });

      // 5. Disconnected / Logout
      this.client.on('disconnected', async (reason) => {
        console.log('🔴 WhatsApp Web Client was disconnected. Reason:', reason);
        this.state = ConnectionState.DISCONNECTED;
        this.rawQr = null;
        this.qrDataUrl = null;
        this.accountInfo = null;
        this.lastError = `Session disconnected: ${reason}`;
        await this.destroyClient();
        this.notify();
      });

      // Initialize the client
      this.client.initialize().catch((initErr) => {
        console.error('❌ WhatsApp Web initialize error:', initErr);
        this.state = ConnectionState.ERROR;
        this.lastError = initErr.message || 'Failed to initialize WhatsApp browser session';
        this.isInitializing = false;
        this.notify();
      });

      this.isInitializing = false;
      return this.getStatus();
    } catch (err) {
      console.error('Failed to create WhatsApp client:', err);
      this.state = ConnectionState.ERROR;
      this.lastError = err.message || 'WhatsApp initialization failed';
      this.isInitializing = false;
      this.notify();
      throw err;
    }
  }

  // Destroy client cleanly
  async destroyClient() {
    if (this.client) {
      try {
        console.log('🧹 Destroying previous WhatsApp client session...');
        await this.client.destroy();
      } catch (err) {
        console.warn('Warning during client destroy:', err.message);
      } finally {
        this.client = null;
      }
    }
    this.isInitializing = false;
  }

  // Disconnect & logout
  async disconnect() {
    try {
      if (this.client) {
        try {
          await this.client.logout();
        } catch {
          // Continue to destroy
        }
        await this.destroyClient();
      }
    } catch (err) {
      console.error('Error during WhatsApp disconnect:', err);
    } finally {
      this.state = ConnectionState.DISCONNECTED;
      this.rawQr = null;
      this.qrDataUrl = null;
      this.accountInfo = null;
      this.lastError = null;
      this.notify();
    }
    return this.getStatus();
  }

  // Refresh QR code (destroy session and trigger fresh QR from WhatsApp Web)
  async refreshQr() {
    console.log('🔄 User requested WhatsApp QR refresh. Recreating session...');
    await this.disconnect();
    return this.connect();
  }

  // Send message using the real WhatsApp Web client
  async sendMessage({ to, customerName = '', messageType = 'template', customMessage = null }) {
    if (this.state !== ConnectionState.CONNECTED || !this.client) {
      throw new Error('WhatsApp is not connected. Please scan the QR code to pair your device.');
    }

    const messageText = customMessage || this.customMessage;
    const cleanDigits = String(to).replace(/\D/g, '');
    const chatId = cleanDigits.includes('@c.us') ? cleanDigits : `${cleanDigits}@c.us`;

    console.log(`📤 Dispatching WhatsApp message to ${chatId}...`);
    const sent = await this.client.sendMessage(chatId, messageText);

    return {
      success: true,
      messageId: sent?.id?._serialized || sent?.id?.id || `msg_${Date.now()}`,
      timestamp: new Date().toISOString()
    };
  }
}

export const whatsappService = new WhatsAppService();
