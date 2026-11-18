import fs from 'fs';
import path from 'path';
import { chromium, BrowserContext, Page } from 'playwright';

export interface WhatsAppBridgeStatus {
  isConnected: boolean;
  isQrNeeded: boolean;
  qrDataUrl?: string;
  sessionDir: string;
  lastError?: string;
}

export interface SendReportParams {
  salespersonName: string;
  phone: string;
  imageDataUrl: string;
  mode: 'attach_and_review' | 'automated_send';
}

class WhatsAppWebBridgeService {
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private sessionDir = path.resolve(process.cwd(), 'whatsapp_session');
  private tempDir = path.resolve(process.cwd(), 'temp_reports');
  private isInitializing = false;
  private lastError = '';

  constructor() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  public async getStatus(): Promise<WhatsAppBridgeStatus> {
    if (!this.context || !this.page) {
      return {
        isConnected: false,
        isQrNeeded: false,
        sessionDir: this.sessionDir,
        lastError: this.lastError,
      };
    }

    try {
      if (this.page.isClosed()) {
        return { isConnected: false, isQrNeeded: false, sessionDir: this.sessionDir, lastError: 'Page closed' };
      }

      // Check if logged in (search bar or main chat list pane exists)
      const isLoggedIn = await this.page.evaluate(() => {
        return !!(
          document.querySelector('div[contenteditable="true"][data-tab="3"]') ||
          document.querySelector('#pane-side') ||
          document.querySelector('span[data-icon="chat"]')
        );
      });

      if (isLoggedIn) {
        return { isConnected: true, isQrNeeded: false, sessionDir: this.sessionDir };
      }

      // Check if QR code is visible
      const hasQr = await this.page.evaluate(() => {
        return !!(document.querySelector('canvas') || document.querySelector('div[data-ref]'));
      });

      if (hasQr) {
        // Take QR screenshot
        const qrCanvas = this.page.locator('canvas, div[data-ref]').first();
        if (await qrCanvas.isVisible()) {
          const buffer = await qrCanvas.screenshot({ type: 'png' });
          const qrDataUrl = `data:image/png;base64,${buffer.toString('base64')}`;
          return { isConnected: false, isQrNeeded: true, qrDataUrl, sessionDir: this.sessionDir };
        }
      }

      return { isConnected: false, isQrNeeded: false, sessionDir: this.sessionDir };
    } catch (err: any) {
      return { isConnected: false, isQrNeeded: false, sessionDir: this.sessionDir, lastError: err.message };
    }
  }

