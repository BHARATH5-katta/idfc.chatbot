// Vercel Serverless Function: Lightweight Forwarder & Status Gateway
// The persistent WhatsApp Web client runs on an external persistent Node.js server.
// Do NOT run WhatsApp Web or Puppeteer inside Vercel serverless functions.

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const backendUrl = process.env.WHATSAPP_BACKEND_URL || process.env.VITE_WHATSAPP_BACKEND_URL;

  // If a persistent backend URL is configured, forward the request
  if (backendUrl) {
    try {
      const cleanBackend = backendUrl.replace(/\/+$/, '');
      const targetPath = req.url || '';
      const fullUrl = `${cleanBackend}${targetPath}`;

      const headers = { ...req.headers };
      delete headers.host;
      delete headers.connection;

      const fetchOptions = {
        method: req.method,
        headers
      };

      if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
        fetchOptions.body = typeof req.body === 'object' ? JSON.stringify(req.body) : req.body;
      }

      const backendResponse = await fetch(fullUrl, fetchOptions);
      const contentType = backendResponse.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        const data = await backendResponse.json();
        return res.status(backendResponse.status).json(data);
      } else {
        const text = await backendResponse.text();
        res.setHeader('content-type', contentType);
        return res.status(backendResponse.status).send(text);
      }
    } catch (err) {
      console.error('[Vercel Serverless] Failed to forward to persistent WhatsApp backend:', err.message);
    }
  }

  // Graceful response when persistent backend is not configured or unreachable
  return res.status(200).json({
    state: 'Error',
    connected: false,
    qr: null,
    accountInfo: null,
    error: 'WhatsApp service unavailable. Please start/reconnect the WhatsApp service.',
    message: 'WhatsApp service unavailable. Please start/reconnect the WhatsApp service.',
    hint: 'Configure VITE_WHATSAPP_BACKEND_URL or WHATSAPP_BACKEND_URL pointing to your persistent Node.js backend.'
  });
}
