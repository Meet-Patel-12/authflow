import { Router } from "express";
import { body } from "express-validator";
import { authenticate } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validation.middleware";
import { WEBHOOK_EVENTS } from "../constants/webhook.events";
import {
  listWebhooks,
  createWebhookHandler,
  getWebhook,
  updateWebhook,
  deleteWebhook,
  getDeliveries,
} from "../controllers/webhook.controller";

const router = Router();

router.use(authenticate);

const createValidation = [
  body("url")
    .notEmpty()
    .withMessage("URL is required")
    .isURL()
    .withMessage("Must be a valid URL"),
  body("events")
    .isArray({ min: 1 })
    .withMessage("At least one event is required")
    .custom((value) =>
      value.every((e: string) => WEBHOOK_EVENTS.includes(e as any)),
    )
    .withMessage("Invalid event types"),
];

router.get("/", listWebhooks);
router.post("/", createValidation, validate, createWebhookHandler);
router.get("/:id", getWebhook);
router.put("/:id", updateWebhook);
router.delete("/:id", deleteWebhook);
router.get("/:id/deliveries", getDeliveries);

export default router;
