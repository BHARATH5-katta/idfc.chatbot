import { whatsappService } from './whatsappService.js';

class CampaignQueue {
  constructor() {
    this.campaignId = this.generateCampaignId();
    this.status = 'idle'; // 'idle' | 'ready' | 'running' | 'paused' | 'stopped' | 'completed'
    this.customers = [];
    this.currentIndex = 0;
    this.delayMs = 1500;
    this.timer = null;
    this.listeners = new Set();
    this.sentRecipients = new Set(); // Duplicate protection per campaign
    this.campaignStats = {
      total: 0,
      sent: 0,
      delivered: 0,
      failed: 0,
      remaining: 0,
      startTime: null,
      endTime: null
    };
    this.logs = [];
    this.testNumberTested = false;
  }

  generateCampaignId() {
    const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `CAMP-IDFC-${new Date().getFullYear()}-${rand}`;
  }

  setTestVerified(status) {
    this.testNumberTested = status;
    this.addLog('system', status ? 'Test message verified successfully. Campaign ready.' : 'Test message reset.');
    this.notify();
  }

  isTestVerified() {
    return this.testNumberTested;
  }

  loadCustomers(customerList) {
    if (this.status === 'running') {
      this.stop();
    }

    this.campaignId = this.generateCampaignId();
    this.sentRecipients.clear();

    this.customers = customerList.map(c => ({
      ...c,
      status: 'pending',
      error: null,
      sentAt: null,
      messageId: null
    }));

    this.currentIndex = 0;
    this.status = 'ready';
    this.campaignStats = {
      total: this.customers.length,
      sent: 0,
      delivered: 0,
      failed: 0,
      remaining: this.customers.length,
      startTime: null,
      endTime: null
    };
    this.logs = [];
    this.addLog('info', `Campaign [${this.campaignId}]: Loaded ${this.customers.length} pre-qualified customers into queue.`);
    this.notify();
  }

  setDelay(ms) {
    this.delayMs = Math.max(100, Math.min(ms, 10000));
    this.addLog('info', `Throttle rate set to 1 msg every ${this.delayMs}ms.`);
    this.notify();
  }

  start() {
    if (this.customers.length === 0) {
      throw new Error('No customers loaded. Please upload a customer list first.');
    }

    if (this.status === 'running') {
      return this.getState();
    }

    this.status = 'running';
    if (!this.campaignStats.startTime) {
      this.campaignStats.startTime = new Date().toISOString();
    }

    this.addLog('campaign', `Campaign [${this.campaignId}] started. Dispatching to ${this.campaignStats.remaining} recipients.`);
    this.notify();

    this.processNext();
    return this.getState();
  }

  pause() {
    if (this.status !== 'running') return this.getState();
    this.status = 'paused';
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.addLog('warning', `Campaign paused at record ${this.currentIndex} of ${this.customers.length}.`);
    this.notify();
    return this.getState();
  }

  resume() {
    if (this.status !== 'paused') return this.getState();
    this.status = 'running';
    this.addLog('campaign', `Campaign resumed. Dispatching from record ${this.currentIndex + 1}.`);
    this.notify();
    this.processNext();
    return this.getState();
  }

  stop() {
    this.status = 'stopped';
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.campaignStats.endTime = new Date().toISOString();
    this.addLog('danger', 'Campaign stopped.');
    this.notify();
    return this.getState();
  }

  reset() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.status = 'idle';
    this.customers = [];
    this.currentIndex = 0;
    this.sentRecipients.clear();
    this.campaignStats = {
      total: 0,
      sent: 0,
      delivered: 0,
      failed: 0,
      remaining: 0,
      startTime: null,
      endTime: null
    };
    this.logs = [];
    this.notify();
  }

  async processNext() {
    if (this.status !== 'running') return;

    if (this.currentIndex >= this.customers.length) {
      this.status = 'completed';
      this.campaignStats.endTime = new Date().toISOString();
      this.addLog('success', `Campaign complete! Processed all ${this.customers.length} pre-qualified customers.`);
      this.notify();
      return;
    }

    const currentCustomer = this.customers[this.currentIndex];

    // DUPLICATE PROTECTION: Check if recipient was already dispatched in this campaign
    if (this.sentRecipients.has(currentCustomer.phone)) {
      currentCustomer.status = 'failed';
      currentCustomer.error = 'Duplicate protection: Recipient already received campaign message';
      this.campaignStats.failed++;
      this.campaignStats.remaining--;
      this.addLog('warning', `Skipped duplicate recipient ${currentCustomer.name} (${currentCustomer.maskedPhone}).`);
      this.currentIndex++;
      this.notify();
      if (this.status === 'running') {
        this.timer = setTimeout(() => this.processNext(), 50);
      }
      return;
    }

    // Set recipient status to 'sending' while in flight
    currentCustomer.status = 'sending';
    this.notify();

    try {
      // Dispatch WhatsApp message
      const result = await whatsappService.sendMessage({
        to: currentCustomer.phone,
        customerName: currentCustomer.name,
        messageType: 'template'
      });

      // Record successful send
      this.sentRecipients.add(currentCustomer.phone);
      currentCustomer.status = 'sent';
      currentCustomer.sentAt = new Date().toISOString();
      currentCustomer.messageId = result.messageId;

      this.campaignStats.sent++;
      this.campaignStats.remaining--;

      this.addLog('sent', `[${this.currentIndex + 1}/${this.customers.length}] Sent to ${currentCustomer.name} (${currentCustomer.maskedPhone})`);

      // Delivery simulation in demo mode or via webhook
      const customerRef = currentCustomer;
      setTimeout(() => {
        if (customerRef.status === 'sent') {
          customerRef.status = 'delivered';
          this.campaignStats.delivered++;
          this.notify();
        }
      }, 500 + Math.random() * 800);

    } catch (err) {
      currentCustomer.status = 'failed';
      currentCustomer.error = err.message || 'WhatsApp sending error';
      this.campaignStats.failed++;
      this.campaignStats.remaining--;

      this.addLog('error', `Failed sending to ${currentCustomer.name} (${currentCustomer.maskedPhone}): ${err.message}`);
    }

    this.currentIndex++;
    this.notify();

    // Schedule next message with throttle
    if (this.status === 'running') {
      const delay = whatsappService.config.isDemoMode ? Math.min(this.delayMs, 300) : this.delayMs;
      this.timer = setTimeout(() => this.processNext(), delay);
    }
  }

  addLog(type, text) {
    const logItem = {
      id: Date.now() + Math.random().toString(36).substring(2, 6),
      type,
      text,
      timestamp: new Date().toLocaleTimeString()
    };
    this.logs.unshift(logItem);
    if (this.logs.length > 200) this.logs.pop();
  }

  getState() {
    const progressPercent = this.campaignStats.total > 0
      ? Math.round(((this.campaignStats.sent + this.campaignStats.failed) / this.campaignStats.total) * 100)
      : 0;

    return {
      campaignId: this.campaignId,
      status: this.status,
      currentIndex: this.currentIndex,
      delayMs: this.delayMs,
      testVerified: this.testNumberTested,
      stats: {
        ...this.campaignStats,
        progressPercent
      },
      customers: this.customers.map(c => ({
        id: c.id,
        name: c.name,
        maskedPhone: c.maskedPhone,
        status: c.status,
        sentAt: c.sentAt,
        error: c.error
      })),
      recentLogs: this.logs.slice(0, 50)
    };
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify() {
    const state = this.getState();
    for (const listener of this.listeners) {
      try {
        listener(state);
      } catch (e) {
        console.error('Notification error:', e);
      }
    }
  }
}

export const campaignQueue = new CampaignQueue();
