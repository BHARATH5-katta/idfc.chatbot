import * as XLSX from 'xlsx';

/**
 * Mask phone number for customer privacy:
 * Example: '919876543210' -> '+91 98*** **210'
 */
export function maskPhoneNumber(phone) {
  if (!phone) return 'N/A';
  const cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.length < 10) return '***' + cleaned.slice(-3);
  
  const country = cleaned.length > 10 ? '+' + cleaned.slice(0, cleaned.length - 10) + ' ' : '+91 ';
  const main = cleaned.slice(-10);
  const first2 = main.slice(0, 2);
  const last3 = main.slice(-3);
  return `${country}${first2}*** **${last3}`;
}

/**
 * Normalize and validate phone numbers
 */
export function sanitizePhoneNumber(raw) {
  if (!raw) return { valid: false, phone: null, reason: 'Empty phone number' };
  let cleaned = String(raw).replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }
  
  // Standard Indian 10-digit mobile
  if (cleaned.length === 10) {
    if (/^[6-9]\d{9}$/.test(cleaned)) {
      return { valid: true, phone: '91' + cleaned };
    }
  }
  
  // 11-digit starting with 0
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    const withoutZero = cleaned.substring(1);
    if (/^[6-9]\d{9}$/.test(withoutZero)) {
      return { valid: true, phone: '91' + withoutZero };
    }
  }
  
  // 12-digit starting with 91
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    const mobilePart = cleaned.substring(2);
    if (/^[6-9]\d{9}$/.test(mobilePart)) {
      return { valid: true, phone: cleaned };
    }
  }

  // Generic international (10-15 digits)
  if (cleaned.length >= 10 && cleaned.length <= 15) {
    return { valid: true, phone: cleaned };
  }

  return { valid: false, phone: cleaned, reason: 'Invalid phone format or length' };
}

/**
 * Identify column mappings from header names
 */
function findColumns(row) {
  const keys = Object.keys(row);
  let nameKey = null;
  let phoneKey = null;

  for (const key of keys) {
    const lower = key.toLowerCase().trim().replace(/[-_ ]/g, '');
    if (!nameKey && (lower.includes('name') || lower.includes('customer') || lower.includes('client'))) {
      nameKey = key;
    }
    if (!phoneKey && (lower.includes('phone') || lower.includes('mobile') || lower.includes('contact') || lower.includes('cell') || lower.includes('whatsapp') || lower.includes('number'))) {
      phoneKey = key;
    }
  }

  // Fallback to first two columns if not clearly named
  if (!nameKey && keys.length > 0) nameKey = keys[0];
  if (!phoneKey && keys.length > 1) phoneKey = keys[1];

  return { nameKey, phoneKey };
}

/**
 * Parse Excel, CSV, or JSON buffer
 */
export function parseCustomerFile(buffer, filename) {
  let rawRows = [];

  const lowerFilename = (filename || '').toLowerCase();

  if (lowerFilename.endsWith('.json')) {
    try {
      const parsed = JSON.parse(buffer.toString('utf8'));
      if (Array.isArray(parsed)) {
        rawRows = parsed;
      } else if (parsed && typeof parsed === 'object') {
        // Find first array property
        const arrayKey = Object.keys(parsed).find(k => Array.isArray(parsed[k]));
        if (arrayKey) {
          rawRows = parsed[arrayKey];
        } else {
          rawRows = [parsed];
        }
      }
    } catch (err) {
      throw new Error(`Failed to parse JSON file: ${err.message}`);
    }
  } else {
    // Excel or CSV
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  }

  if (!rawRows || rawRows.length === 0) {
    throw new Error('Uploaded file is empty or contains no readable customer records.');
  }

  const { nameKey, phoneKey } = findColumns(rawRows[0]);
  if (!phoneKey) {
    throw new Error('Could not identify a "Phone Number" or "Mobile" field in the customer data.');
  }

  const seenNumbers = new Set();
  const validCustomers = [];
  const invalidRows = [];
  let duplicatesCount = 0;

  rawRows.forEach((row, idx) => {
    const rawName = row[nameKey] ? String(row[nameKey]).trim() : `Customer #${idx + 1}`;
    const rawPhone = row[phoneKey];

    const { valid, phone, reason } = sanitizePhoneNumber(rawPhone);

    if (!valid) {
      invalidRows.push({
        row: idx + 1,
        name: rawName,
        phone: String(rawPhone || ''),
        reason
      });
      return;
    }

    if (seenNumbers.has(phone)) {
      duplicatesCount++;
      return; // Deduplicate to avoid sending twice
    }

    seenNumbers.add(phone);
    validCustomers.push({
      id: `cust_${idx + 1}_${phone.slice(-4)}`,
      name: rawName,
      phone: phone, // Sanitized E.164 for WhatsApp API
      maskedPhone: maskPhoneNumber(phone), // Masked for user privacy
      status: 'pending', // pending, sending, sent, delivered, failed
      prequalified: true,
      bank: 'IDFC FIRST Bank',
      sentAt: null,
      messageId: null,
      error: null
    });
  });

  return {
    filename,
    totalRows: rawRows.length,
    validCount: validCustomers.length,
    invalidCount: invalidRows.length,
    duplicatesCount,
    nameColumn: nameKey,
    phoneColumn: phoneKey,
    customers: validCustomers,
    invalidRows: invalidRows.slice(0, 10)
  };
}
