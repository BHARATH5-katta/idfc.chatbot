import express from 'express';
import cors from 'cors';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { whatsappService } from './services/whatsappService.js';
import { campaignQueue } from './services/campaignQueue.js';
import { parseCustomerFile, sanitizePhoneNumber, maskPhoneNumber } from './services/fileParser.js';

process.on('unhandledRejection', (reason) => {
  console.warn('⚠️ Server unhandledRejection caught:', reason?.message || reason);
});

process.on('uncaughtException', (err) => {
  console.warn('⚠️ Server uncaughtException caught:', err?.message || err);
});

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// In-memory upload storage for Excel/CSV parsing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// SSE Client Connections registry
const sseClients = new Set();

// Broadcast to all connected SSE clients
campaignQueue.subscribe((state) => {
  const data = `data: ${JSON.stringify(state)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(data);
    } catch (e) {
      sseClients.delete(client);
    }
  }
});

// SSE endpoint for real-time campaign updates
app.get('/api/campaign/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send initial state immediately
  res.write(`data: ${JSON.stringify(campaignQueue.getState())}\n\n`);

  sseClients.add(res);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

import whatsappRouter from './routes/whatsapp.js';

app.use('/api/whatsapp', whatsappRouter);

// Send Test Message (Mandatory Pre-requisite for Starting Campaign)
app.post('/api/whatsapp/test-message', async (req, res) => {
  try {
    const { testPhoneNumber, testName = 'Authorized Test Recipient' } = req.body;

    if (!testPhoneNumber) {
      return res.status(400).json({ error: 'Please enter a test phone number.' });
    }

    const { valid, phone, reason } = sanitizePhoneNumber(testPhoneNumber);
    if (!valid) {
      return res.status(400).json({ error: `Invalid test phone number: ${reason}` });
    }

    const sendResult = await whatsappService.sendMessage({
      to: phone,
      customerName: testName,
      messageType: 'template'
    });

    campaignQueue.setTestVerified(true);
    campaignQueue.addLog('success', `Test message delivered successfully to ${maskPhoneNumber(phone)}.`);

    res.json({
      success: true,
      result: sendResult,
      maskedPhone: maskPhoneNumber(phone),
      message: 'Test message verified! You can now start the campaign.'
    });
  } catch (err) {
    campaignQueue.setTestVerified(false);
    campaignQueue.addLog('error', `Test message failed: ${err.message}`);
    res.status(400).json({ error: err.message || 'Failed to dispatch test message' });
  }
});

// Upload and Parse Customer File (Excel or CSV)
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Please upload a .xlsx, .xls, or .csv file.' });
    }

    const parsed = parseCustomerFile(req.file.buffer, req.file.originalname);
    
    // Load into campaign queue
    campaignQueue.loadCustomers(parsed.customers);

    res.json({
      success: true,
      filename: parsed.filename,
      totalRows: parsed.totalRows,
      validRecipients: parsed.validCount,
      invalidRowsCount: parsed.invalidCount,
      duplicatesCount: parsed.duplicatesCount,
      sampleCustomers: parsed.customers.slice(0, 5),
      invalidSample: parsed.invalidRows,
      approvedMessage: whatsappService.config.customMessage
    });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Error processing customer file' });
  }
});

// Load Pre-populated Pre-Qualified Sample Data
app.post('/api/sample-data', (req, res) => {
  try {
    const sampleNames = [
      'Rahul Sharma', 'Priya Patel', 'Arun Kumar', 'Sneha Iyer', 'Vikram Malhotra',
      'Ananya Sen', 'Rohan Gupta', 'Deepika Verma', 'Amitabh Deshmukh', 'Kavita Reddy',
      'Sanjay Joshi', 'Meera Nair', 'Alok Mehta', 'Pooja Choudhury', 'Karthik Raja',
      'Sunita Agarwal', 'Manish Bansal', 'Ritu Saxena', 'Harish Chandra', 'Neha Singhal',
      'Abhishek Roy', 'Divya Menon', 'Rajesh Kulkarni', 'Swati Bhat', 'Gaurav Khanna'
    ];

    const sampleCustomers = sampleNames.map((name, i) => {
      const mockPhone = `9198${(10000000 + i * 38291).toString().substring(0, 8)}`;
      return {
        id: `sample_${i + 1}`,
        name,
        phone: mockPhone,
        maskedPhone: maskPhoneNumber(mockPhone),
        status: 'pending',
        prequalified: true,
        bank: 'IDFC FIRST Bank',
        sentAt: null,
        messageId: null,
        error: null
      };
    });

    campaignQueue.loadCustomers(sampleCustomers);

    res.json({
      success: true,
      validRecipients: sampleCustomers.length,
      sampleCustomers: sampleCustomers.slice(0, 5),
      approvedMessage: whatsappService.config.customMessage
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Downloadable Sample Excel Generator
app.get('/api/download-sample', (req, res) => {
  const sampleData = [
    { 'Customer Name': 'Rahul Sharma', 'Phone Number': '9820123456' },
    { 'Customer Name': 'Priya Patel', 'Phone Number': '9892345678' },
    { 'Customer Name': 'Arun Kumar', 'Phone Number': '9819876543' },
    { 'Customer Name': 'Sneha Iyer', 'Phone Number': '9876543210' },
    { 'Customer Name': 'Vikram Malhotra', 'Phone Number': '9988776655' },
    { 'Customer Name': 'Ananya Sen', 'Phone Number': '9845012345' },
    { 'Customer Name': 'Rohan Gupta', 'Phone Number': '9711223344' },
    { 'Customer Name': 'Deepika Verma', 'Phone Number': '9823456789' }
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Prequalified_Customers');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=IDFC_Prequalified_Loan_Customers_Sample.xlsx');
  res.send(buffer);
});

// Campaign Controls
app.post('/api/campaign/start', (req, res) => {
  try {
    const { authorizationConfirmed } = req.body;
    if (!authorizationConfirmed) {
      return res.status(403).json({ error: 'User authorization required. Please confirm you are authorized to contact these pre-qualified customers.' });
    }

    const state = campaignQueue.start();
    res.json({ success: true, state });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/campaign/pause', (req, res) => {
  const state = campaignQueue.pause();
  res.json({ success: true, state });
});

app.post('/api/campaign/resume', (req, res) => {
  const state = campaignQueue.resume();
  res.json({ success: true, state });
});

app.post('/api/campaign/stop', (req, res) => {
  const state = campaignQueue.stop();
  res.json({ success: true, state });
});

app.post('/api/campaign/throttle', (req, res) => {
  const { delayMs } = req.body;
  if (delayMs) {
    campaignQueue.setDelay(delayMs);
  }
  res.json({ success: true, state: campaignQueue.getState() });
});

app.get('/api/campaign/status', (req, res) => {
  res.json(campaignQueue.getState());
});

// Only listen when executed directly, not when imported as a Vercel serverless function
const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith('server.js') || 
  process.argv[1].endsWith('server')
);

if (isDirectRun && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 IDFC WhatsApp Campaign Server running on http://localhost:${PORT}`);
  });
}

export default app;

