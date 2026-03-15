import * as tf from '@tensorflow/tfjs';
import { promises as fs } from 'fs';
import CONFIG from '@/config/default';
import logger from '@/utils/logger';

/**
 * Machine Learning Service
 * Encapsulates model creation, saving, loading, and prediction.
 */
class MLService {
    private model: tf.LayersModel | null;

    constructor() {
        this.model = null;
    }

    /**
     * Creates and compiles the CNN.
     */
    create(): tf.LayersModel {
        logger.info('Creating model architecture...');
        const model = tf.sequential();

        // Layer 1
        model.add(tf.layers.conv2d({
            inputShape: [CONFIG.IMAGE_SIZE, CONFIG.IMAGE_SIZE, 3],
            filters: 16,
            kernelSize: 3,
            activation: 'relu',
            padding: 'same'
        }));
        model.add(tf.layers.batchNormalization());
        model.add(tf.layers.maxPooling2d({ poolSize: 2 }));

        // Layer 2
        model.add(tf.layers.conv2d({
            filters: 32,
            kernelSize: 3,
            activation: 'relu',
            padding: 'same'
        }));
        model.add(tf.layers.batchNormalization());
        model.add(tf.layers.maxPooling2d({ poolSize: 2 }));

        // Layer 3
        model.add(tf.layers.conv2d({
            filters: 64,
            kernelSize: 3,
            activation: 'relu',
            padding: 'same'
        }));
        model.add(tf.layers.batchNormalization());
        model.add(tf.layers.maxPooling2d({ poolSize: 2 }));

        model.add(tf.layers.flatten());
        model.add(tf.layers.dropout({ rate: 0.4 }));

        model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
        model.add(tf.layers.dropout({ rate: 0.3 }));
        model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));

        model.compile({
            loss: 'binaryCrossentropy',
            optimizer: tf.train.adam(CONFIG.LEARNING_RATE),
            metrics: ['accuracy'],
        });

        this.model = model;
        logger.info('Model created successfully.');
        return model;
    }

    /**
     * Saves the model to disk.
     */
    async save(): Promise<void> {
        if (!this.model) throw new Error("Model not created");

        try {
            logger.info('Saving model to disk...');
            await this.model.save(tf.io.withSaveHandler(async (data) => {
                const modelJson = JSON.stringify({
                    modelTopology: data.modelTopology,
                    format: 'layers-model',
                    generatedBy: 'TensorFlow.js',
                    convertedBy: null,
                    weightsManifest: [{
                        paths: ['./weights.bin'],
                        weights: data.weightSpecs
                    }]
                });

                await fs.mkdir(CONFIG.PATHS.MODEL_DIR, { recursive: true });
                await fs.writeFile(CONFIG.PATHS.MODEL_FILE, modelJson);

                // Handling weights
                const weightsPath = CONFIG.PATHS.MODEL_FILE.replace('model.json', 'weights.bin');
                if (data.weightData) {
                    const buffer = Buffer.from(data.weightData as ArrayBuffer);
                    await fs.writeFile(weightsPath, buffer);
                }

                return {
                    modelArtifactsInfo: {
                        dateSaved: new Date(),
                        modelTopologyType: 'JSON',
                        weightDataBytes: data.weightData ? (data.weightData as ArrayBuffer).byteLength : 0,
                    },
                };
            }));
            logger.info(`Model saved to ${CONFIG.PATHS.MODEL_DIR}`);
        } catch (err: any) {
            logger.error('Failed to save model:', err.message);
            throw err;
        }
    }

    async load(pathUrl?: string): Promise<void> {
        try {
            logger.info(`Loading model from ${CONFIG.PATHS.MODEL_FILE}...`);

            // 1. Read model.json
            const modelJsonContent = await fs.readFile(CONFIG.PATHS.MODEL_FILE, 'utf-8');
            const modelArtifacts = JSON.parse(modelJsonContent);

            if (!modelArtifacts.weightsManifest || !modelArtifacts.weightsManifest[0]) {
                throw new Error("Model file is outdated or incompatible. Please run 'npm run train' to regenerate the model.");
            }

            // 2. Read weights.bin
            const weightsPath = CONFIG.PATHS.MODEL_FILE.replace('model.json', 'weights.bin');
            const weightData = await fs.readFile(weightsPath);

            // 3. Convert Buffer to ArrayBuffer (TensorFlow.js requirement)
            const weightBuffer = weightData.buffer.slice(
                weightData.byteOffset,
                weightData.byteOffset + weightData.byteLength
            ) as ArrayBuffer;

            // 4. Load using fromMemory
            const handler = tf.io.fromMemory(
                modelArtifacts.modelTopology,
                modelArtifacts.weightsManifest[0].weights,
                weightBuffer
            );

            this.model = await tf.loadLayersModel(handler);
            logger.info('Model loaded.');
        } catch (err: any) {
            logger.error('Failed to load model', err.message);
            // If model missing, we might want to fail gracefully or just log
            throw err;
        }
    }

    predict(tensor: tf.Tensor): tf.Tensor {
        if (!this.model) throw new Error("Model not loaded");
        return this.model.predict(tensor) as tf.Tensor;
    }

    isLoaded(): boolean {
        return this.model !== null;
    }
}

export default new MLService();
