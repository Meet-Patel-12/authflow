import { Router } from "express";
import { body, query } from "express-validator";
import { validate } from "../middlewares/validation.middleware";
import { createRateLimiter } from "../middlewares/rateLimit.middleware";

// Dedicated limiter for the hosted Universal Login endpoints.
// Much looser than authRateLimiter (5/15min) which was designed for
// platform login — developers need room to test during integration.
const universalLoginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 10 : 100,
  message: "Too many login attempts, please try again in 15 minutes",
});
import {
  authorizeHandler,
  completeLoginHandler,
  completeRegisterHandler,
  tokenHandler,
  refreshHandler,
  logoutHandler,
  appInfoHandler,
} from "../controllers/oauth2.controller";

const router = Router();

// ─── GET /authorize ───────────────────────────────────────────────────────────
// Mounted at root in app.routes.ts: app.get("/authorize", ...)
// Standard OAuth2 path — must NOT be under /api

router.get(
  "/authorize",
  [
    query("client_id").notEmpty().withMessage("client_id is required"),
    query("redirect_uri").notEmpty().withMessage("redirect_uri is required"),
    query("response_type").notEmpty().withMessage("response_type is required"),
  ],
  validate,
  authorizeHandler,
);

// ─── POST /oauth/token ────────────────────────────────────────────────────────
// Mounted at root in app.routes.ts: app.post("/oauth/token", ...)
// Standard OAuth2 path — must NOT be under /api

router.post(
  "/token",
  [
    body("grant_type").notEmpty().withMessage("grant_type is required"),
    body("code").notEmpty().withMessage("code is required"),
    body("client_id").notEmpty().withMessage("client_id is required"),
    body("redirect_uri").notEmpty().withMessage("redirect_uri is required"),
  ],
  validate,
  tokenHandler,
);

// ─── POST /api/oauth2/complete-login ─────────────────────────────────────────
// Called by YOUR hosted Universal Login page — not a public OAuth2 endpoint.
// Mounted under /api in app.routes.ts: app.use("/api/oauth2", ...)

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

// ─── POST /oauth/refresh ──────────────────────────────────────────────────────
// Mounted at root in app.routes.ts: app.post("/oauth/refresh", ...)
// Standard OAuth2 path — must NOT be under /api

router.post(
  "/refresh",
  [
    body("grant_type").notEmpty().withMessage("grant_type is required"),
    body("refresh_token").notEmpty().withMessage("refresh_token is required"),
    body("client_id").notEmpty().withMessage("client_id is required"),
  ],
  validate,
  refreshHandler,
);

// ─── POST /oauth/logout ───────────────────────────────────────────────────────
// Mounted at root in app.routes.ts: app.post("/oauth/logout", ...)
// Standard OIDC RP-Initiated Logout path — must NOT be under /api

router.post(
  "/logout",
  [
    body("client_id").notEmpty().withMessage("client_id is required"),
    body("refresh_token").notEmpty().withMessage("refresh_token is required"),
  ],
  validate,
  logoutHandler,
);

export default router;
