import { Request, Response } from "express";
import { getIpAddress, getUserAgent } from "../utils/request.util";
import { createAuditEntry } from "../repositories/audit.repository";
import {
  getPreferences,
  savePreferences,
} from "../services/notification.service";

export const getPreferencesHandler = async (req: Request, res: Response) => {
  try {
    const preferences = await getPreferences(req.user!.userId);
    res.status(200).json({ success: true, data: { preferences } });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error fetching notification preferences",
      error: error.message,
    });
  }
};

export const updatePreferencesHandler = async (req: Request, res: Response) => {
  try {
    const { userId, organizationId } = req.user!;
    const { accountActivity, securityAlerts, productUpdates, marketingEmails } =
      req.body;

    const preferences = await savePreferences(userId, {
      accountActivity,
      securityAlerts,
      productUpdates,
      marketingEmails,
    });

    await createAuditEntry({
      userId,
      organizationId,
      action: "notification_preferences_update",
      resource: "user",
      resourceId: userId,
      method: req.method,
      path: req.path,
      statusCode: 200,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
    });

    res.status(200).json({
      success: true,
      message: "Notification preferences saved",
      data: { preferences },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error saving notification preferences",
      error: error.message,
    });
  }
};