  public async connect(): Promise<WhatsAppBridgeStatus> {
    if (this.isInitializing) {
      return this.getStatus();
    }

    this.isInitializing = true;
    this.lastError = '';

    try {
      if (!this.context) {
        // Launch persistent chromium context
        this.context = await chromium.launchPersistentContext(this.sessionDir, {
          headless: true, // Run headless so it works in container/server env
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
          ],
          viewport: { width: 1280, height: 900 },
          userAgent:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        });
      }

      const pages = this.context.pages();
      this.page = pages.length > 0 ? pages[0] : await this.context.newPage();

      if (!this.page.url().includes('web.whatsapp.com')) {
        await this.page.goto('https://web.whatsapp.com', { waitUntil: 'domcontentloaded', timeout: 45000 });
      }

      // Wait a bit for page scripts
      await this.page.waitForTimeout(3000);
      this.isInitializing = false;
      return await this.getStatus();
    } catch (err: any) {
      this.isInitializing = false;
      this.lastError = err.message || 'Failed to initialize WhatsApp Web browser';
      return { isConnected: false, isQrNeeded: false, sessionDir: this.sessionDir, lastError: this.lastError };
    }
  }

  public async sendReport(params: SendReportParams): Promise<{ success: boolean; status: string; error?: string }> {
    const { salespersonName, phone, imageDataUrl, mode } = params;

    if (!this.page) {
      const connStatus = await this.connect();
      if (!connStatus.isConnected && !connStatus.isQrNeeded) {
        return { success: false, status: 'failed', error: 'WhatsApp Web is not connected. Scan QR code first.' };
      }
    }

    try {
      const cleanPhone = phone.replace(/\D/g, '');
      if (!cleanPhone) {
        return { success: false, status: 'failed', error: 'Invalid or missing phone number' };
      }

      // 1. Save PNG file locally with strict naming
      const base64Data = imageDataUrl.replace(/^data:image\/\w+;base64,/, '');
      const sanitizedName = salespersonName.replace(/[^\w\-]+/g, '_');
      const tempFilePath = path.join(this.tempDir, `FINORA_${sanitizedName}_${Date.now()}.png`);
      fs.writeFileSync(tempFilePath, Buffer.from(base64Data, 'base64'));

      // 2. Open chat URL
      const chatUrl = `https://web.whatsapp.com/send?phone=${cleanPhone}`;
      await this.page!.goto(chatUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // Wait for chat input or error alert
      await this.page!.waitForTimeout(4000);

      // Verify chat pane loaded
      const isChatLoaded = await this.page!.evaluate(() => {
        return !!(
          document.querySelector('div[contenteditable="true"]') ||
          document.querySelector('span[data-icon="plus"]') ||
          document.querySelector('span[data-icon="attach-menu-plus"]')
        );
      });

      if (!isChatLoaded) {
        // Check for invalid phone error modal
        const isInvalid = await this.page!.evaluate(() => {
          return document.body.innerText.includes('Phone number shared via url is invalid') ||
                 document.body.innerText.includes('invalid phone number');
        });

        if (isInvalid) {
          return { success: false, status: 'failed', error: `Phone number +${cleanPhone} is not registered on WhatsApp` };
        }
      }

      // 3. Locate File Input or click attach icon
      // Inject file into input element if present or trigger attach menu
      let fileAttached = false;

      // Find file input element (WhatsApp Web uses hidden file input for attachments)
      const fileInputLocator = this.page!.locator('input[type="file"]');
      const inputCount = await fileInputLocator.count();

      if (inputCount > 0) {
        // Direct file input set
        await fileInputLocator.first().setInputFiles(tempFilePath);
        fileAttached = true;
      } else {
        // Click attachment icon (+ icon or paperclip icon)
        const attachBtn = this.page!.locator('span[data-icon="plus"], span[data-icon="attach-menu-plus"]').first();
        if (await attachBtn.isVisible()) {
          await attachBtn.click();
          await this.page!.waitForTimeout(1000);
          // Now file input should be available
          const fileInput = this.page!.locator('input[type="file"][accept*="image"]').first();
          await fileInput.setInputFiles(tempFilePath);
          fileAttached = true;
        }
      }

      if (!fileAttached) {
        return { success: false, status: 'failed', error: 'Could not locate image file input in WhatsApp Web interface.' };
      }

      // 4. Verify Image Preview in Composer
      await this.page!.waitForTimeout(3000);

      const hasPreview = await this.page!.evaluate(() => {
        return !!(
          document.querySelector('span[data-icon="send"]') ||
          document.querySelector('div[aria-label="Send"]') ||
          document.querySelector('img[src*="blob:"]')
        );
      });

      if (!hasPreview) {
        return { success: false, status: 'failed', error: 'Image preview did not render in WhatsApp Web composer.' };
      }

      // 5. Mode A vs Mode B
      if (mode === 'automated_send') {
        // Click send button
        const sendBtn = this.page!.locator('span[data-icon="send"], div[aria-label="Send"]').first();
        if (await sendBtn.isVisible()) {
          await sendBtn.click();
          await this.page!.waitForTimeout(3000);
          return { success: true, status: 'sent' };
        } else {
          // Press Enter in preview context
          await this.page!.keyboard.press('Enter');
          await this.page!.waitForTimeout(3000);
          return { success: true, status: 'sent' };
        }
      } else {
        // Mode A: Attach and Review - leave open for manual click
        return { success: true, status: 'image_attached' };
      }
    } catch (err: any) {
      return { success: false, status: 'failed', error: err.message || 'Error processing attachment in WhatsApp Web' };
    }
  }

  public async disconnect(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
      this.page = null;
    }
  }
}

export const whatsappWebBridge = new WhatsAppWebBridgeService();
