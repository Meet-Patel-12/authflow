import { Router } from "express";
import { body } from "express-validator";
import passport, { oauthAvailable } from "../config/passport";
import { validate } from "../middlewares/validation.middleware";
import {
  authRateLimiter,
  strictAuthRateLimiter,
} from "../middlewares/rateLimit.middleware";
import {
  oauthCallback,
  requestMagicLink,
  verifyMagicLinkHandler,
} from "../controllers/oauth.controller";

const router = Router();

const NOT_CONFIGURED =
  (provider: string, vars: string) => (req: any, res: any) =>
    res.status(503).json({
      success: false,
      message: `${provider} OAuth is not configured. Please set ${vars} in environment variables.`,
    });

// ─── Google ───────────────────────────────────────────────────────────────────

if (oauthAvailable.google) {
  router.get(
    "/google",
    passport.authenticate("google", { scope: ["profile", "email"] }),
  );
  router.get(
    "/google/callback",
    passport.authenticate("google", {
      session: false,
      failureRedirect: "/login",
    }),
    oauthCallback,
  );
} else {
  router.get(
    "/google",
    NOT_CONFIGURED("Google", "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET"),
  );
}

// ─── GitHub ───────────────────────────────────────────────────────────────────

if (oauthAvailable.github) {
  router.get(
    "/github",
    passport.authenticate("github", { scope: ["user:email"] }),
  );
  router.get(
    "/github/callback",
    passport.authenticate("github", {
      session: false,
      failureRedirect: "/login",
    }),
    oauthCallback,
  );
} else {
  router.get(
    "/github",
    NOT_CONFIGURED("GitHub", "GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET"),
  );
}

// ─── Magic Link ───────────────────────────────────────────────────────────────

router.post(
  "/magic-link",
  authRateLimiter,
  [body("email").isEmail().withMessage("Please enter a valid email")],
  validate,
  requestMagicLink,
);
router.post(
  "/magic-link/verify",
  strictAuthRateLimiter,
  [body("token").notEmpty().withMessage("Token is required")],
  validate,
  verifyMagicLinkHandler,
);

export default router;
