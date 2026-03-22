import mongoose, { Document, Schema } from "mongoose";
import { WEBHOOK_EVENTS, WebhookEvent } from "../constants/webhook.events";

export interface IWebhook extends Document {
  userId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  url: string;
  secret: string;
  events: WebhookEvent[];
  isActive: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWebhookDelivery extends Document {
  webhookId: mongoose.Types.ObjectId;
  event: string;
  payload: Record<string, unknown>;
  response?: {
    statusCode: number;
    body: string;
    headers: Record<string, string>;
  };
  status: "pending" | "success" | "failed" | "retrying";
  attemptCount: number;
  lastAttemptAt?: Date;
  nextRetryAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const webhookSchema = new Schema<IWebhook>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    url: {
      type: String,
      required: [true, "Webhook URL is required"],
      validate: {
        validator: (v: string) => /^https?:\/\/.+/.test(v),
        message: "URL must be a valid HTTP/HTTPS URL",
      },
    },
    secret: { type: String, required: true, select: false },
    events: [{ type: String, enum: WEBHOOK_EVENTS }],
    isActive: { type: Boolean, default: true },
    metadata: Schema.Types.Mixed,
  },
  { timestamps: true },
);

const webhookDeliverySchema = new Schema<IWebhookDelivery>(
  {
    webhookId: {
      type: Schema.Types.ObjectId,
      ref: "Webhook",
      required: true,
      index: true,
    },
    event: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    response: {
      statusCode: Number,
      body: String,
      headers: Schema.Types.Mixed,
    },
    status: {
      type: String,
      enum: ["pending", "success", "failed", "retrying"],
      default: "pending",
    },
    attemptCount: { type: Number, default: 0 },
    lastAttemptAt: Date,
    nextRetryAt: Date,
  },
  { timestamps: true },
);

webhookSchema.index({ organizationId: 1, isActive: 1 });
webhookDeliverySchema.index({ webhookId: 1, createdAt: -1 });
webhookDeliverySchema.index({ status: 1, nextRetryAt: 1 });
webhookDeliverySchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 2_592_000 },
); // 30 days TTL

export const Webhook = mongoose.model<IWebhook>("Webhook", webhookSchema);
export const WebhookDelivery = mongoose.model<IWebhookDelivery>(
  "WebhookDelivery",
  webhookDeliverySchema,
);
