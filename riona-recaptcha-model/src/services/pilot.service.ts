import { chromium } from 'playwright-extra';
import { Browser, BrowserContext, Page } from 'playwright';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import UserAgent from 'user-agents';
import logger from '@/utils/logger';

// @ts-ignore
// chromium.use(StealthPlugin());

class PilotService {
    private browser: Browser | null = null;
    private context: BrowserContext | null = null;
    public page: Page | null = null;

    /**
     * Launch the "Pilot" context
     */
    async launch(options: { headless: boolean } = { headless: false }) {
        logger.info('Launching riona Pilot...');

        this.browser = await chromium.launch({
            headless: options.headless,
            args: [
                '--start-maximized',
                '--disable-blink-features=AutomationControlled'
            ]
        });

        const ua = new UserAgent({ deviceCategory: 'desktop' });
        const userAgent = ua.toString();

        this.context = await this.browser.newContext({
            userAgent: userAgent,
            viewport: null,
            locale: 'en-US',
            timezoneId: 'America/New_York'
        });

        this.page = await this.context.newPage();

        // Extra Stealth Injections
        await this.page.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
            // @ts-ignore
            navigator.chrome = { runtime: {} };
            // @ts-ignore
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        });

        logger.info(`Pilot Session Active: ${userAgent}`);
        return this.page;
    }

    /**
     * Bezier-based human-like mouse movement
     */
    async humanMove(targetX: number, targetY: number) {
        if (!this.page) return;

        const viewport = this.page.viewportSize() || { width: 1280, height: 720 };
        const mouse = this.page.mouse;

        // Starting position (approximate if unknown)
        const start = { x: viewport.width / 2, y: viewport.height / 2 };

        // Control point for curve
        const cpX = start.x + (targetX - start.x) * Math.random();
        const cpY = start.y + (targetY - start.y) * Math.random();

        const steps = 25 + Math.floor(Math.random() * 15);

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const curX = Math.pow(1 - t, 2) * start.x + 2 * (1 - t) * t * cpX + Math.pow(t, 2) * targetX;
            const curY = Math.pow(1 - t, 2) * start.y + 2 * (1 - t) * t * cpY + Math.pow(t, 2) * targetY;

            // Add micro-jitter
            const jitterX = (Math.random() - 0.5) * 1.5;
            const jitterY = (Math.random() - 0.5) * 1.5;

            await mouse.move(curX + jitterX, curY + jitterY);

            // Variable speed
            const delay = 5 + Math.random() * 10;
            await new Promise(r => setTimeout(r, delay));
        }

        // Final micro-adjustment (human precision is imperfect)
        await mouse.move(targetX, targetY);
    }

    /**
     * Human-like click with slight delay and jitter
     */
    async humanClick(selector?: string, coords?: { x: number, y: number }) {
        if (!this.page) return;

        let target = coords;

        if (selector && !coords) {
            const box = await this.page.locator(selector).boundingBox();
            if (box) {
                target = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
            }
        }

        if (target) {
            await this.humanMove(target.x, target.y);
            await new Promise(r => setTimeout(r, 100 + Math.random() * 200)); // Reading pause
            await this.page.mouse.down();
            await new Promise(r => setTimeout(r, 50 + Math.random() * 50)); // Click duration
            await this.page.mouse.up();
        } else if (selector) {
            await this.page.click(selector);
        }
    }

    /**
     * Human-like typing with variable cadence
     */
    async humanType(text: string) {
        if (!this.page) return;
        for (const char of text) {
            await this.page.keyboard.type(char, { delay: 50 + Math.random() * 150 });
        }
    }

    /**
     * Take a screenshot for the Brain
     */
    async captureScreenshot() {
        if (!this.page) return null;
        const buffer = await this.page.screenshot();
        return buffer.toString('base64');
    }

    async close() {
        if (this.browser) await this.browser.close();
    }
}

export default new PilotService();
