import { Request, Response } from "express";
import { getIpAddress, getUserAgent } from "../utils/request.util";
import { createAuditEntry } from "../repositories/audit.repository";
import {
  listApiKeys,
  getApiKey,
  createNewApiKey,
  deleteApiKey,
  getUsageStats,
} from "../services/apiKey.service";

const IS_DEV = process.env.NODE_ENV === "development";

// ─── List ─────────────────────────────────────────────────────────────────────

export const listApiKeysHandler = async (req: Request, res: Response) => {
  try {
    const { userId, organizationId } = req.user!;
    const apiKeys = await listApiKeys(userId, organizationId);
    res.status(200).json({ success: true, data: { apiKeys } });
  } catch (error: any) {
    console.error("List API Keys Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching API keys",
      error: IS_DEV ? error.message : undefined,
    });
  }
};

// ─── Get ──────────────────────────────────────────────────────────────────────

export const getApiKeyHandler = async (req: Request, res: Response) => {
  try {
    const { userId, organizationId } = req.user!;
    const id = req.params.id as string;
    const apiKey = await getApiKey(id, userId, organizationId);

    if (!apiKey) {
      return res
        .status(404)
        .json({ success: false, message: "API key not found" });
    }

    res.status(200).json({ success: true, data: apiKey });
  } catch (error: any) {
    console.error("Get API Key Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching API key",
      error: IS_DEV ? error.message : undefined,
    });
  }
};

// ─── Create ───────────────────────────────────────────────────────────────────

export const createApiKeyHandler = async (req: Request, res: Response) => {
  try {
    const { userId, organizationId } = req.user!;
    const { name, permissions, expiresInDays } = req.body;

    const data = await createNewApiKey(
      userId,
      organizationId,
      name,
      permissions,
      expiresInDays,
    );

    await createAuditEntry({
      userId,
      organizationId,
      action: "api_key_create",
      resource: "api_key",
      resourceId: data.id,
      method: req.method,
      path: req.path,
      statusCode: 201,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
    });

    res.status(201).json({
      success: true,
      message:
        "API key created successfully. Save it now — it will not be shown again.",
      data,
    });
  } catch (error: any) {
    console.error("API Key Creation Error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating API key",
      error: IS_DEV ? error.message : undefined,
    });
  }
};

// ─── Delete ───────────────────────────────────────────────────────────────────

export const deleteApiKeyHandler = async (req: Request, res: Response) => {
  try {
    const { userId, organizationId } = req.user!;
    const id = req.params.keyId as string;

    const deleted = await deleteApiKey(id, userId, organizationId);
    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: "API key not found" });
    }

    await createAuditEntry({
      userId,
      organizationId,
      action: "api_key_delete",
      resource: "api_key",
      resourceId: id,
      method: req.method,
      path: req.path,
      statusCode: 200,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
    });

    res
      .status(200)
      .json({ success: true, message: "API key deleted successfully" });
  } catch (error: any) {
    console.error("API Key Deletion Error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting API key",
      error: IS_DEV ? error.message : undefined,
    });
  }
};

// ─── Usage ────────────────────────────────────────────────────────────────────

export const getApiKeyUsageHandler = async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.user!;
    const data = await getUsageStats(organizationId);
    res.status(200).json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error fetching usage",
      error: IS_DEV ? error.message : undefined,
    });
  }
};
