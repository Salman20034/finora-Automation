/**
 * FINORA AUTOMATION - Local Playwright Browser Automation Guide & Standalone Bridge Script
 * 
 * This service provides instructions and a standalone Node.js Playwright script
 * that users can run locally on their desktop computer to automate WhatsApp Web image attachments
 * using their real logged-in Google Chrome / Chromium browser session.
 */

export interface LocalBridgeConfig {
  bridgePort: number;
  userDataDir: string;
  executablePath?: string;
  useInstalledChrome: boolean;
}

export const defaultBridgeConfig: LocalBridgeConfig = {
  bridgePort: 3001,
  userDataDir: './whatsapp_chrome_profile',
  useInstalledChrome: true,
};

/**
 * Standalone Node.js script string that users can save as `finora-bridge.js` or `finora-bridge.ts`
 * and run locally using: `npx tsx finora-bridge.ts` or `node finora-bridge.js`
 */
export const standaloneBridgeScript = `
/**
 * FINORA AUTOMATION — Standalone Playwright WhatsApp Web Local Bridge
 * Run with: npx tsx finora-bridge.ts
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const PORT = 3001;
const PROFILE_DIR = path.resolve(process.cwd(), 'whatsapp_chrome_profile');
const TEMP_DIR = path.resolve(process.cwd(), 'temp_finora_images');

if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

let context = null;
let page = null;

async function initBrowser() {
  if (context && page && !page.isClosed()) return;
  console.log('[FINORA Bridge] Launching persistent Chrome profile from:', PROFILE_DIR);
  
  context = await chromium.launchPersistentContext(PROFILE_DIR, {
    channel: 'chrome', // Uses real Google Chrome if installed
    headless: false,   // Launches visible browser window so user can interact/scan QR
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    viewport: { width: 1280, height: 900 }
  });

  const pages = context.pages();
  page = pages.length > 0 ? pages[0] : await context.newPage();
  
  if (!page.url().includes('web.whatsapp.com')) {
    await page.goto('https://web.whatsapp.com');
  }
}

const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  if (req.url === '/status' && req.method === 'GET') {
    try {
      await initBrowser();
      const isLoggedIn = await page.evaluate(() => {
        return !!(document.querySelector('#pane-side') || document.querySelector('span[data-icon="chat"]'));
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ isConnected: isLoggedIn, profileDir: PROFILE_DIR }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ isConnected: false, error: err.message }));
    }
  }

  if (req.url === '/send-report' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { salespersonName, phone, imageDataUrl, mode } = JSON.parse(body);
        await initBrowser();

        const cleanPhone = String(phone).replace(/\\D/g, '');
        const tempPath = path.join(TEMP_DIR, \`FINORA_\${salespersonName.replace(/[^\\w\\-]+/g, '_')}_\${Date.now()}.png\`);
        const base64Data = imageDataUrl.replace(/^data:image\\/\\w+;base64,/, '');
        fs.writeFileSync(tempPath, Buffer.from(base64Data, 'base64'));

        console.log(\`[FINORA Bridge] Navigating to WhatsApp chat for \${salespersonName} (+\${cleanPhone})\`);
        await page.goto(\`https://web.whatsapp.com/send?phone=\${cleanPhone}\`);
        await page.waitForTimeout(4000);

        // Upload attachment file
        const fileInput = page.locator('input[type="file"]').first();
        if (await fileInput.count() === 0) {
          const attachBtn = page.locator('span[data-icon="plus"], span[data-icon="attach-menu-plus"]').first();
          if (await attachBtn.isVisible()) await attachBtn.click();
        }

        await page.locator('input[type="file"]').first().setInputFiles(tempPath);
        await page.waitForTimeout(3000);

        if (mode === 'automated_send') {
          const sendBtn = page.locator('span[data-icon="send"], div[aria-label="Send"]').first();
          if (await sendBtn.isVisible()) {
            await sendBtn.click();
          } else {
            await page.keyboard.press('Enter');
          }
          await page.waitForTimeout(3000);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: true, status: 'sent' }));
        } else {
          // Mode A: Attach and Review
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: true, status: 'image_attached' }));
        }
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(PORT, () => {
  console.log(\`==================================================\`);
  console.log(\`FINORA AUTOMATION — Local Playwright Bridge Ready!\`);
  console.log(\`Listening on: http://localhost:\${PORT}\`);
  console.log(\`==================================================\`);
});
`;

export const checkLocalBridgeStatus = async (port: number = 3001) => {
  try {
    const res = await fetch(`http://localhost:${port}/status`);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    // Local bridge offline
  }
  return { isConnected: false, offline: true };
};

export const sendViaLocalBridge = async (
  params: {
    salespersonName: string;
    phone: string;
    imageDataUrl: string;
    mode: 'attach_and_review' | 'automated_send';
  },
  port: number = 3001
) => {
  const res = await fetch(`http://localhost:${port}/send-report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return await res.json();
};
