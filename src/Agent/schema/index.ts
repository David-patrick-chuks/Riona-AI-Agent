import { SchemaType } from "@google/generative-ai";
import mongoose, { Document, Schema, Model } from "mongoose";

export interface InstagramCommentSchema {
  description: string;
  type: SchemaType;
  items: {
    type: SchemaType;
    properties: {
      comment: {
        type: SchemaType;
        description: string;
        nullable: boolean;
      };
      viralRate: {
        type: SchemaType;
        description: string;
        nullable: boolean;
      };
      commentTokenCount: {
        type: SchemaType;
        description: string;
        nullable: boolean;
      };
    };
    required: string[];
  };
}

export const getInstagramCommentSchema = (): InstagramCommentSchema => {
  return {
    description: `Lists comments that are engaging and have the potential to attract more likes and go viral.`,
    type: SchemaType.ARRAY,
    items: {
      type: SchemaType.OBJECT,
      properties: {
        comment: {
          type: SchemaType.STRING,
          description: "A comment between 150 and 250 characters.",
          nullable: false,
        },
        viralRate: {
          type: SchemaType.NUMBER,
          description: "The viral rate, measured on a scale of 0 to 100.",
          nullable: false,
        },
        commentTokenCount: {
          type: SchemaType.NUMBER,
          description: "The total number of tokens in the comment.",
          nullable: false,
        },
      },
      required: ["comment", "viralRate", "commentTokenCount"],
    },
  };
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
