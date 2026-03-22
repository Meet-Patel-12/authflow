import { Request, Response } from "express";
import {
  getDashboardAnalytics,
  getPlatformUserGrowthData,
  getSDKUserGrowthData,
  getLoginActivityData,
  getExportData,
  buildCSV,
} from "../services/analytics.service";

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const getDashboard = async (req: Request, res: Response) => {
  try {
    const { period = "30d" } = req.query;
    const data = await getDashboardAnalytics(
      req.user!.organizationId,
      period as string,
    );
    res.status(200).json({ success: true, data });
  } catch (error: any) {
    console.error("Get analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching analytics",
      error: error.message,
    });
  }
};

// ─── User Growth ──────────────────────────────────────────────────────────────

export const getPlatformUsers = async (req: Request, res: Response) => {
  try {
    const { period = "30d" } = req.query;
    const data = await getPlatformUserGrowthData(
      req.user!.organizationId,
      period as string,
    );
    res.status(200).json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error fetching user growth data",
      error: error.message,
    });
  }
};

export const getSDKUsers = async (req: Request, res: Response) => {
  try {
    const { period = "30d" } = req.query;
    const data = await getSDKUserGrowthData(
      req.user!.organizationId,
      period as string,
    );
    res.status(200).json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error fetching SDK user growth data",
      error: error.message,
    });
  }
};

// ─── Login Activity ───────────────────────────────────────────────────────────

export const getLogins = async (req: Request, res: Response) => {
  try {
    const { period = "30d" } = req.query;
    const data = await getLoginActivityData(
      req.user!.organizationId,
      period as string,
    );
    res.status(200).json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error fetching login activity",
      error: error.message,
    });
  }
};

// ─── Export ───────────────────────────────────────────────────────────────────

export const exportAnalytics = async (req: Request, res: Response) => {
  try {
    const { period = "30d", format = "csv" } = req.query;
    const data = await getExportData(
      req.user!.organizationId,
      period as string,
    );

    if (format === "json") {
      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=analytics-${period}.json`,
      );
      return res.send(JSON.stringify(data, null, 2));
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=analytics-${period}.csv`,
    );
    res.send(buildCSV(data));
  } catch (error: any) {
    console.error("Export analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Error exporting analytics",
      error: error.message,
    });
  }
};
