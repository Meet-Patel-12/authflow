import { Router } from "express";
import { body } from "express-validator";
import { authenticate } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validation.middleware";
import {
  getPreferencesHandler,
  updatePreferencesHandler,
} from "../controllers/notification.controller";

const router = Router();

router.use(authenticate);

const prefsValidation = [
  body("accountActivity")
    .isBoolean()
    .withMessage("accountActivity must be a boolean"),
  body("securityAlerts")
    .isBoolean()
    .withMessage("securityAlerts must be a boolean"),
  body("productUpdates")
    .isBoolean()
    .withMessage("productUpdates must be a boolean"),
  body("marketingEmails")
    .isBoolean()
    .withMessage("marketingEmails must be a boolean"),
];

router.get("/preferences", getPreferencesHandler);
router.put("/preferences", prefsValidation, validate, updatePreferencesHandler);

export default router;
