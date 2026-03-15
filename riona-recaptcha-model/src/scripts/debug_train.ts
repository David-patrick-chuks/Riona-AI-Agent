import * as tf from '@tensorflow/tfjs';
import logger from '@/utils/logger';

(async () => {
    try {
        logger.info(`TensorFlow.js Version: ${tf.version.tfjs}`);
        logger.info(`Backend: ${tf.getBackend()}`);

        await tf.ready();
        logger.info('TF Ready.');

        // explicit cpu backend
        await tf.setBackend('cpu');
        logger.info(`Backend set to: ${tf.getBackend()}`);

        const model = tf.sequential();
        model.add(tf.layers.dense({ units: 1, inputShape: [1] }));
        model.compile({ loss: 'meanSquaredError', optimizer: 'sgd' });

        const xs = tf.tensor2d([1, 2, 3, 4], [4, 1]);
        const ys = tf.tensor2d([1, 3, 5, 7], [4, 1]);

        logger.info('Starting dummy training...');

        await model.fit(xs, ys, {
            epochs: 5,
            verbose: 1,
            callbacks: {
                onEpochEnd: (epoch, logs) => {
                    logger.info(`Epoch ${epoch}: loss=${logs?.loss}`);
                }
            }
        });

        logger.info('Dummy training complete.');

    } catch (err) {
        logger.error('Debug script failed:', err);
    }
})();
