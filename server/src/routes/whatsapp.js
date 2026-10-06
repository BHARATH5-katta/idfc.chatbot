import { Router } from 'express';
import { whatsappService } from '../services/whatsappService.js';

const router = Router();

// Store active SSE clients for WhatsApp updates
const sseClients = new Set();

// Broadcast WhatsApp state changes in real time
whatsappService.subscribe((status) => {
  const data = `data: ${JSON.stringify(status)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(data);
    } catch {
      sseClients.delete(client);
    }
  }
});

// GET /api/whatsapp/health
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'whatsapp-backend',
    whatsappState: whatsappService.state,
    connected: whatsappService.state === 'CONNECTED'
  });
});

// SSE endpoint for real-time WhatsApp QR & Connection status
// GET /api/whatsapp/stream
router.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send current status immediately
  res.write(`data: ${JSON.stringify(whatsappService.getStatus())}\n\n`);

  sseClients.add(res);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

// GET /api/whatsapp/status
router.get('/status', (req, res) => {
  try {
    const status = whatsappService.getStatus();
    res.json(status);
  } catch (err) {
    console.error('[WhatsApp] Status route error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/whatsapp/qr
router.get('/qr', (req, res) => {
  try {
    const qrData = whatsappService.getQr();
    res.json(qrData);
  } catch (err) {
    console.error('[WhatsApp] QR route error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/whatsapp/connect
router.post('/connect', async (req, res) => {
  console.log('[WhatsApp] API request received: POST /connect');
  try {
    const status = await whatsappService.connect();
    res.json({ success: true, status });
  } catch (err) {
    console.error('[WhatsApp] API connect error:', err.stack || err.message || err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/whatsapp/disconnect
router.post('/disconnect', async (req, res) => {
  console.log('[WhatsApp] API request received: POST /disconnect');
  try {
    const status = await whatsappService.disconnect();
    res.json({ success: true, status });
  } catch (err) {
    console.error('[WhatsApp] API disconnect error:', err.stack || err.message || err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/whatsapp/refresh-qr & POST /api/whatsapp/reconnect
router.post('/refresh-qr', async (req, res) => {
  console.log('[WhatsApp] API request received: POST /refresh-qr');
  try {
    const status = await whatsappService.refreshQr();
    res.json({ success: true, status });
  } catch (err) {
    console.error('[WhatsApp] API refresh-qr error:', err.stack || err.message || err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/reconnect', async (req, res) => {
  console.log('[WhatsApp] API request received: POST /reconnect');
  try {
    const status = await whatsappService.refreshQr();
    res.json({ success: true, status });
  } catch (err) {
    console.error('[WhatsApp] API reconnect error:', err.stack || err.message || err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/whatsapp/send
router.post('/send', async (req, res) => {
  try {
    const { to, message, customerName } = req.body;
    if (!to) {
      return res.status(400).json({ error: 'Recipient phone number is required.' });
    }
    const result = await whatsappService.sendMessage({
      to,
      customerName: customerName || '',
      customMessage: message
    });
    res.json({ success: true, result });
  } catch (err) {
    console.error('[WhatsApp] API send error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
