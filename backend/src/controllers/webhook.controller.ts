import { Request, Response } from "express";
import crypto from "crypto";
import {
  findOrgWebhooks,
  findOrgWebhookById,
  findOrgWebhookByIdAny,
  createWebhook,
  saveWebhook,
  deactivateWebhook,
  findDeliveries,
  countDeliveries,
} from "../repositories/webhook.repository";

// ─── List ─────────────────────────────────────────────────────────────────────

export const listWebhooks = async (req: Request, res: Response) => {
  try {
    const webhooks = await findOrgWebhooks(req.user!.organizationId);
    res.status(200).json({
      success: true,
      data: {
        webhooks: webhooks.map((w) => ({
          id: w._id,
          url: w.url,
          events: w.events,
          isActive: w.isActive,
          metadata: w.metadata,
          createdAt: w.createdAt,
        })),
      },
    });
  } catch (error: any) {
    console.error("List webhooks error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching webhooks",
      error: error.message,
    });
  }
};

// ─── Create ───────────────────────────────────────────────────────────────────

export const createWebhookHandler = async (req: Request, res: Response) => {
  try {
    const { userId, organizationId } = req.user!;
    const { url, events, metadata } = req.body;
    const secret = crypto.randomBytes(32).toString("hex");

    const webhook = await createWebhook({
      userId,
      organizationId,
      url,
      events,
      secret,
      metadata,
    });

    res.status(201).json({
      success: true,
      message: "Webhook created successfully",
      data: {
        webhook: {
          id: webhook._id,
          url: webhook.url,
          events: webhook.events,
          secret: webhook.secret, // shown once only
          metadata: webhook.metadata,
          createdAt: webhook.createdAt,
        },
      },
    });
  } catch (error: any) {
    console.error("Create webhook error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating webhook",
      error: error.message,
    });
  }
};

// ─── Get ──────────────────────────────────────────────────────────────────────

export const getWebhook = async (req: Request, res: Response) => {
  try {
    const webhook = await findOrgWebhookById(
      req.params.id as string,
      req.user!.organizationId,
    );
    if (!webhook) {
      return res
        .status(404)
        .json({ success: false, message: "Webhook not found" });
    }

    res.status(200).json({
      success: true,
      data: {
        webhook: {
          id: webhook._id,
          url: webhook.url,
          events: webhook.events,
          isActive: webhook.isActive,
          metadata: webhook.metadata,
          createdAt: webhook.createdAt,
        },
      },
    });
  } catch (error: any) {
    console.error("Get webhook error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching webhook",
      error: error.message,
    });
  }
};

// ─── Update ───────────────────────────────────────────────────────────────────

export const updateWebhook = async (req: Request, res: Response) => {
  try {
    const webhook = await findOrgWebhookByIdAny(
      req.params.id as string,
      req.user!.organizationId,
    );
    if (!webhook) {
      return res
        .status(404)
        .json({ success: false, message: "Webhook not found" });
    }

    const { url, events, isActive, metadata } = req.body;
    if (url) webhook.url = url;
    if (events) webhook.events = events;
    if (typeof isActive === "boolean") webhook.isActive = isActive;
    if (metadata) webhook.metadata = metadata;

    await saveWebhook(webhook);

    res.status(200).json({
      success: true,
      message: "Webhook updated successfully",
      data: {
        webhook: {
          id: webhook._id,
          url: webhook.url,
          events: webhook.events,
          isActive: webhook.isActive,
          metadata: webhook.metadata,
        },
      },
    });
  } catch (error: any) {
    console.error("Update webhook error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating webhook",
      error: error.message,
    });
  }
};

// ─── Delete ───────────────────────────────────────────────────────────────────

export const deleteWebhook = async (req: Request, res: Response) => {
  try {
    const webhook = await findOrgWebhookByIdAny(
      req.params.id as string,
      req.user!.organizationId,
    );
    if (!webhook) {
      return res
        .status(404)
        .json({ success: false, message: "Webhook not found" });
    }

    await deactivateWebhook(webhook);
    res
      .status(200)
      .json({ success: true, message: "Webhook deleted successfully" });
  } catch (error: any) {
    console.error("Delete webhook error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting webhook",
      error: error.message,
    });
  }
};

// ─── Deliveries ───────────────────────────────────────────────────────────────

export const getDeliveries = async (req: Request, res: Response) => {
  try {
    const { page = "1", limit = "50" } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);

    const webhook = await findOrgWebhookByIdAny(
      req.params.id as string,
      req.user!.organizationId,
    );
    if (!webhook) {
      return res
        .status(404)
        .json({ success: false, message: "Webhook not found" });
    }

    const id = req.params.id as string;
    const [deliveries, total] = await Promise.all([
      findDeliveries(id, (pageNum - 1) * limitNum, limitNum),
      countDeliveries(id),
    ]);

    res.status(200).json({
      success: true,
      data: {
        deliveries: deliveries.map((d) => ({
          id: d._id,
          event: d.event,
          status: d.status,
          attemptCount: d.attemptCount,
          response: d.response,
          lastAttemptAt: d.lastAttemptAt,
          nextRetryAt: d.nextRetryAt,
          createdAt: d.createdAt,
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error: any) {
    console.error("Get webhook deliveries error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching deliveries",
      error: error.message,
    });
  }
};
