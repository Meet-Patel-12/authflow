import { Queue, Worker, Job } from "bullmq";
import { updateDelivery } from "../repositories/webhook.repository";
import { processDelivery } from "../services/webhook.service";

const connection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || "0"),
};

export let webhookQueue: Queue | null = null;
export let webhookWorker: Worker | null = null;

// ─── Init ─────────────────────────────────────────────────────────────────────
// Called once at server startup. Safe to call if Redis is unavailable —
// falls back to direct synchronous delivery.

export function initWebhookQueue(): void {
  try {
    webhookQueue = new Queue("webhook-delivery", {
      connection,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: "exponential", delay: 5 * 60 * 1000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500 },
      },
    });

    webhookWorker = new Worker(
      "webhook-delivery",
      async (job: Job) => {
        const { webhookId, event, payload, deliveryId } = job.data;
        await processDelivery(
          webhookId,
          event,
          payload,
          deliveryId,
          job.attemptsMade,
        );
      },
      { connection, concurrency: 10 },
    );

    webhookWorker.on("failed", async (job, err) => {
      if (!job) return;
      console.error(
        `Webhook job ${job.id} failed after ${job.attemptsMade} attempts:`,
        err.message,
      );
      if (job.attemptsMade >= 5) {
        await updateDelivery(job.data.deliveryId, {
          status: "failed",
          nextRetryAt: null,
        });
      }
    });

    console.log("✅ Webhook queue initialized (BullMQ)");
  } catch {
    console.warn(
      "⚠️  Webhook queue unavailable (Redis not connected) — webhooks will be delivered synchronously",
    );
    webhookQueue = null;
  }
}

// ─── Shutdown ─────────────────────────────────────────────────────────────────
// Call from process.on("SIGTERM") in server.ts.

export async function shutdownWebhookQueue(): Promise<void> {
  try {
    if (webhookWorker) await webhookWorker.close();
    if (webhookQueue) await webhookQueue.close();
    console.log("✅ Webhook queue shut down gracefully");
  } catch (error) {
    console.error("Error shutting down webhook queue:", error);
  }
}
