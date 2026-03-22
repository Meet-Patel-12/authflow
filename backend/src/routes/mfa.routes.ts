import { Router } from "express";
import { body } from "express-validator";
import { authenticate } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validation.middleware";
import {
  setupMFA,
  verifyMFA,
  activateMFAHandler,
  disableMFAHandler,
  regenerateBackupCodesHandler,
} from "../controllers/mfa.controller";

const router = Router();

router.use(authenticate);

const tokenValidation = [
  body("token")
    .notEmpty()
    .withMessage("Token is required")
    .isLength({ min: 6, max: 6 })
    .withMessage("Token must be 6 digits"),
];

router.post("/setup", setupMFA);
router.post("/verify", tokenValidation, validate, verifyMFA);
router.post("/activate", activateMFAHandler);
router.post("/disable", tokenValidation, validate, disableMFAHandler);
router.post(
  "/backup-codes",
  tokenValidation,
  validate,
  regenerateBackupCodesHandler,
);

export default router;
