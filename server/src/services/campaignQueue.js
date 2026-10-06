import { whatsappService } from './whatsappService.js';
import { sanitizePhoneNumber, maskPhoneNumber } from './fileParser.js';

// Auto-reply templates strictly compliant with IDFC FIRST Bank guidelines
export const AUTO_REPLIES = {
  INTERESTED: 'Thank you for your interest. I can help you with the next steps. Please let me know if you would like more details.',
  NOT_INTERESTED: "Thank you for letting me know. We won't send further messages about this offer.",
  HUMAN_FOLLOWUP: 'Thank you for your message. A loan officer will review your question and get back to you shortly.'
};

/**
 * Classify customer intent from interactive buttons, poll votes, or text replies
 */
export function classifyCustomerIntent(rawText, msgType) {
  const text = (rawText || '').trim().toLowerCase();
  const isInteractive = msgType === 'buttons_response' || msgType === 'poll' || msgType === 'button';

  // 1. Direct interactive button/poll selections
  if (text.includes('interested') && !text.includes('not interested') && !text.includes('not_interested')) {
    return { intent: 'INTERESTED', isInteractive };
  }
  if (text.includes('not interested') || text.includes('not_interested') || text.includes('❌')) {
    return { intent: 'NOT_INTERESTED', isInteractive };
  }

  // 2. Positive natural language text replies
  const positiveKeywords = [
    'yes', 'interested', 'send details', 'more details', 'y', 'haan', 'yeah', 'yep',
    'pls share', 'please share', 'info', 'loan details', 'share details', 'tell me more',
    'ok', 'okay', 'interested please', '1', '1️⃣'
  ];
  if (positiveKeywords.some(kw => text === kw || text.startsWith(kw + ' ') || text.endsWith(' ' + kw))) {
    return { intent: 'INTERESTED', isInteractive: false };
  }

  // 3. Negative natural language text replies / opt-outs
  const negativeKeywords = [
    'no', 'not interested', 'stop', 'dont send', "don't send", 'cancel',
    'n', 'nah', 'nahi', 'optout', 'opt out', 'unsubscribe', 'remove me',
    'no thanks', 'not now', '2', '2️⃣'
  ];
  if (negativeKeywords.some(kw => text === kw || text.startsWith(kw + ' ') || text.endsWith(' ' + kw))) {
    return { intent: 'NOT_INTERESTED', isInteractive: false };
  }

  // 4. Complex question or unrecognized inquiry -> mark for Human Follow-up
  return { intent: 'HUMAN_FOLLOWUP', isInteractive: false };
}

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
    this.customMessage = null;
    this.campaignStats = {
      total: 0,
      sent: 0,
      delivered: 0,
      failed: 0,
      remaining: 0,
      startTime: null,
      endTime: null,
      interested: 0,
      notInterested: 0,
      humanFollowup: 0,
      noResponse: 0
    };
    this.logs = [];
    this.testNumberTested = false;

    // Connect to whatsappService incoming response stream
    whatsappService.onCustomerResponse(async (payload) => {
      await this.handleCustomerResponse(payload);
    });
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

  setCustomMessage(msg) {
    if (msg) this.customMessage = msg;
  }

  loadCustomers(customerList, customMessage = null) {
    if (this.status === 'running') {
      this.stop();
    }

    this.campaignId = this.generateCampaignId();
    this.sentRecipients.clear();
    if (customMessage) this.customMessage = customMessage;

    this.customers = (customerList || []).map((c, i) => {
      const raw = c.phone || c.mobile || '';
      const { valid, phone: sPhone } = sanitizePhoneNumber(raw);
      const finalPhone = valid ? sPhone : String(raw).replace(/\D/g, '');

      return {
        id: c.id || `cust_${i + 1}`,
        name: c.name || `Customer #${i + 1}`,
        phone: finalPhone,
        maskedPhone: c.maskedPhone || maskPhoneNumber(finalPhone),
        prequalified: c.prequalified !== false,
        status: 'pending',
        response: 'NO_RESPONSE', // 'NO_RESPONSE' | 'INTERESTED' | 'NOT_INTERESTED' | 'HUMAN_FOLLOWUP'
        responseType: null,
        respondedAt: null,
        optedOut: false,
        conversationHistory: [],
        error: null,
        sentAt: null,
        messageId: null
      };
    });

    this.currentIndex = 0;
    this.status = 'ready';
    this.updateStats();
    this.logs = [];
    this.addLog('info', `Campaign [${this.campaignId}]: Loaded ${this.customers.length} pre-qualified customers into queue.`);
    this.notify();
  }

  updateStats() {
    let sent = 0;
    let delivered = 0;
    let failed = 0;
    let remaining = 0;
    let interested = 0;
    let notInterested = 0;
    let humanFollowup = 0;
    let noResponse = 0;

    for (const c of this.customers) {
      if (c.status === 'sent') sent++;
      else if (c.status === 'delivered') { sent++; delivered++; }
      else if (c.status === 'failed') failed++;
      else if (c.status === 'pending' || c.status === 'sending') remaining++;

      if (c.response === 'INTERESTED') interested++;
      else if (c.response === 'NOT_INTERESTED') notInterested++;
      else if (c.response === 'HUMAN_FOLLOWUP') humanFollowup++;
      else noResponse++;
    }

    this.campaignStats.total = this.customers.length;
    this.campaignStats.sent = sent;
    this.campaignStats.delivered = delivered;
    this.campaignStats.failed = failed;
    this.campaignStats.remaining = remaining;
    this.campaignStats.interested = interested;
    this.campaignStats.notInterested = notInterested;
    this.campaignStats.humanFollowup = humanFollowup;
    this.campaignStats.noResponse = noResponse;
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
      endTime: null,
      interested: 0,
      notInterested: 0,
      humanFollowup: 0,
      noResponse: 0
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

    // OPT-OUT PROTECTION: If customer has previously opted out, never send promotional outreach
    if (currentCustomer.optedOut) {
      currentCustomer.status = 'failed';
      currentCustomer.error = 'Customer has opted out of promotional communications.';
      this.addLog('warning', `Skipped opted-out customer ${currentCustomer.name} (${currentCustomer.maskedPhone}).`);
      this.currentIndex++;
      this.updateStats();
      this.notify();
      if (this.status === 'running') {
        this.timer = setTimeout(() => this.processNext(), 50);
      }
      return;
    }

    // DUPLICATE PROTECTION: Check if recipient was already dispatched in this campaign
    if (this.sentRecipients.has(currentCustomer.phone)) {
      currentCustomer.status = 'failed';
      currentCustomer.error = 'Duplicate protection: Recipient already received campaign message';
      this.addLog('warning', `Skipped duplicate recipient ${currentCustomer.name} (${currentCustomer.maskedPhone}).`);
      this.currentIndex++;
      this.updateStats();
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
      // Dispatch real WhatsApp interactive message with ✅ Interested / ❌ Not Interested choices
      const result = await whatsappService.sendInteractiveLoanMessage({
        to: currentCustomer.phone,
        customerName: currentCustomer.name,
        isPrequalified: currentCustomer.prequalified !== false
      });

      // Record successful send
      this.sentRecipients.add(currentCustomer.phone);
      currentCustomer.status = 'sent';
      currentCustomer.sentAt = new Date().toISOString();
      currentCustomer.messageId = result.messageId;

      // Add to conversation history
      currentCustomer.conversationHistory.push({
        id: `msg_out_${Date.now()}`,
        direction: 'out',
        text: result.initialText || 'You are pre-qualified for an IDFC FIRST Bank loan. If you’re interested, please contact me.',
        options: ['✅ Interested', '❌ Not Interested'],
        type: 'initial_offer',
        timestamp: new Date().toISOString()
      });

      this.addLog('sent', `[${this.currentIndex + 1}/${this.customers.length}] Sent interactive offer to ${currentCustomer.name} (${currentCustomer.maskedPhone})`);

      // Mark delivered status
      const customerRef = currentCustomer;
      setTimeout(() => {
        if (customerRef.status === 'sent') {
          customerRef.status = 'delivered';
          this.updateStats();
          this.notify();
        }
      }, 600);

    } catch (err) {
      currentCustomer.status = 'failed';
      currentCustomer.error = err.message || 'WhatsApp sending error';
      this.addLog('error', `Failed sending to ${currentCustomer.name} (${currentCustomer.maskedPhone}): ${err.message}`);
    }

    this.currentIndex++;
    this.updateStats();
    this.notify();

    // Schedule next message with throttle
    if (this.status === 'running') {
      const delay = this.delayMs || 1500;
      this.timer = setTimeout(() => this.processNext(), delay);
    }
  }

  /**
   * Handle incoming customer response from WhatsApp (button tap, poll vote, or text)
   * Ensures STRICT per-customer memory isolation!
   */
  async handleCustomerResponse({ phone, text, msgType = 'chat', rawMessage = null }) {
    if (!phone || !text) return;

    const cleanIncomingPhone = String(phone).replace(/\D/g, '');

    // Find customer in loaded list
    let customer = this.customers.find(c => {
      const cPhone = String(c.phone || '').replace(/\D/g, '');
      return cPhone === cleanIncomingPhone || cPhone.endsWith(cleanIncomingPhone) || cleanIncomingPhone.endsWith(cPhone);
    });

    // If customer not in list (e.g. ad-hoc inbound or test recipient), create an isolated customer record
    if (!customer) {
      customer = {
        id: `inbound_${Date.now()}`,
        name: `Customer (${maskPhoneNumber(cleanIncomingPhone)})`,
        phone: cleanIncomingPhone,
        maskedPhone: maskPhoneNumber(cleanIncomingPhone),
        prequalified: true,
        status: 'sent',
        response: 'NO_RESPONSE',
        responseType: null,
        respondedAt: null,
        optedOut: false,
        conversationHistory: [],
        error: null,
        sentAt: new Date().toISOString(),
        messageId: `inbound_init_${Date.now()}`
      };
      this.customers.unshift(customer);
    }

    // 1. Classify customer intent
    const { intent, isInteractive } = classifyCustomerIntent(text, msgType);

    console.log(`[Campaign] Customer ${customer.name} (${customer.maskedPhone}) classified as: ${intent} (isInteractive: ${isInteractive})`);

    // 2. Store response strictly per customer
    customer.response = intent;
    customer.responseType = isInteractive ? 'button' : 'text';
    customer.respondedAt = new Date().toISOString();

    // If customer selected "Not Interested", respect opt-out and stop promotional follow-ups
    if (intent === 'NOT_INTERESTED') {
      customer.optedOut = true;
    }

    // 3. Append customer's incoming message to their isolated history
    customer.conversationHistory.push({
      id: `msg_in_${Date.now()}`,
      direction: 'in',
      text: text,
      type: isInteractive ? 'button_reply' : 'text_reply',
      timestamp: new Date().toISOString()
    });

    // 4. Select appropriate professional automated reply
    let replyText = AUTO_REPLIES.HUMAN_FOLLOWUP;
    if (intent === 'INTERESTED') {
      replyText = AUTO_REPLIES.INTERESTED;
    } else if (intent === 'NOT_INTERESTED') {
      replyText = AUTO_REPLIES.NOT_INTERESTED;
    }

    // 5. Dispatch automatic reply via WhatsApp
    try {
      console.log(`[WhatsApp] Sending auto-reply to ${customer.maskedPhone}: "${replyText}"`);
      await whatsappService.sendMessage({
        to: customer.phone,
        customerName: customer.name,
        customMessage: replyText
      });

      // 6. Record auto-reply in customer history
      customer.conversationHistory.push({
        id: `msg_out_reply_${Date.now()}`,
        direction: 'out',
        text: replyText,
        type: 'auto_reply',
        timestamp: new Date().toISOString()
      });
    } catch (sendErr) {
      console.warn(`[WhatsApp] Warning sending auto-reply to ${customer.maskedPhone}:`, sendErr.message);
    }

    // 7. Update stats and broadcast to frontend
    this.updateStats();

    const badgeLabel = intent === 'INTERESTED'
      ? '🟢 Interested'
      : intent === 'NOT_INTERESTED'
      ? '⚪ Not Interested'
      : '🟡 Human Follow-up Required';

    this.addLog('response', `Customer ${customer.name} responded: ${badgeLabel} (${isInteractive ? 'Button' : 'Text: "' + text + '"'})`);
    this.notify();

    return {
      success: true,
      customer,
      intent,
      autoReplySent: replyText
    };
  }

  /**
   * Test Mode simulation helper
   */
  async simulateCustomerReply({ phone, text, isInteractive = true }) {
    return this.handleCustomerResponse({
      phone,
      text,
      msgType: isInteractive ? 'button' : 'chat'
    });
  }

  getCustomerHistory(phone) {
    const clean = String(phone || '').replace(/\D/g, '');
    const customer = this.customers.find(c => {
      const cPhone = String(c.phone || '').replace(/\D/g, '');
      return cPhone === clean || cPhone.endsWith(clean) || clean.endsWith(cPhone);
    });
    return customer ? customer.conversationHistory : [];
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
    return {
      campaignId: this.campaignId,
      status: this.status,
      stats: { ...this.campaignStats },
      currentIndex: this.currentIndex,
      delayMs: this.delayMs,
      testVerified: this.testNumberTested,
      customers: this.customers,
      logs: this.logs.slice(0, 50),
      isCompleted: this.status === 'completed',
      isPaused: this.status === 'paused',
      isRunning: this.status === 'running'
    };
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    const state = this.getState();
    for (const listener of this.listeners) {
      try {
        listener(state);
      } catch (err) {
        console.error('Error notifying campaign listener:', err);
      }
    }
  }
}

export const campaignQueue = new CampaignQueue();
