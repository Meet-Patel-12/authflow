import { Request, Response } from "express";
import { Types } from "mongoose";
import sdkAnalyticsService from "../services/sdkAnalytics.service";

export async function getApplicationsList(req: Request, res: Response) {
  try {
    const organizationId = req.user!.organizationId;

    const applications =
      await sdkAnalyticsService.getApplicationsList(organizationId);

    res.status(200).json({
      success: true,
      data: applications,
    });
  } catch (error) {
    console.error("GET /applications error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch applications",
    });
  }
}

export async function getApplicationAnalytics(req: Request, res: Response) {
  try {
    const organizationId = req.user!.organizationId;
    const appIdParam = req.params.applicationId;
    const applicationId = Array.isArray(appIdParam)
      ? appIdParam[0]
      : appIdParam;

    if (!Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid application ID",
      });
    }

    const data = await sdkAnalyticsService.getApplicationAnalytics(
      organizationId,
      applicationId,
    );

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error("GET /analytics/:applicationId error:", error);
    if (error.message === "Application not found") {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to fetch analytics",
    });
  }
}

export async function getAllApplicationsAnalytics(req: Request, res: Response) {
  try {
    const organizationId = req.user!.organizationId;

    const data =
      await sdkAnalyticsService.getAllApplicationsAnalytics(organizationId);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("GET /analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch analytics",
    });
  }
}

export async function exportApplicationAnalytics(req: Request, res: Response) {
  try {
    const organizationId = req.user!.organizationId;
    const appIdParam = req.params.applicationId;
    const applicationId = Array.isArray(appIdParam)
      ? appIdParam[0]
      : appIdParam;
    const formatQuery = req.query.format;
    const format = Array.isArray(formatQuery)
      ? formatQuery[0]
      : formatQuery || "csv";

    if (!Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid application ID",
      });
    }

    if (!["csv", "json"].includes(format as string)) {
      return res.status(400).json({
        success: false,
        message: "Format must be csv or json",
      });
    }

    const data = await sdkAnalyticsService.exportApplicationAnalytics(
      organizationId,
      applicationId,
      format as "csv" | "json",
    );

    const contentType = format === "csv" ? "text/csv" : "application/json";
    const filename = `sdk-analytics-${new Date().toISOString()}.${format === "csv" ? "csv" : "json"}`;

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(data);
  } catch (error: any) {
    console.error("GET /analytics/:applicationId/export error:", error);
    if (error.message === "Application not found") {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to export analytics",
    });
  }
}
