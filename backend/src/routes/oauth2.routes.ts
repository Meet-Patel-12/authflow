import { Router } from "express";
import { body, query } from "express-validator";
import { validate } from "../middlewares/validation.middleware";
import { createRateLimiter } from "../middlewares/rateLimit.middleware";
import {
  completeLoginHandler,
  completeRegisterHandler,
  appInfoHandler,
} from "../controllers/oauth2.controller";

// Dedicated limiter for the hosted Universal Login endpoints.
// Much looser than authRateLimiter (5/15min) which was designed for
// platform login — developers need room to test during integration.
const universalLoginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 10 : 100,
  message: "Too many login attempts, please try again in 15 minutes",
});

const router = Router();

// ─── POST /api/oauth2/complete-login ─────────────────────────────────────────
// Called by YOUR hosted Universal Login page — not a public OAuth2 endpoint.

router.post(
  "/complete-login",
  universalLoginLimiter,
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email required"),
    body("password").notEmpty().withMessage("Password is required"),
    body("client_id").notEmpty().withMessage("client_id is required"),
    body("redirect_uri").notEmpty().withMessage("redirect_uri is required"),
  ],
  validate,
  completeLoginHandler,
);

// ─── POST /api/oauth2/complete-register ──────────────────────────────────────

router.post(
  "/complete-register",
  universalLoginLimiter,
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email required"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters")
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage("Password must contain uppercase, lowercase, and a number"),
    body("name").notEmpty().trim().withMessage("Name is required"),
    body("client_id").notEmpty().withMessage("client_id is required"),
    body("redirect_uri").notEmpty().withMessage("redirect_uri is required"),
  ],
  validate,
  completeRegisterHandler,
);

// ─── GET /api/oauth2/app-info ─────────────────────────────────────────────────
// Public — no auth required. Returns only name and logo.

router.get(
  "/app-info",
  [query("client_id").notEmpty().withMessage("client_id is required")],
  validate,
  appInfoHandler,
);

export default router;
