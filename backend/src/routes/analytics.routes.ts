import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { requireAdmin } from "../middlewares/rbac.middleware";
import {
  getDashboard,
  getPlatformUsers,
  getSDKUsers,
  getLogins,
  exportAnalytics,
} from "../controllers/analytics.controller";

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/", getDashboard);
router.get("/users", getPlatformUsers);
router.get("/sdk-users", getSDKUsers);
router.get("/logins", getLogins);
router.get("/export", exportAnalytics);

export default router;
