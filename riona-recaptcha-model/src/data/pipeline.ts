import * as tf from '@tensorflow/tfjs';
import { Sample } from '@/types';
import CONFIG from '@/config/default';

/**
 * Data Pipeline Service
 * Handles image augmentation for training data.
 */
class DataPipeline {
    /**
     * Augments a single image tensor.
     * Applies random flip, rotation, and brightness adjustments.
     */
    augment(tensor: tf.Tensor3D): tf.Tensor3D {
        return tf.tidy(() => {
            let img = tensor.clone() as tf.Tensor3D;

            // Random horizontal flip (50% chance)
            if (Math.random() > 0.5) {
                // flipLeftRight expects 4D tensor (batch, h, w, c)
                const expanded = tf.expandDims(img, 0);
                const flipped = tf.image.flipLeftRight(expanded as tf.Tensor4D);
                img = tf.squeeze(flipped, [0]) as tf.Tensor3D;
            }

            // Random brightness adjustment (±20%)
            const brightnessFactor = 0.8 + Math.random() * 0.4;
            img = tf.clipByValue(img.mul(brightnessFactor), 0, 1) as tf.Tensor3D;

            return img;
        });
    }

    /**
     * Augments a dataset by creating multiple variants of each sample.
     */
    augmentDataset(samples: Sample[]): Sample[] {
        const augmented: Sample[] = [];

        for (const sample of samples) {
            // Keep original
            augmented.push({ ...sample, isAugmented: false });

            // Create augmented versions
            for (let i = 0; i < CONFIG.AUGMENTATION_FACTOR - 1; i++) {
                const augmentedTensor = this.augment(sample.tensor);
                augmented.push({
                    tensor: augmentedTensor,
                    label: sample.label,
                    file: `${sample.file}_aug_${i}`,
                    isAugmented: true
                });
            }
        }

        return augmented;
    }
}

export default new DataPipeline();
