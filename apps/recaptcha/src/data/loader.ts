import * as tf from '@tensorflow/tfjs';
import { promises as fs } from 'fs';
import path from 'path';
import { createCanvas, loadImage } from 'canvas';
import CONFIG from '@/config/default';
import logger from '@/utils/logger';
import { Dataset, Sample } from '@/types';
import pipeline from './pipeline';

/**
 * Loads all images from a directory and converts them to tensors.
 */
async function loadImagesFromDir(dir: string, label: number): Promise<Sample[]> {
    const samples: Sample[] = [];

    try {
        const files = await fs.readdir(dir);
        const imageFiles = files.filter(f => /\.(jpg|jpeg|png|gif|bmp)$/i.test(f));

        if (imageFiles.length === 0) {
            return samples;
        }

        for (const file of imageFiles) {
            const filePath = path.join(dir, file);
            try {
                const img = await loadImage(filePath);
                const canvas = createCanvas(CONFIG.IMAGE_SIZE, CONFIG.IMAGE_SIZE);
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, CONFIG.IMAGE_SIZE, CONFIG.IMAGE_SIZE);

                const tensor = tf.browser.fromPixels(canvas as any)
                    .toFloat()
                    .div(tf.scalar(255.0)) as tf.Tensor3D;

                samples.push({
                    tensor,
                    label,
                    file
                });
            } catch (err) {
                logger.warn(`Skipping invalid image ${file}:`, err);
            }
        }
    } catch (err) {
        logger.warn(`Directory not found or unreadable: ${dir}`);
    }

    return samples;
}

/**
 * Loads and prepares the full dataset for training.
 */
export async function loadDataset(): Promise<Dataset> {
    logger.info('Loading dataset...');

    const correctSamples = await loadImagesFromDir(CONFIG.PATHS.DATA_CORRECT, 1);
    const incorrectSamples = await loadImagesFromDir(CONFIG.PATHS.DATA_INCORRECT, 0);

    const allSamples = [...correctSamples, ...incorrectSamples];

    if (allSamples.length === 0) {
        throw new Error("No images found in data directories.");
    }

    logger.info(`Loaded ${correctSamples.length} correct, ${incorrectSamples.length} incorrect samples.`);

    // Augment dataset
    const augmentedSamples = pipeline.augmentDataset(allSamples);
    logger.info(`Augmented dataset to ${augmentedSamples.length} samples.`);

    // Shuffle
    tf.util.shuffle(augmentedSamples);

    // Create tensors
    const xs = tf.stack(augmentedSamples.map(s => s.tensor));
    const ys = tf.tensor1d(augmentedSamples.map(s => s.label), 'float32');

    return {
        xs,
        ys,
        samples: augmentedSamples
    };
}
