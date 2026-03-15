import * as tf from '@tensorflow/tfjs';

export interface ConfigType {
    IMAGE_SIZE: number;
    CLASSIFICATION_THRESHOLD: number;
    AUGMENTATION_FACTOR: number;
    BATCH_SIZE: number;
    EPOCHS: number;
    VALIDATION_SPLIT: number;
    LEARNING_RATE: number;
    EARLY_STOPPING_PATIENCE: number;
    PORT: number | string;
    MONGODB_URI: string;
    PATHS: {
        ROOT: string;
        DATA_CORRECT: string;
        DATA_INCORRECT: string;
        MODEL_DIR: string;
        MODEL_FILE: string;
        DEBUG_DIR: string;
    };
}

export interface Sample {
    tensor: tf.Tensor3D;
    label: number;
    file: string;
    isAugmented?: boolean;
}

export interface Dataset {
    xs: tf.Tensor;
    ys: tf.Tensor;
    samples: Sample[];
}

export interface IHistoryItem {
    sender: 'user' | 'assistant';
    content: string;
}

export interface IMediaPart {
    type?: 'image_url' | 'text';
    text?: string;
    inline_data?: {
        mime_type: string;
        data: string;
    };
    image_url?: {
        url: string;
    };
}
