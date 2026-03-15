import fs from 'fs';
import path from 'path';
import CONFIG from '@/config/default';
import logger from '@/utils/logger';

const API_URL = `http://localhost:${CONFIG.PORT}/predict`;

(async () => {
    try {
        logger.info('Starting Integration Test...');

        // 1. Gather Images
        const correctDir = CONFIG.PATHS.DATA_CORRECT;
        const incorrectDir = CONFIG.PATHS.DATA_INCORRECT;

        const correctFiles = fs.readdirSync(correctDir).filter(f => !f.startsWith('.')).slice(0, 2);
        const incorrectFiles = fs.readdirSync(incorrectDir).filter(f => !f.startsWith('.')).slice(0, 2);

        const allFiles = [
            ...correctFiles.map(f => ({ path: path.join(correctDir, f), type: 'CORRECT' })),
            ...incorrectFiles.map(f => ({ path: path.join(incorrectDir, f), type: 'INCORRECT' }))
        ];

        if (allFiles.length === 0) {
            logger.error('No images found for testing. Please ensure data/correct and data/incorrect have images.');
            process.exit(1);
        }

        logger.info(`Found ${allFiles.length} images to test.`);

        // 2. Prepare FormData
        const formData = new FormData();
        for (const file of allFiles) {
            const buffer = fs.readFileSync(file.path);
            const blob = new Blob([buffer]);
            formData.append('images', blob as any, path.basename(file.path));
        }

        // 3. Send Request
        logger.info(`Sending POST request to ${API_URL}...`);
        const startTime = Date.now();

        const response = await fetch(API_URL, {
            method: 'POST',
            body: formData
        });

        const duration = Date.now() - startTime;

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`API Error: ${response.status} ${response.statusText} - ${text}`);
        }

        const results: any[] = await response.json();

        // 4. Report
        logger.info(`\nTest Complete in ${duration}ms!`);
        logger.info(`\n=== RESULTS ===`);

        let correctPredictions = 0;

        results.forEach(res => {
            const originalFile = allFiles.find(f => path.basename(f.path) === res.filename);
            const expected = originalFile ? originalFile.type : 'UNKNOWN';
            const isMatch = res.classification === expected;

            if (isMatch) correctPredictions++;

            const icon = isMatch ? '✅' : '❌';
            logger.info(`${icon} [${res.filename}] -> Predicted: ${res.classification} (${res.score}) | Expected: ${expected}`);
        });

        logger.info(`\nAccuracy: ${correctPredictions}/${results.length} (${((correctPredictions / results.length) * 100).toFixed(1)}%)`);

    } catch (err: any) {
        logger.error('Integration Test Failed:', err.message);
    }
})();
