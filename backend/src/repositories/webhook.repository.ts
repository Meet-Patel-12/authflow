import { Webhook, IWebhook, WebhookDelivery } from "../models/webhook.model";

// ─── Webhook ──────────────────────────────────────────────────────────────────

export const findOrgWebhooks = async (organizationId: string) => {
  return Webhook.find({ organizationId, isActive: true }).select("-secret");
};

export const findOrgWebhookById = async (
  id: string,
  organizationId: string,
) => {
  return Webhook.findOne({ _id: id, organizationId, isActive: true }).select(
    "-secret",
  );
};

export const findOrgWebhookByIdAny = async (
  id: string,
  organizationId: string,
) => {
  return Webhook.findOne({ _id: id, organizationId });
};

export const findActiveWebhooksForEvent = async (
  organizationId: string,
  event: string,
) => {
  return Webhook.find({ organizationId, events: event, isActive: true }).select(
    "+secret",
  );
};

export const findWebhookWithSecret = async (id: string) => {
  return Webhook.findById(id).select("+secret");
};

export const createWebhook = async (data: {
  userId: string;
  organizationId: string;
  url: string;
  events: string[];
  secret: string;
  metadata?: Record<string, unknown>;
}): Promise<IWebhook> => {
  return Webhook.create(data);
};

export const saveWebhook = async (webhook: IWebhook): Promise<IWebhook> => {
  return webhook.save();
};

export const deactivateWebhook = async (
  webhook: IWebhook,
): Promise<IWebhook> => {
  webhook.isActive = false;
  return webhook.save();
};

// ─── Webhook Delivery ─────────────────────────────────────────────────────────

export const createDelivery = async (data: {
  webhookId: string;
  event: string;
  payload: Record<string, unknown>;
}) => {
  return WebhookDelivery.create({ ...data, status: "pending" });
};

export const findDeliveries = async (
  webhookId: string,
  skip: number,
  limit: number,
) => {
  return WebhookDelivery.find({ webhookId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

export const countDeliveries = async (webhookId: string): Promise<number> => {
  return WebhookDelivery.countDocuments({ webhookId });
};

export const updateDelivery = async (
  deliveryId: string,
  data: Record<string, unknown>,
) => {
  return WebhookDelivery.findByIdAndUpdate(deliveryId, data);
};

export const findDeliveryById = async (deliveryId: string) => {
  return WebhookDelivery.findById(deliveryId);
};
