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

// SSE endpoint for real-time WhatsApp QR & Connection status
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
    res.status(500).json({ error: err.message });
  }
});

// GET /api/whatsapp/qr
router.get('/qr', (req, res) => {
  try {
    const qrData = whatsappService.getQr();
    res.json(qrData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/whatsapp/connect
router.post('/connect', async (req, res) => {
  try {
    const status = await whatsappService.connect();
    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/whatsapp/disconnect
router.post('/disconnect', async (req, res) => {
  try {
    const status = await whatsappService.disconnect();
    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/whatsapp/refresh-qr & POST /api/whatsapp/reconnect
router.post('/refresh-qr', async (req, res) => {
  try {
    const status = await whatsappService.refreshQr();
    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/reconnect', async (req, res) => {
  try {
    const status = await whatsappService.refreshQr();
    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
