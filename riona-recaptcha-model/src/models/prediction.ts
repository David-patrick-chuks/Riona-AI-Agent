import mongoose, { Document, Schema } from 'mongoose';

export interface IPrediction extends Document {
    filename: string;
    imageUrl?: string;
    score: number;
    classification: 'CORRECT' | 'INCORRECT';
    ip: string;
    userAgent: string;
    timestamp: Date;
}

const PredictionSchema: Schema = new Schema({
    filename: { type: String, required: true },
    imageUrl: { type: String, required: false },
    score: { type: Number, required: true },
    classification: { type: String, enum: ['CORRECT', 'INCORRECT'], required: true },
    ip: { type: String, required: false },
    userAgent: { type: String, required: false },
    timestamp: { type: Date, default: Date.now, index: true }
});

export default mongoose.model<IPrediction>('Prediction', PredictionSchema);
