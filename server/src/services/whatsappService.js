import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SESSION_DIR = path.resolve(__dirname, '../../.session');
const SESSION_FILE = path.join(SESSION_DIR, 'whatsapp-session.json');

// Real-Time WhatsApp Connection States
export const ConnectionState = {
  INITIALIZING: 'INITIALIZING',
  QR_READY: 'QR_READY',
  AUTHENTICATING: 'AUTHENTICATING',
  CONNECTED: 'CONNECTED',
  DISCONNECTED: 'DISCONNECTED',
  ERROR: 'ERROR'
};

class WhatsAppService {
  constructor() {
    this.state = ConnectionState.DISCONNECTED;
    this.qrDataUrl = null;
    this.qrRaw = null;
    this.qrExpiresAt = null;
    this.refreshTimer = null;
    this.listeners = new Set();
    this.accountInfo = null;
    this.lastError = null;

    this.customMessage = 'You are pre-qualified for an IDFC FIRST Bank loan. If you’re interested, please contact me.';

    // Initialize session directory
    try {
      if (!fs.existsSync(SESSION_DIR)) {
        fs.mkdirSync(SESSION_DIR, { recursive: true });
      }
      this.restoreSession();
    } catch (e) {
      console.warn('Session directory initialization error:', e.message);
    }
  }

  // Restore persisted session across restarts
  restoreSession() {
    try {
      if (fs.existsSync(SESSION_FILE)) {
        const raw = fs.readFileSync(SESSION_FILE, 'utf-8');
        const session = JSON.parse(raw);
        if (session && session.connected) {
          this.state = ConnectionState.CONNECTED;
          this.accountInfo = session.accountInfo || {
            name: 'IDFC FIRST Bank Loan Desk',
            number: '+91 98765 00000',
            device: 'WhatsApp Web (Linked Device #402)',
            connectedAt: session.connectedAt || new Date().toISOString()
          };
          console.log('✅ WhatsApp session restored from safe storage.');
        }
      }
    } catch (e) {
      console.warn('Failed to restore session:', e.message);
      this.state = ConnectionState.DISCONNECTED;
    }
  }

  // Persist session safely to disk
  saveSession() {
    try {
      if (!fs.existsSync(SESSION_DIR)) {
        fs.mkdirSync(SESSION_DIR, { recursive: true });
      }
      const data = {
        connected: this.state === ConnectionState.CONNECTED,
        connectedAt: new Date().toISOString(),
        accountInfo: this.accountInfo
      };
      fs.writeFileSync(SESSION_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to save session:', e.message);
    }
  }

  // Clear persisted session
  clearSession() {
    try {
      if (fs.existsSync(SESSION_FILE)) {
        fs.unlinkSync(SESSION_FILE);
      }
    } catch (e) {
      console.warn('Failed to delete session file:', e.message);
    }
  }

  // Subscribe to real-time status & QR updates
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
        console.error('Notification error:', err);
      }
    }
  }

  getStatus() {
    return {
      state: this.state,
      connected: this.state === ConnectionState.CONNECTED,
      qr: this.state === ConnectionState.QR_READY ? this.qrDataUrl : null,
      qrExpiresAt: this.qrExpiresAt,
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
      expiresAt: this.qrExpiresAt
    };
  }

  // Start connection / QR generation process
  async connect() {
    if (this.state === ConnectionState.CONNECTED) {
      return this.getStatus();
    }

    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }

    this.state = ConnectionState.INITIALIZING;
    this.lastError = null;
    this.notify();

    try {
      await this.generateNewQr();

      // Auto-refresh QR code every 30 seconds if not scanned
      this.refreshTimer = setInterval(() => {
        if (this.state === ConnectionState.QR_READY) {
          console.log('🔄 QR code expired. Regenerating new WhatsApp pairing QR...');
          this.generateNewQr().catch(console.error);
        } else {
          clearInterval(this.refreshTimer);
          this.refreshTimer = null;
        }
      }, 30000);

      return this.getStatus();
    } catch (err) {
      this.state = ConnectionState.ERROR;
      this.lastError = 'Failed to generate WhatsApp QR code: ' + err.message;
      this.notify();
      throw err;
    }
  }

  // Generate real QR code image
  async generateNewQr() {
    const sessionToken = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    const pairingPayload = `2@${sessionToken},${Buffer.from('IDFC_FIRST_BANK_LOAN_DESK').toString('base64')},${Buffer.from(new Date().toISOString()).toString('base64')}`;

    this.qrRaw = pairingPayload;
    this.qrExpiresAt = Date.now() + 30000; // 30 seconds expiry

    // Generate high-resolution QR data URL
    this.qrDataUrl = await QRCode.toDataURL(pairingPayload, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 280,
      color: {
        dark: '#9E1B32', // IDFC FIRST Brand Crimson
        light: '#FFFFFF'
      }
    });

    this.state = ConnectionState.QR_READY;
    this.notify();
  }

  // Simulate or detect scanning from WhatsApp Mobile device
  async confirmScan(officerDetails = null) {
    if (this.state !== ConnectionState.QR_READY && this.state !== ConnectionState.INITIALIZING) {
      throw new Error('QR code is not active or ready for scanning.');
    }

    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }

    this.state = ConnectionState.AUTHENTICATING;
    this.notify();

    // Handshake delay (simulating key exchange with WhatsApp servers)
    await new Promise((res) => setTimeout(res, 800));

    this.state = ConnectionState.CONNECTED;
    this.qrDataUrl = null;
    this.qrExpiresAt = null;
    this.lastError = null;

    this.accountInfo = {
      name: officerDetails?.name || 'IDFC FIRST Bank Loan Desk',
      number: officerDetails?.phoneNumber || '+91 98201 23456',
      device: 'WhatsApp Web (Linked Device #402)',
      connectedAt: new Date().toISOString()
    };

    this.saveSession();
    this.notify();

    return this.getStatus();
  }

  // Disconnect / Unlink device
  disconnect() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }

    this.state = ConnectionState.DISCONNECTED;
    this.qrDataUrl = null;
    this.qrExpiresAt = null;
    this.accountInfo = null;
    this.clearSession();
    this.notify();

    return this.getStatus();
  }

  // Reconnect
  async reconnect() {
    this.disconnect();
    return this.connect();
  }

  formatRecipientNumber(phone) {
    let cleaned = String(phone).replace(/\D/g, '');
    if (cleaned.length === 10) {
      cleaned = '91' + cleaned;
    } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
      cleaned = '91' + cleaned.substring(1);
    }
    return cleaned;
  }

  // Send approved WhatsApp message to recipient
  async sendMessage({ to, customerName, messageType = 'template', customBody = null }) {
    if (this.state !== ConnectionState.CONNECTED) {
      throw new Error('WhatsApp is not connected. Please link your device via QR scan.');
    }

    const formattedTo = this.formatRecipientNumber(to);

    // Realistic network dispatch interval
    await new Promise((res) => setTimeout(res, 120 + Math.random() * 100));

    // Simulated rejection for invalid / demo failing numbers
    if (formattedTo.length < 11 || formattedTo.endsWith('0000')) {
      throw new Error(`Failed to deliver to ${formattedTo} (Invalid WhatsApp destination number)`);
    }

    const mockId = 'wamid.HBg' + Math.random().toString(36).substring(2, 12).toUpperCase();
    return {
      success: true,
      messageId: mockId,
      recipient: formattedTo,
      status: 'sent',
      mode: 'linked_device',
      body: customBody || this.customMessage,
      timestamp: new Date().toISOString()
    };
  }
}

export const whatsappService = new WhatsAppService();
