import axios from "axios";
import crypto from "crypto";
import {
  findActiveWebhooksForEvent,
  findWebhookWithSecret,
  findDeliveryById,
  createDelivery,
  updateDelivery,
} from "../repositories/webhook.repository";
import { WebhookEvent } from "../constants/webhook.events";

// ─── Signature ────────────────────────────────────────────────────────────────

export const generateSignature = (payload: unknown, secret: string): string => {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(JSON.stringify(payload));
  return `sha256=${hmac.digest("hex")}`;
};

export const verifySignature = (
  payload: unknown,
  signature: string,
  secret: string,
): boolean => {
  const expected = generateSignature(payload, secret);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected),
    );
  } catch {
    return false;
  }
};

// ─── Send Event ───────────────────────────────────────────────────────────────
// Entry point called from controllers when an event occurs.
// Queues delivery via BullMQ if available, falls back to direct delivery.

export const sendEvent = async (
  event: WebhookEvent,
  payload: Record<string, unknown>,
  organizationId: string,
): Promise<void> => {
  try {
    const webhooks = await findActiveWebhooksForEvent(organizationId, event);

    for (const webhook of webhooks) {
      const delivery = await createDelivery({
        webhookId: webhook._id.toString(),
        event,
        payload,
      });

      // Import queue lazily to avoid circular dependency
      const { webhookQueue } = await import("../queue/webhook.queue");

      if (webhookQueue) {
        await webhookQueue.add(
          "deliver",
          {
            webhookId: webhook._id.toString(),
            event,
            payload,
            deliveryId: delivery._id.toString(),
          },
          { jobId: `delivery-${delivery._id.toString()}` }, // deduplicate
        );
      } else {
        await processDelivery(
          webhook._id.toString(),
          event,
          payload,
          delivery._id.toString(),
          0,
        );
      }
    }
  } catch (error) {
    console.error("Webhook sendEvent error:", error);
  }
};

// ─── Process Delivery ─────────────────────────────────────────────────────────
// Called by the BullMQ worker or directly in fallback mode.
// BullMQ handles retries — this function does one attempt.

export const processDelivery = async (
  webhookId: string,
  event: string,
  payload: Record<string, unknown>,
  deliveryId: string,
  attemptNumber: number,
): Promise<void> => {
  const webhook = await findWebhookWithSecret(webhookId);

  if (!webhook?.isActive) {
    await updateDelivery(deliveryId, {
      status: "failed",
      lastAttemptAt: new Date(),
    });
    return;
  }

  const delivery = await findDeliveryById(deliveryId);
  if (!delivery) return;

  const webhookPayload = {
    id: deliveryId,
    event,
    timestamp: new Date().toISOString(),
    data: payload,
    ...(attemptNumber > 0 ? { retry: attemptNumber } : {}),
  };

  const signature = generateSignature(webhookPayload, webhook.secret);

  try {
    const response = await axios.post(webhook.url, webhookPayload, {
      timeout: 10_000,
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": signature,
        "X-Webhook-Event": event,
        "User-Agent": "AuthFlow-Webhooks/1.0",
        ...(attemptNumber > 0
          ? { "X-Webhook-Retry": String(attemptNumber) }
          : {}),
      },
    });

    await updateDelivery(deliveryId, {
      status: "success",
      attemptCount: attemptNumber + 1,
      lastAttemptAt: new Date(),
      nextRetryAt: undefined,
      response: {
        statusCode: response.status,
        body: JSON.stringify(response.data).substring(0, 1000),
        headers: Object.fromEntries(
          Object.entries(response.headers).filter(
            ([, v]) => typeof v === "string",
          ),
        ),
      },
    });
  } catch (error: any) {
    const nextAttempt = attemptNumber + 1;
    const backoffMs = Math.min(Math.pow(2, nextAttempt) * 5, 1440) * 60 * 1000;

    await updateDelivery(deliveryId, {
      status: nextAttempt >= 5 ? "failed" : "retrying",
      attemptCount: nextAttempt,
      lastAttemptAt: new Date(),
      nextRetryAt:
        nextAttempt < 5 ? new Date(Date.now() + backoffMs) : undefined,
      response: {
        statusCode: error.response?.status ?? 0,
        body: error.message?.substring(0, 1000) ?? "Unknown error",
        headers: Object.fromEntries(
          Object.entries(error.response?.headers ?? {}).filter(
            ([, v]) => typeof v === "string",
          ),
        ),
      },
    });

    throw error; // Re-throw so BullMQ retries the job
  }
};
