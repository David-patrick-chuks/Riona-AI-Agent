import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ITweet extends Document {
  tweetContent: string;
  imageUrl?: string | null;
  timeTweeted: Date;
}

const tweetSchema = new Schema<ITweet>({
  tweetContent: { type: String, required: true },
  imageUrl: { type: String, required: false, default: null },
  timeTweeted: { type: Date, default: Date.now },
});

const Tweet: Model<ITweet> = mongoose.models.Tweet || mongoose.model<ITweet>('Tweet', tweetSchema);

export default Tweet;
