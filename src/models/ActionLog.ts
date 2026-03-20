import mongoose, { Document, Model, Schema } from "mongoose";

export type ActionLogStatus = "success" | "error";

export interface IActionLog extends Document {
  platform: string;
  action: string;
  account: string;
  username?: string;
  status: ActionLogStatus;
  error?: string;
  details?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const ActionLogSchema = new Schema<IActionLog>(
  {
    platform: { type: String, required: true, trim: true },
    action: { type: String, required: true, trim: true },
    account: { type: String, required: true, trim: true, default: "default" },
    username: { type: String, trim: true },
    status: {
      type: String,
      required: true,
      enum: ["success", "error"],
    },
    error: { type: String, trim: true },
    details: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const ActionLog: Model<IActionLog> =
  mongoose.models.ActionLog ||
  mongoose.model<IActionLog>("ActionLog", ActionLogSchema);

export default ActionLog;
