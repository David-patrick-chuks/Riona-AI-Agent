import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import UserAgent from 'user-agents';
import fs from 'fs';
import path from 'path';
import logger from '@/utils/logger';

// Use stealth plugin with Playwright
// chromium.use(StealthPlugin());

// --- CONFIGURATION ---
const X_USERNAME = 'Agent_on_x';
const X_PASSWORD = 'Agent#agent5686';
const X_EMAIL = 'abdulbaakiabubakar49@gmail.com';
// ---------------------

/**
 * Bezier-based human-like mouse movement in Playwright
 */
async function bezierMove(page: any, targetX: number, targetY: number) {
    const viewport = page.viewportSize() || { width: 1280, height: 720 };
    const start = { x: viewport.width / 2, y: viewport.height / 2 };

    const cpX = start.x + (targetX - start.x) * Math.random();
    const cpY = start.y + (targetY - start.y) * Math.random();

    const steps = 30 + Math.floor(Math.random() * 20);

    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const curX = Math.pow(1 - t, 2) * start.x + 2 * (1 - t) * t * cpX + Math.pow(t, 2) * targetX;
        const curY = Math.pow(1 - t, 2) * start.y + 2 * (1 - t) * t * cpY + Math.pow(t, 2) * targetY;

        await page.mouse.move(curX + (Math.random() - 0.5) * 2, curY + (Math.random() - 0.5) * 2);
        await new Promise(r => setTimeout(r, 10 + Math.random() * 15));
    }
}

async function wiggleMouse(page: any) {
    const x = Math.random() * 400 + 300;
    const y = Math.random() * 400 + 300;
    await bezierMove(page, x, y);
}

async function randomScroll(page: any) {
    const distance = 100 + Math.random() * 200;
    await page.mouse.wheel(0, distance);
    await new Promise(r => setTimeout(r, 500));
    await page.mouse.wheel(0, -distance / 2);
}

async function run() {
    logger.info('Starting Playwright-Powered Ultra-Stealth Collector...');

    const browser = await chromium.launch({
        headless: false,
        args: [
            '--start-maximized',
            '--disable-blink-features=AutomationControlled'
        ]
    });

    const ua = new UserAgent({ deviceCategory: 'desktop' });
    const userAgent = ua.toString();

    // Create a specialized context for maximum stealth
    const context = await browser.newContext({
        userAgent: userAgent,
        viewport: null,
        locale: 'en-US',
        timezoneId: 'America/New_York'
    });

    const page = await context.newPage();

    // Add extra stealth injections
    await page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        // @ts-ignore
        navigator.chrome = { runtime: {} };
        // @ts-ignore
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    });

    logger.info(`Session Identity: ${userAgent}`);

    logger.info('Navigating to X login...');
    await page.goto('https://x.com/i/flow/login', {
        waitUntil: 'networkidle',
        timeout: 90000
    });

    // Human behavior simulation
    await new Promise(r => setTimeout(r, 4000));
    await wiggleMouse(page);
    await randomScroll(page);
    await new Promise(r => setTimeout(r, 2000));

    try {
        const usernameInput = 'input[name="text"]';
        await page.waitForSelector(usernameInput, { timeout: 40000 });

        const box = await page.locator(usernameInput).boundingBox();
        if (box) {
            await bezierMove(page, box.x + box.width / 2, box.y + box.height / 2);
            await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        } else {
            await page.focus(usernameInput);
        }

        await new Promise(r => setTimeout(r, 600));

        // Human-like typing
        for (const char of X_USERNAME) {
            await page.keyboard.type(char, { delay: 100 + Math.random() * 150 });
        }

        await new Promise(r => setTimeout(r, 1200));

        logger.info('Advancing to next stage...');
        await page.keyboard.press('Enter');

        // Check for Password OR "Unusual Activity" email verification
        const passwordInput = 'input[name="password"]';
        const verifyInput = 'input[data-testid="ocfEnterTextTextInput"]';

        try {
            await page.waitForSelector(`${passwordInput}, ${verifyInput}`, { timeout: 30000 });

            const isVerifyScreen = await page.$(verifyInput);
            if (isVerifyScreen) {
                logger.info('Unusual activity detected. Entering verification email...');
                await new Promise(r => setTimeout(r, 2000));

                const verifyBox = await page.locator(verifyInput).boundingBox();
                if (verifyBox) {
                    await bezierMove(page, verifyBox.x + verifyBox.width / 2, verifyBox.y + verifyBox.height / 2);
                    await page.mouse.click(verifyBox.x + verifyBox.width / 2, verifyBox.y + verifyBox.height / 2);
                }

                for (const char of X_EMAIL) {
                    await page.keyboard.type(char, { delay: 70 + Math.random() * 100 });
                }
                await new Promise(r => setTimeout(r, 1000));
                await page.keyboard.press('Enter');

                logger.info('Verification submitted. Waiting for password field...');
                await page.waitForSelector(passwordInput, { timeout: 30000 });
            }
        } catch (e) {
            logger.warn('Initial flow branch not found, checking for password field specifically...');
            await page.waitForSelector(passwordInput, { timeout: 10000 });
        }

        await new Promise(r => setTimeout(r, 2000));

        // Click password field
        const passBox = await page.locator(passwordInput).boundingBox();
        if (passBox) {
            await bezierMove(page, passBox.x + passBox.width / 2, passBox.y + passBox.height / 2);
            await page.mouse.click(passBox.x + passBox.width / 2, passBox.y + passBox.height / 2);
        }

        await new Promise(r => setTimeout(r, 800));

        // Type password
        logger.info('Entering password...');
        for (const char of X_PASSWORD) {
            await page.keyboard.type(char, { delay: 90 + Math.random() * 150 });
        }

        await new Promise(r => setTimeout(r, 1500));

        logger.info('Finalizing login...');
        await page.keyboard.press('Enter');

        await new Promise(r => setTimeout(r, 8000));

        const isBlocked = await page.content().then(c => c.includes('Could not log you in now'));
        if (isBlocked) {
            logger.warn('X detected automation at final step. Please check the browser window!');
        } else {
            logger.info('Login submitted successfully.');
        }

    } catch (err: any) {
        logger.error(`Flow issue: ${err.message}. Please take over manually.`);
    }

    logger.info('Monitoring for reCAPTCHA challenges...');

    // Setup capture storage
    const storageDir = path.resolve(process.cwd(), 'data/raw_collection', Date.now().toString());
    fs.mkdirSync(storageDir, { recursive: true });

    let count = 0;

    // Periodic check for reCAPTCHA frames
    const checker = setInterval(async () => {
        try {
            const frames = page.frames();
            const challengeFrame = frames.find(f => f.url().includes('google.com/recaptcha/api2/bframe'));

            if (challengeFrame) {
                const imgGrid = await challengeFrame.$('.rc-imageselect-payload');
                if (imgGrid) {
                    count++;
                    const file = path.join(storageDir, `playwright_challenge_${count}.png`);
                    await imgGrid.screenshot({ path: file });
                    logger.info(`[PLAYWRIGHT] CAPTURED #${count} -> ${file}`);
                    await new Promise(r => setTimeout(r, 10000));
                }
            }
        } catch (e) { }
    }, 4000);

    page.on('close', () => {
        clearInterval(checker);
        logger.info('Browser session ended.');
        process.exit(0);
    });
}

run().catch(e => {
    logger.error('Collector failed:', e);
    process.exit(1);
});
