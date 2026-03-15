import dotenv from 'dotenv';
import path from 'path';
import { ConfigType } from '@/types';

dotenv.config();

const ROOT_DIR = path.resolve(__dirname, '../../');

const CONFIG: ConfigType = {
    // Image Processing
    IMAGE_SIZE: 64,

    // Model Parameters
    CLASSIFICATION_THRESHOLD: 0.6,
    AUGMENTATION_FACTOR: 3,

    // Training Parameters
    BATCH_SIZE: 1,
    EPOCHS: 5,
    VALIDATION_SPLIT: 0.0, // Disable split for tiny dataset debugging
    LEARNING_RATE: 0.0005,
    EARLY_STOPPING_PATIENCE: 5,

    // Server Parameters
    PORT: process.env.PORT || 8080,
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb+srv://pd3072894_db_user:ve4PIBcB17HuhCaA@cluster0.83cabkt.mongodb.net/?appName=Cluster0',

    // Paths
    PATHS: {
        ROOT: ROOT_DIR,
        DATA_CORRECT: path.join(ROOT_DIR, 'data', 'correct'),
        DATA_INCORRECT: path.join(ROOT_DIR, 'data', 'incorrect'),
        MODEL_DIR: path.join(ROOT_DIR, 'model'),
        MODEL_FILE: path.join(ROOT_DIR, 'model', 'model.json'),
        DEBUG_DIR: path.join(ROOT_DIR, 'public', 'debug'),
    }
};

export default CONFIG;
