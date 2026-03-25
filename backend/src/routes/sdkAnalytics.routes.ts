import { Router } from "express";
import {
  getApplicationsList,
  getApplicationAnalytics,
  getAllApplicationsAnalytics,
  exportApplicationAnalytics,
} from "../controllers/sdkAnalytics.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { requireAdmin } from "../middlewares/rbac.middleware";
import { apiRateLimiter } from "../middlewares/rateLimit.middleware";

const router = Router();

// ─── Get list of applications ──────────────────────────────────────────────────
router.get(
  "/applications",
  authenticate,
  requireAdmin,
  apiRateLimiter,
  getApplicationsList,
);

// ─── Get analytics for all applications ────────────────────────────────────────
router.get(
  "/",
  authenticate,
  requireAdmin,
  apiRateLimiter,
  getAllApplicationsAnalytics,
);

// ─── Get analytics for specific application ────────────────────────────────────
router.get(
  "/:applicationId",
  authenticate,
  requireAdmin,
  apiRateLimiter,
  getApplicationAnalytics,
);

// ─── Export application analytics ──────────────────────────────────────────────
router.get(
  "/:applicationId/export",
  authenticate,
  requireAdmin,
  apiRateLimiter,
  exportApplicationAnalytics,
);

export default router;
