import fs from 'fs';
import path from 'path';
import * as tf from '@tensorflow/tfjs';
import { createCanvas, loadImage } from 'canvas';
import CONFIG from '@/config/default';
import { Request, Response } from 'express';
import logger from '@/utils/logger';
import mlService from '@/services/ml.service';
import Prediction from '@/models/prediction';

/**
 * Controller for handling reCAPTCHA requests.
 */
const RecaptchaController = {
    // ... existing initModel ...
    /**
     * Initialize Model
     */
    initModel: async (): Promise<void> => {
        await mlService.load();
    },

    /**
     * Prediction Handler
     */
    predict: async (req: Request, res: Response): Promise<void> => {
        logger.info(`Incoming prediction request from ${req.ip}`);

        // Handle both single file and array of files
        const files = req.files as Express.Multer.File[] || (req.file ? [req.file] : []);

        if (!files || files.length === 0) {
            res.status(400).send('No files uploaded.');
            return;
        }

        try {
            if (!mlService.isLoaded()) {
                res.status(503).send('Model not loaded.');
                return;
            }

            const results = [];

            for (const file of files) {
                try {
                    // Load Image
                    const img = await loadImage(file.path);
                    const canvas = createCanvas(CONFIG.IMAGE_SIZE, CONFIG.IMAGE_SIZE);
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, CONFIG.IMAGE_SIZE, CONFIG.IMAGE_SIZE);

                    const tensor = tf.browser.fromPixels(canvas as any)
                        .toFloat()
                        .div(tf.scalar(255.0))
                        .reshape([1, CONFIG.IMAGE_SIZE, CONFIG.IMAGE_SIZE, 3]) as tf.Tensor;

                    // Predict
                    const prediction = mlService.predict(tensor);
                    const score = (await prediction.data())[0];

                    tensor.dispose();
                    prediction.dispose();

                    const result = {
                        filename: file.originalname,
                        score: score.toFixed(4),
                        classification: score >= CONFIG.CLASSIFICATION_THRESHOLD ? 'CORRECT' as const : 'INCORRECT' as const,
                    };
                    results.push(result);

                    // Move file to public/uploads/predictions instead of deleting
                    const uploadsDir = path.join(CONFIG.PATHS.ROOT, 'public/uploads/predictions');
                    if (!fs.existsSync(uploadsDir)) {
                        fs.mkdirSync(uploadsDir, { recursive: true });
                    }

                    const savedFilename = `${Date.now()}_${file.originalname}`;
                    const targetPath = path.join(uploadsDir, savedFilename);
                    fs.renameSync(file.path, targetPath);

                    const publicPath = `/uploads/predictions/${savedFilename}`;

                    // Log to DB
                    try {
                        await Prediction.create({
                            filename: result.filename,
                            imageUrl: publicPath,
                            score: parseFloat(result.score),
                            classification: result.classification,
                            ip: req.ip,
                            userAgent: req.get('User-Agent') || 'Unknown'
                        });
                    } catch (dbErr: any) {
                        logger.error('Failed to log prediction to DB:', dbErr.message);
                    }
                } catch (innerErr: any) {
                    logger.error(`Error processing file ${file.originalname}:`, innerErr);
                    results.push({
                        filename: file.originalname,
                        error: 'Processing failed'
                    });

                    // Cleanup on error
                    try {
                        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
                    } catch (e) { }
                }
            }

            logger.info(`Processed ${results.length} images.`);
            res.json(results);
        } catch (err: any) {
            logger.error('Batch prediction error:', err);
            res.status(500).send('Prediction failed.');
        }
    },

    /**
     * Health Check
     */
    ping: (req: Request, res: Response): void => {
        res.json({ status: 'ok', message: 'Server is running' });
    }
};

export default RecaptchaController;
