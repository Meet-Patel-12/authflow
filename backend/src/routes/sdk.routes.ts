import { Router, Request, Response, NextFunction } from "express";
import { body } from "express-validator";
import { authenticateClient } from "../middlewares/authenticateClient.middleware";
import { validate } from "../middlewares/validation.middleware";
import { RedisService } from "../services/redis.service";
import {
  registerHandler,
  loginHandler,
  meHandler,
  refreshHandler,
  logoutHandler,
  verifyTokenHandler,
} from "../controllers/sdk.controller";

const router = Router();

// ─── Per-client_id Rate Limiter ───────────────────────────────────────────────
// Limits by client_id (not IP) so one misbehaving app can't abuse the API.
// Falls back silently if Redis is unavailable.

function sdkRateLimit(action: string, limit: number, windowSeconds: number) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const clientId = req.body?.client_id;
    if (!clientId) return next(); // validation will catch missing client_id

    try {
      const count = await RedisService.incrementRateLimit(
        `sdk_rl:${action}:${clientId}`,
        windowSeconds,
      );

      res.setHeader("X-RateLimit-Limit", limit);
      res.setHeader("X-RateLimit-Remaining", Math.max(0, limit - count));
      res.setHeader("X-RateLimit-Window", windowSeconds);

      if (count > limit) {
        return res.status(429).json({
          success: false,
          error: "rate_limit_exceeded",
          message: `Too many ${action} attempts. Please wait ${Math.round(windowSeconds / 60)} minutes before trying again.`,
          retryAfter: windowSeconds,
        });
      }
    } catch {
      // Redis unavailable — fail open
    }

    next();
  };
}

// ─── Shared Validation ────────────────────────────────────────────────────────

const clientCredentials = [
  body("client_id").notEmpty().withMessage("client_id is required"),
  body("client_secret").notEmpty().withMessage("client_secret is required"),
];

const passwordRules = [
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("Password must contain uppercase, lowercase, and a number"),
];

// ─── Routes ───────────────────────────────────────────────────────────────────

router.post(
  "/auth/register",
  sdkRateLimit("register", 20, 60 * 60),
  [
    ...clientCredentials,
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email required"),
    ...passwordRules,
    body("name").notEmpty().trim().withMessage("Name is required"),
    body("metadata").optional().isObject(),
  ],
  validate,
  authenticateClient,
  registerHandler,
);

router.post(
  "/auth/login",
  sdkRateLimit("login", 10, 15 * 60),
  [
    ...clientCredentials,
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  validate,
  authenticateClient,
  loginHandler,
);

router.get("/auth/me", meHandler);

router.post(
  "/auth/refresh",
  [
    ...clientCredentials,
    body("refreshToken").notEmpty().withMessage("refreshToken is required"),
  ],
  validate,
  authenticateClient,
  refreshHandler,
);

router.post(
  "/auth/logout",
  [
    ...clientCredentials,
    body("refreshToken").notEmpty().withMessage("refreshToken is required"),
  ],
  validate,
  authenticateClient,
  logoutHandler,
);

router.get("/token/verify", verifyTokenHandler);

export default router;
