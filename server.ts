import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Meta WhatsApp Business Cloud API Sending Route
app.post('/api/whatsapp/send-image', async (req, res) => {
  try {
    const { phoneNumber, imageDataUrl, caption, phoneNumberId, accessToken } = req.body;

    const token = accessToken || process.env.META_WHATSAPP_ACCESS_TOKEN;
    const phoneId = phoneNumberId || process.env.META_WHATSAPP_PHONE_ID;

    if (!token || !phoneId) {
      return res.status(400).json({
        success: false,
        error: 'WhatsApp Business API Phone Number ID or Access Token is missing.',
      });
    }

    // Step 1: Upload media to Meta
    // Convert base64 dataUrl to Buffer
    const base64Data = imageDataUrl.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const formData = new FormData();
    const blob = new Blob([buffer], { type: 'image/png' });
    formData.append('file', blob, 'report.png');
    formData.append('messaging_product', 'whatsapp');
    formData.append('type', 'image/png');

    const mediaUploadRes = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/media`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const mediaData = await mediaUploadRes.json();

    if (!mediaUploadRes.ok || !mediaData.id) {
      return res.status(mediaUploadRes.status).json({
        success: false,
        error: mediaData.error?.message || 'Failed to upload media to Meta Graph API.',
      });
    }

    const mediaId = mediaData.id;

    // Step 2: Send image message
    const messageRes = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phoneNumber,
        type: 'image',
        image: {
          id: mediaId,
          caption: caption || 'Customer Overdue & Credit Risk Report',
        },
      }),
    });

    const messageData = await messageRes.json();

    if (!messageRes.ok || !messageData.messages?.[0]?.id) {
      return res.status(messageRes.status).json({
        success: false,
        error: messageData.error?.message || 'Failed to send image message via Meta Graph API.',
      });
    }

    return res.json({
      success: true,
      messageId: messageData.messages[0].id,
      mediaId,
    });
  } catch (err: any) {
    console.error('API Error sending WhatsApp image:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error processing WhatsApp image sending.',
    });
  }
});

// Meta Webhook verification endpoint
app.get('/api/whatsapp/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const expectedToken = process.env.META_WEBHOOK_VERIFY_TOKEN || 'finora_verify_token';

  if (mode === 'subscribe' && token === expectedToken) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// Meta Webhook message status updates
app.post('/api/whatsapp/webhook', (req, res) => {
  const body = req.body;
  if (body.object === 'whatsapp_business_account') {
    // Process status updates (sent, delivered, read, failed)
    body.entry?.forEach((entry: any) => {
      entry.changes?.forEach((change: any) => {
        if (change.field === 'messages') {
          const statuses = change.value?.statuses;
          if (statuses) {
            statuses.forEach((status: any) => {
              console.log(`[WhatsApp Webhook] Message ID ${status.id} updated to status: ${status.status}`);
            });
          }
        }
      });
    });
    return res.status(200).send('EVENT_RECEIVED');
  }
  return res.sendStatus(404);
});

// Test API connection endpoint
app.post('/api/whatsapp/test-connection', async (req, res) => {
  try {
    const { phoneNumberId, accessToken } = req.body;
    const token = accessToken || process.env.META_WHATSAPP_ACCESS_TOKEN;
    const phoneId = phoneNumberId || process.env.META_WHATSAPP_PHONE_ID;

    if (!token || !phoneId) {
      return res.status(400).json({
        success: false,
        error: 'Phone Number ID and Access Token are required.',
      });
    }

    const testRes = await fetch(`https://graph.facebook.com/v21.0/${phoneId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await testRes.json();

    if (testRes.ok) {
      return res.json({
        success: true,
        displayPhoneNumber: data.display_phone_number,
        verifiedName: data.verified_name,
        qualityRating: data.quality_rating,
      });
    } else {
      return res.status(400).json({
        success: false,
        error: data.error?.message || 'Failed to verify Meta WhatsApp Business Phone ID.',
      });
    }
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Error connecting to Meta API.',
    });
  }
});

// ==========================================
// WhatsApp Web Playwright Automation Routes
// ==========================================
import { whatsappWebBridge } from './src/server/whatsappWebBridge';

app.get('/api/whatsapp-web/status', async (req, res) => {
  try {
    const status = await whatsappWebBridge.getStatus();
    return res.json(status);
  } catch (err: any) {
    return res.status(500).json({ isConnected: false, isQrNeeded: false, error: err.message });
  }
});

app.post('/api/whatsapp-web/connect', async (req, res) => {
  try {
    const status = await whatsappWebBridge.connect();
    return res.json(status);
  } catch (err: any) {
    return res.status(500).json({ isConnected: false, isQrNeeded: false, error: err.message });
  }
});

app.post('/api/whatsapp-web/send-report', async (req, res) => {
  try {
    const { salespersonName, phone, imageDataUrl, mode } = req.body;
    const result = await whatsappWebBridge.sendReport({
      salespersonName,
      phone,
      imageDataUrl,
      mode: mode === 'automated_send' ? 'automated_send' : 'attach_and_review',
    });
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, status: 'failed', error: err.message });
  }
});

app.post('/api/whatsapp-web/disconnect', async (req, res) => {
  try {
    await whatsappWebBridge.disconnect();
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// FINORA AUTOMATION Static Web Serving
app.use(express.static(__dirname));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Vite Middleware integration in Development (fallback)
async function startServer() {
  if (process.env.NODE_ENV === 'vite-dev') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(__dirname));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`FINORA AUTOMATION Server running on http://localhost:${PORT}`);
  });
}

startServer();
