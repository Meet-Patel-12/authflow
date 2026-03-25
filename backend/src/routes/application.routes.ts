import { Router } from "express";
import { body } from "express-validator";
import { authenticate } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/rbac.middleware";
import { validate } from "../middlewares/validation.middleware";
import {
  listApplicationsHandler,
  getApplicationHandler,
  createApplicationHandler,
  updateApplicationHandler,
  rotateSecretHandler,
  deleteApplicationHandler,
} from "../controllers/application.controller";
import {
  getAppUsersHandler,
  searchAppUsersHandler,
  addUserToAppHandler,
  removeUserFromAppHandler,
  updateAppUserRoleHandler,
  getAvailableUsersHandler,
} from "../controllers/applicationMember.controller";

const router = Router();

router.use(authenticate);

const VALID_TYPES = ["spa", "regular_web", "native", "machine_to_machine"];

const createValidation = [
  body("name").notEmpty().trim().withMessage("Application name is required"),
  body("type")
    .isIn(VALID_TYPES)
    .withMessage(`type must be one of: ${VALID_TYPES.join(", ")}`),
  body("description").optional().trim().isLength({ max: 140 }),
];

const updateValidation = [
  body("name").optional().trim().notEmpty(),
  body("description").optional().trim().isLength({ max: 140 }),
  body("allowedCallbacks").optional().isArray(),
  body("allowedLogoutUrls").optional().isArray(),
  body("allowedOrigins").optional().isArray(),
  body("allowedWebOrigins").optional().isArray(),
  body("tokenExpiry.accessTokenTTL")
    .optional()
    .isInt({ min: 300, max: 2592000 })
    .withMessage("accessTokenTTL must be between 300 and 2592000 seconds"),
  body("tokenExpiry.refreshTokenTTL")
    .optional()
    .isInt({ min: 3600, max: 31536000 })
    .withMessage("refreshTokenTTL must be between 3600 and 31536000 seconds"),
];

router.get("/", listApplicationsHandler);
router.get("/:id", getApplicationHandler);
router.post(
  "/",
  requireRole("owner", "admin"),
  createValidation,
  validate,
  createApplicationHandler,
);
router.patch(
  "/:id",
  requireRole("owner", "admin"),
  updateValidation,
  validate,
  updateApplicationHandler,
);
router.post(
  "/:id/rotate-secret",
  requireRole("owner", "admin"),
  rotateSecretHandler,
);
router.delete("/:id", requireRole("owner", "admin"), deleteApplicationHandler);

// ─── Application Members ──────────────────────────────────────────────────────

router.get("/:appId/users", getAppUsersHandler);
router.get("/:appId/users/search", searchAppUsersHandler);
router.get("/:appId/available-users", getAvailableUsersHandler);
router.post(
  "/:appId/users",
  requireRole("owner", "admin"),
  body("userId").notEmpty().withMessage("userId is required"),
  body("role").optional().isIn(["viewer", "editor", "admin"]),
  validate,
  addUserToAppHandler,
);
router.delete(
  "/:appId/users/:userId",
  requireRole("owner", "admin"),
  removeUserFromAppHandler,
);
router.patch(
  "/:appId/users/:userId",
  requireRole("owner", "admin"),
  body("role").isIn(["viewer", "editor", "admin"]).withMessage("Invalid role"),
  validate,
  updateAppUserRoleHandler,
);

export default router;
