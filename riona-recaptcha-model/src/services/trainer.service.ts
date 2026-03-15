import * as tf from '@tensorflow/tfjs';
import CONFIG from '@/config/default';
import logger from '@/utils/logger';
import mlService from './ml.service';
import { loadDataset } from '@/data/loader';
import { Sample } from '@/types';

class TrainerService {
    async run(): Promise<void> {
        try {
            // 1. Load Data
            const { xs, ys, samples } = await loadDataset();

            // 2. Create Model
            const model = mlService.create();

            logger.info('Starting training session...');

            // 3. Train
            await model.fit(xs, ys, {
                epochs: CONFIG.EPOCHS,
                batchSize: CONFIG.BATCH_SIZE,
                validationSplit: CONFIG.VALIDATION_SPLIT,
                verbose: 1, // Enable standard progress bar
                callbacks: {
                    onBatchEnd: (batch, logs) => {
                        logger.info(`Batch ${batch}: loss=${logs?.loss.toFixed(4)}, acc=${logs?.acc.toFixed(4)}`);
                    },
                    onEpochEnd: (epoch, logs) => {
                        logger.info(`Epoch ${epoch + 1}: loss=${logs?.loss.toFixed(4)}, acc=${logs?.acc.toFixed(4)}`);
                    }
                }
            });

            // 4. Quick Evaluation
            await this.evaluate(model, samples.slice(0, 10));

            // 5. Save
            await mlService.save();

            // Cleanup
            xs.dispose();
            ys.dispose();
            samples.forEach(s => s.tensor.dispose());
            logger.info('Training complete. Memory cleaned.');

        } catch (err: any) {
            if (err.message.includes("No images found")) {
                logger.warn("\nPlease add images to 'data/correct' and 'data/incorrect' to start training.\n");
            } else {
                logger.error('Fatal training error:', err.message);
                process.exit(1);
            }
        }
    }

    async evaluate(model: tf.LayersModel, subset: Sample[]): Promise<void> {
        logger.info('\nPerforming post-training evaluation on sample subset:');

        for (const sample of subset) {
            const input = sample.tensor.reshape([1, CONFIG.IMAGE_SIZE, CONFIG.IMAGE_SIZE, 3]);
            const prediction = model.predict(input) as tf.Tensor;
            const score = (await prediction.data())[0];
            const expected = sample.label === 1 ? 'CORRECT' : 'INCORRECT';
            const predicted = score >= CONFIG.CLASSIFICATION_THRESHOLD ? 'CORRECT' : 'INCORRECT';

            logger.info(`Snapshot: ${score.toFixed(4)} (${predicted}) - Expected: ${expected}`);
            input.dispose();
            prediction.dispose();
        }
    }
}

export default new TrainerService();
