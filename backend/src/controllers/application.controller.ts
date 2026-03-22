import { Request, Response } from "express";
import { getIpAddress, getUserAgent } from "../utils/request.util";
import { createAuditEntry } from "../repositories/audit.repository";
import {
  listApplications,
  getApplication,
  createNewApplication,
  updateApplication,
  rotateApplicationSecret,
  deleteApplication,
} from "../services/application.service";

// ─── List ─────────────────────────────────────────────────────────────────────

export const listApplicationsHandler = async (req: Request, res: Response) => {
  try {
    const applications = await listApplications(req.user!.organizationId);
    res.status(200).json({ success: true, data: { applications } });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error fetching applications",
      error: error.message,
    });
  }
};

// ─── Get ──────────────────────────────────────────────────────────────────────

export const getApplicationHandler = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const app = await getApplication(id, req.user!.organizationId);
    if (!app) {
      return res
        .status(404)
        .json({ success: false, message: "Application not found" });
    }
    res.status(200).json({ success: true, data: { application: app } });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error fetching application",
      error: error.message,
    });
  }
};

// ─── Create ───────────────────────────────────────────────────────────────────

export const createApplicationHandler = async (req: Request, res: Response) => {
  try {
    const { userId, organizationId } = req.user!;
    const { name, type, description, logo } = req.body;

    const result = await createNewApplication(
      organizationId,
      name,
      type,
      description,
      logo,
    );

    if (!result.success) {
      return res
        .status(result.status)
        .json({ success: false, message: result.message });
    }

    await createAuditEntry({
      userId,
      organizationId,
      action: "application_created",
      resource: "application",
      resourceId: result.data.id.toString(),
      method: req.method,
      path: req.path,
      statusCode: 201,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
      metadata: { name, type },
    });

    res.status(201).json({
      success: true,
      message:
        "Application created. Copy your client_secret now — it will not be shown again.",
      data: { application: result.data },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error creating application",
      error: error.message,
    });
  }
};

// ─── Update ───────────────────────────────────────────────────────────────────

export const updateApplicationHandler = async (req: Request, res: Response) => {
  try {
    const { userId, organizationId } = req.user!;
    const {
      name,
      description,
      logo,
      allowedCallbacks,
      allowedLogoutUrls,
      allowedOrigins,
      allowedWebOrigins,
      tokenExpiry,
    } = req.body;

    const id = req.params.id as string;
    const app = await updateApplication(id, organizationId, {
      name,
      description,
      logo,
      allowedCallbacks,
      allowedLogoutUrls,
      allowedOrigins,
      allowedWebOrigins,
      tokenExpiry,
    });

    if (!app) {
      return res
        .status(404)
        .json({ success: false, message: "Application not found" });
    }

    await createAuditEntry({
      userId,
      organizationId,
      action: "application_updated",
      resource: "application",
      resourceId: id,
      method: req.method,
      path: req.path,
      statusCode: 200,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
      metadata: { changes: req.body },
    });

    res.status(200).json({
      success: true,
      message: "Application updated successfully",
      data: { application: app },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error updating application",
      error: error.message,
    });
  }
};

// ─── Rotate Secret ────────────────────────────────────────────────────────────

export const rotateSecretHandler = async (req: Request, res: Response) => {
  try {
    const { userId, organizationId } = req.user!;

    const id = req.params.id as string;
    const result = await rotateApplicationSecret(id, organizationId);
    if (!result) {
      return res
        .status(404)
        .json({ success: false, message: "Application not found" });
    }

    await createAuditEntry({
      userId,
      organizationId,
      action: "application_secret_rotated",
      resource: "application",
      resourceId: id,
      method: req.method,
      path: req.path,
      statusCode: 200,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
    });

    res.status(200).json({
      success: true,
      message:
        "Secret rotated. Copy your new client_secret now — it will not be shown again.",
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error rotating secret",
      error: error.message,
    });
  }
};

// ─── Delete ───────────────────────────────────────────────────────────────────

export const deleteApplicationHandler = async (req: Request, res: Response) => {
  try {
    const { userId, organizationId } = req.user!;
    const id = req.params.id as string;
    const app = await deleteApplication(id, organizationId);
    if (!app) {
      return res
        .status(404)
        .json({ success: false, message: "Application not found" });
    }

    await createAuditEntry({
      userId,
      organizationId,
      action: "application_deleted",
      resource: "application",
      resourceId: id,
      method: req.method,
      path: req.path,
      statusCode: 200,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
      metadata: { name: app.name },
    });

    res
      .status(200)
      .json({ success: true, message: "Application deleted successfully" });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error deleting application",
      error: error.message,
    });
  }
};
