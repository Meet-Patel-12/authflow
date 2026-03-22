import { Router } from "express";
import { body } from "express-validator";
import { authenticate } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validation.middleware";
import { requireRole } from "../middlewares/rbac.middleware";
import {
  listApiKeysHandler,
  getApiKeyHandler,
  createApiKeyHandler,
  deleteApiKeyHandler,
  getApiKeyUsageHandler,
} from "../controllers/apiKey.controller";

const router = Router();

const VALID_PERMISSIONS = ["read", "write", "delete", "admin"];

const createApiKeyValidation = [
  body("name")
    .notEmpty()
    .withMessage("API key name is required")
    .trim()
    .isLength({ max: 100 })
    .withMessage("Name cannot exceed 100 characters"),
  body("permissions")
    .isArray({ min: 1 })
    .withMessage("At least one permission is required")
    .custom((value) =>
      value.every((p: string) => VALID_PERMISSIONS.includes(p)),
    )
    .withMessage("Invalid permissions"),
];

router.get("/", authenticate, listApiKeysHandler);
router.get("/usage", authenticate, getApiKeyUsageHandler);
router.get("/:id", authenticate, getApiKeyHandler);
router.post(
  "/",
  authenticate,
  requireRole("owner", "admin"),
  createApiKeyValidation,
  validate,
  createApiKeyHandler,
);
router.delete("/:keyId", authenticate, deleteApiKeyHandler);

export default router;
