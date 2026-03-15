import dotenv from 'dotenv';
dotenv.config();

import orchestrator from '@/services/orchestrator.service';
import pilotService from '@/services/pilot.service';
import connectDB from '@/config/db';
import logger from '@/utils/logger';

// --- CONFIG ---
const AUTH_TOKEN = 'efdca2bcebdf23cb9f7c5d323442c88ec8d02aaa'; // User should replace this for local testing
// --------------

async function testDrive() {
    try {
        logger.info('Starting riona Engine Test Drive...');

        // 1. Setup DB
        await connectDB();

        // 2. Launch Pilot
        await pilotService.launch({ headless: false });

        // 3. Inject Cookies (Auth Bypass)
        // Note: For a real test, the user must provide a valid auth_token
        if (AUTH_TOKEN && AUTH_TOKEN.length > 10) {
            await pilotService.page?.context().addCookies([
                {
                    name: 'auth_token',
                    value: AUTH_TOKEN,
                    domain: '.x.com',
                    path: '/',
                    httpOnly: true,
                    secure: true,
                    sameSite: 'None'
                }
            ]);
            logger.info('Cookies injected for x.com');
        } else {
            logger.warn('No auth_token provided. riona will land on the login page.');
        }

        // 4. Start Errand
        const errand = "Check notifications and if there is anyone asking for help, let me know. If not, just browse the home feed for 2 cycles.";
        await orchestrator.runErrand(errand);

    } catch (err: any) {
        logger.error('Test Drive Failed: ' + err.message);
    }
}

testDrive();
