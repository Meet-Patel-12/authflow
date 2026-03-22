import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { requireAdmin } from "../middlewares/rbac.middleware";
import {
  getStats,
  listUsers,
  getUser,
  updateUser,
  updateUserRole,
  suspendUser,
  activateUser,
  deleteUser,
  getAuditLogEntries,
  getHealth,
} from "../controllers/admin.controller";

const router = Router();

router.use(authenticate, requireAdmin);

// ─── Stats ────────────────────────────────────────────────────────────────────
router.get("/stats", getStats);

// ─── Users ────────────────────────────────────────────────────────────────────
router.get("/users", listUsers);
router.get("/users/:id", getUser);
router.put("/users/:id", updateUser);
router.patch("/users/:id", updateUser);
router.patch("/users/:id/role", updateUserRole);
router.post("/users/:id/suspend", suspendUser);
router.post("/users/:id/activate", activateUser);
router.delete("/users/:id", deleteUser);

// ─── Audit Logs ───────────────────────────────────────────────────────────────
router.get("/audit-logs", getAuditLogEntries);

// ─── Health ───────────────────────────────────────────────────────────────────
router.get("/health", getHealth);

export default router;
