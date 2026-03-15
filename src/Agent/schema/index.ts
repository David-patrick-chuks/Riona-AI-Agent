type JsonSchema = {
  description?: string;
  type: "string" | "number" | "integer" | "boolean" | "array" | "object";
  nullable?: boolean;
  items?: JsonSchema;
  properties?: Record<string, JsonSchema>;
  required?: string[];
};
import mongoose, { Document, Schema, Model } from "mongoose";

export type InstagramCommentSchema = JsonSchema;

export const getInstagramCommentSchema = (): InstagramCommentSchema => {
  const itemSchema: JsonSchema = {
    type: "object",
    properties: {
      comment: {
        type: "string",
        description: "A comment between 150 and 250 characters.",
        nullable: false,
      },
      viralRate: {
        type: "number",
        description: "The viral rate, measured on a scale of 0 to 100.",
        nullable: false,
      },
      commentTokenCount: {
        type: "number",
        description: "The total number of tokens in the comment.",
        nullable: false,
      },
    },
    required: ["comment", "viralRate", "commentTokenCount"],
  };

  const schema: JsonSchema = {
    description: `Lists comments that are engaging and have the potential to attract more likes and go viral.`,
    type: "array",
    items: itemSchema,
  };

  return schema;
};

// Define the interface for the Tweet document
interface ITweet extends Document {
  tweetContent: string;
  imageUrl: string;
  timeTweeted: Date;
}

// Define the schema for the Tweet document
const tweetSchema: Schema<ITweet> = new Schema({
  tweetContent: { type: String, required: true },
  imageUrl: { type: String, required: true },
  timeTweeted: { type: Date, default: Date.now },
});

// Create the model for the Tweet document
const Tweet: Model<ITweet> = mongoose.model<ITweet>("Tweet", tweetSchema);

export default Tweet;
