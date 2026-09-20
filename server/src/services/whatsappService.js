import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

class WhatsAppService {
  constructor() {
    this.config = {
      isDemoMode: process.env.DEMO_MODE !== 'false',
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
      wabaId: process.env.WHATSAPP_WABA_ID || '',
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
      templateName: process.env.WHATSAPP_TEMPLATE_NAME || 'idfc_loan_prequalified',
      languageCode: process.env.WHATSAPP_LANGUAGE_CODE || 'en',
      customMessage: 'You are pre-qualified for an IDFC FIRST Bank loan. If you’re interested, please contact me.'
    };
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    return this.getStatus();
  }

  async getStatus() {
    if (this.config.isDemoMode) {
      return {
        connected: true,
        isDemoMode: true,
        accountName: 'IDFC FIRST Bank Loan Outreach (Demo Sandbox)',
        phoneNumber: '+91 98765 00000',
        qualityRating: 'GREEN',
        status: 'Connected (Demo Mode Active)',
        templateName: this.config.templateName,
        customMessage: this.config.customMessage
      };
    }

    if (!this.config.phoneNumberId || !this.config.accessToken) {
      return {
        connected: false,
        isDemoMode: false,
        status: 'Missing Phone Number ID or Access Token in Environment / Settings',
        customMessage: this.config.customMessage
      };
    }

    try {
      // Test credentials with Meta Graph API
      const response = await axios.get(
        `https://graph.facebook.com/v19.0/${this.config.phoneNumberId}`,
        {
          headers: {
            Authorization: `Bearer ${this.config.accessToken}`
          },
          params: {
            fields: 'verified_name,display_phone_number,quality_rating,code_verification_status'
          },
          timeout: 8000
        }
      );

      return {
        connected: true,
        isDemoMode: false,
        accountName: response.data.verified_name || 'IDFC FIRST Official Business Account',
        phoneNumber: response.data.display_phone_number || 'Connected Number',
        qualityRating: response.data.quality_rating || 'GREEN',
        status: 'Official WhatsApp Cloud API Connected ✓',
        templateName: this.config.templateName,
        customMessage: this.config.customMessage
      };
    } catch (error) {
      const errMsg = error.response?.data?.error?.message || error.message || 'Connection failed';
      return {
        connected: false,
        isDemoMode: false,
        status: `API Error: ${errMsg}`,
        errorDetails: error.response?.data?.error,
        customMessage: this.config.customMessage
      };
    }
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

  async sendMessage({ to, customerName, messageType = 'template', customBody = null }) {
    const formattedTo = this.formatRecipientNumber(to);

    // DEMO MODE DISPATCH
    if (this.config.isDemoMode) {
      // Realistic mock delay
      await new Promise((res) => setTimeout(res, 120 + Math.random() * 100));

      if (formattedTo.length < 11 || formattedTo.endsWith('0000')) {
        throw new Error(`Demo Simulation: Failed to deliver to ${formattedTo} (Simulated WhatsApp invalid recipient)`);
      }

      const mockId = 'wamid.HBg' + Math.random().toString(36).substring(2, 12).toUpperCase();
      return {
        success: true,
        messageId: mockId,
        recipient: formattedTo,
        status: 'sent',
        mode: 'demo',
        timestamp: new Date().toISOString()
      };
    }

    // OFFICIAL META WHATSAPP CLOUD API DISPATCH
    if (!this.config.phoneNumberId || !this.config.accessToken) {
      throw new Error('Official WhatsApp API credentials are not configured');
    }

    const url = `https://graph.facebook.com/v19.0/${this.config.phoneNumberId}/messages`;
    let payload;

    if (messageType === 'template') {
      payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedTo,
        type: 'template',
        template: {
          name: this.config.templateName || 'idfc_loan_prequalified',
          language: {
            code: this.config.languageCode || 'en'
          }
        }
      };

      if (customerName) {
        payload.template.components = [
          {
            type: 'body',
            parameters: [
              {
                type: 'text',
                text: customerName
              }
            ]
          }
        ];
      }
    } else {
      payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedTo,
        type: 'text',
        text: {
          preview_url: false,
          body: customBody || this.config.customMessage
        }
      };
    }

    try {
      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      const messageId = response.data?.messages?.[0]?.id || 'WAMID-UNKNOWN';
      return {
        success: true,
        messageId,
        recipient: formattedTo,
        status: 'sent',
        mode: 'official',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const metaError = error.response?.data?.error;
      const errorMsg = metaError?.message || error.message || 'WhatsApp Cloud API request failed';
      const errorObj = new Error(errorMsg);
      errorObj.details = metaError;
      throw errorObj;
    }
  }
}

export const whatsappService = new WhatsAppService();
