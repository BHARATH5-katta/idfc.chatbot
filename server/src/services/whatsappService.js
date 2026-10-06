import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { sanitizePhoneNumber } from './fileParser.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurable WhatsApp Session Path (e.g. WHATSAPP_SESSION_PATH=./whatsapp-session)
const SESSION_PATH = process.env.WHATSAPP_SESSION_PATH
  ? path.resolve(process.cwd(), process.env.WHATSAPP_SESSION_PATH)
  : path.resolve(__dirname, '../../whatsapp-session');

// Helper to locate Chrome/Edge/Chromium on Windows, Linux, and macOS
function getChromeExecutablePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  const candidates = [
    // Windows
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    // Linux / Docker / Cloud VPS
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    // macOS
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
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

// Exactly the connection states requested:
// DISCONNECTED | INITIALIZING | QR_READY | AUTHENTICATING | CONNECTED | ERROR
export const ConnectionState = {
  DISCONNECTED: 'DISCONNECTED',
  INITIALIZING: 'INITIALIZING',
  QR_READY: 'QR_READY',
  AUTHENTICATING: 'AUTHENTICATING',
  CONNECTED: 'CONNECTED',
  ERROR: 'ERROR'
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
    this.onCustomerResponseCallback = null;

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

  // Register callback for incoming customer messages / button replies
  onCustomerResponse(callback) {
    this.onCustomerResponseCallback = callback;
  }

  // Configuration getter/setter for compatibility
  get config() {
    return {
      customMessage: this.customMessage,
      isDemoMode: false
    };
  }

  setCustomMessage(msg) {
    if (msg && typeof msg === 'string') {
      this.customMessage = msg;
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
    return {
      status: this.state, // 'DISCONNECTED' | 'INITIALIZING' | 'QR_READY' | 'AUTHENTICATING' | 'CONNECTED' | 'ERROR'
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
      status: this.state === ConnectionState.QR_READY ? 'QR_READY' : 'UNAVAILABLE',
      state: this.state,
      qr: this.qrDataUrl,
      rawQr: this.rawQr
    };
  }

  // Initialize and connect single real WhatsApp Web client
  async connect() {
    // If already connected, return current status immediately
    if (this.state === ConnectionState.CONNECTED && this.client) {
      return this.getStatus();
    }

    // If currently initializing or waiting for scan, do not duplicate
    if (this.isStarting || this.state === ConnectionState.INITIALIZING || this.state === ConnectionState.QR_READY) {
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

      // Initialize single WhatsApp Web client
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
      this.notify();

      // 60-second QR Generation Timeout Guard
      this.qrTimeout = setTimeout(() => {
        if (
          this.state === ConnectionState.INITIALIZING ||
          this.state === ConnectionState.WAITING_FOR_QR
        ) {
          console.error('[WhatsApp] Error: Timeout waiting for WhatsApp QR code');
          this.state = ConnectionState.ERROR;
          this.lastError = 'WhatsApp service unavailable. Timeout generating QR code.';
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

      // Event 4: Customer incoming message / Button reply
      this.client.on('message', async (msg) => {
        try {
          if (msg.fromMe) return; // Do not process self outgoing messages
          if (msg.isGroupMsg) return; // Ignore groups

          const sender = msg.from;
          const cleanPhone = sender.replace('@c.us', '').replace(/\D/g, '');
          const body = (msg.body || '').trim();
          const msgType = msg.type || 'chat';

          console.log(`[WhatsApp] Incoming message from ${cleanPhone} (type: ${msgType}): "${body}"`);

          if (typeof this.onCustomerResponseCallback === 'function') {
            await this.onCustomerResponseCallback({
              phone: cleanPhone,
              text: body,
              msgType,
              rawMessage: msg
            });
          }
        } catch (err) {
          console.error('[WhatsApp] Incoming message handler error:', err);
        }
      });

      // Event 5: Poll vote update (when customer taps an option in native Poll)
      this.client.on('vote_update', async (vote) => {
        try {
          const sender = vote.voter || vote.from;
          if (!sender) return;
          const cleanPhone = String(sender).replace('@c.us', '').replace(/\D/g, '');
          const selectedOption = Array.isArray(vote.selectedOptions) && vote.selectedOptions.length > 0
            ? vote.selectedOptions[0]?.name || vote.selectedOptions[0]
            : null;

          if (selectedOption) {
            console.log(`[WhatsApp] Incoming poll vote from ${cleanPhone}: "${selectedOption}"`);
            if (typeof this.onCustomerResponseCallback === 'function') {
              await this.onCustomerResponseCallback({
                phone: cleanPhone,
                text: selectedOption,
                msgType: 'poll',
                rawVote: vote
              });
            }
          }
        } catch (err) {
          console.error('[WhatsApp] Incoming poll vote error:', err);
        }
      });

      // Event 6: Authentication failure
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

      // Event 7: Disconnected
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
        this.lastError = `WhatsApp initialization error: ${initErr?.message || 'Failed to start browser'}`;
        this.isStarting = false;
        this.notify();
      });

      this.isStarting = false;
      return this.getStatus();
    } catch (err) {
      console.error('[WhatsApp] Error launching client:', err?.message || err);
      this.state = ConnectionState.ERROR;
      this.lastError = `Failed to start WhatsApp client: ${err?.message || err}`;
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
    console.log('[WhatsApp] Disconnected (manual logout)');
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

  // Send initial approved loan message with native interactive options (✅ Interested / ❌ Not Interested)
  async sendInteractiveLoanMessage({ to, customerName = '', isPrequalified = true }) {
    if (this.state !== ConnectionState.CONNECTED || !this.client) {
      throw new Error('WhatsApp is not connected. Please scan the QR code to pair your device.');
    }

    const { valid, phone } = sanitizePhoneNumber(to);
    const targetPhone = valid ? phone : String(to).replace(/\D/g, '');
    if (!targetPhone) {
      throw new Error(`Invalid phone number: ${to}`);
    }

    let chatId = `${targetPhone}@c.us`;
    try {
      if (typeof this.client.getNumberId === 'function') {
        const numberId = await this.client.getNumberId(targetPhone);
        if (numberId && numberId._serialized) {
          chatId = numberId._serialized;
        }
      }
    } catch (e) {
      console.warn(`[WhatsApp] Warning resolving numberId for ${targetPhone}:`, e.message);
    }

    // Only use "pre-qualified" wording when data supports that claim
    const initialText = isPrequalified
      ? 'You are pre-qualified for an IDFC FIRST Bank loan. If you’re interested, please contact me.'
      : 'Information regarding IDFC FIRST Bank loan options. If you’re interested, please contact me.';

    console.log(`[WhatsApp] Dispatching interactive loan message to ${chatId}...`);

    let sentResult = null;
    let methodUsed = 'poll';

    // Strategy 1: Native Buttons (WhatsApp Web buttons class)
    try {
      const { Buttons } = pkg;
      if (Buttons) {
        const buttonsMsg = new Buttons(
          initialText,
          [
            { id: 'btn_interested', body: '✅ Interested' },
            { id: 'btn_not_interested', body: '❌ Not Interested' }
          ],
          'IDFC FIRST Bank',
          'Please select an option'
        );
        sentResult = await this.client.sendMessage(chatId, buttonsMsg);
        methodUsed = 'buttons';
      }
    } catch (btnErr) {
      console.log(`[WhatsApp] Buttons unavailable on current WhatsApp version (${btnErr.message}), using native Poll.`);
    }

    // Strategy 2: Native WhatsApp Poll (supported across 100% of WhatsApp Multi-Device platforms)
    if (!sentResult) {
      try {
        const { Poll } = pkg;
        if (Poll) {
          const pollMsg = new Poll(
            `${initialText}\n\nAre you interested?`,
            ['✅ Interested', '❌ Not Interested'],
            { pollCount: 1 }
          );
          sentResult = await this.client.sendMessage(chatId, pollMsg);
          methodUsed = 'poll';
        }
      } catch (pollErr) {
        console.log(`[WhatsApp] Poll send error (${pollErr.message}), using structured interactive prompt.`);
      }
    }

    // Strategy 3: Structured interactive prompt fallback
    if (!sentResult) {
      const fallbackText = `${initialText}\n\n*Please reply with one of the options below:*\n1️⃣ *✅ Interested*\n2️⃣ *❌ Not Interested*`;
      sentResult = await this.client.sendMessage(chatId, fallbackText);
      methodUsed = 'text_structured';
    }

    return {
      success: true,
      messageId: sentResult?.id?._serialized || sentResult?.id?.id || `msg_${Date.now()}`,
      to: chatId,
      method: methodUsed,
      initialText,
      timestamp: new Date().toISOString()
    };
  }

  // Send simple text WhatsApp message (for auto-replies)
  async sendMessage({ to, customerName = '', messageType = 'template', customMessage = null }) {
    if (this.state !== ConnectionState.CONNECTED || !this.client) {
      throw new Error('WhatsApp is not connected. Please scan the QR code to pair your device.');
    }

    const { valid, phone } = sanitizePhoneNumber(to);
    const targetPhone = valid ? phone : String(to).replace(/\D/g, '');
    if (!targetPhone) {
      throw new Error(`Invalid phone number: ${to}`);
    }

    const messageText = customMessage || this.customMessage;

    console.log(`[WhatsApp] Resolving recipient ${targetPhone}...`);
    let chatId = `${targetPhone}@c.us`;
    try {
      if (typeof this.client.getNumberId === 'function') {
        const numberId = await this.client.getNumberId(targetPhone);
        if (numberId && numberId._serialized) {
          chatId = numberId._serialized;
        }
      }
    } catch (e) {
      console.warn(`[WhatsApp] Warning resolving numberId for ${targetPhone}:`, e.message);
    }

    console.log(`[WhatsApp] Dispatching text message to ${chatId}...`);
    const sent = await this.client.sendMessage(chatId, messageText);

    return {
      success: true,
      messageId: sent?.id?._serialized || sent?.id?.id || `msg_${Date.now()}`,
      to: chatId,
      timestamp: new Date().toISOString()
    };
  }
}

export const whatsappService = new WhatsAppService();
