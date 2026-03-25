import { Application, Request, Response } from "express";
import { apiRateLimiter } from "./middlewares/rateLimit.middleware";
import { API_DOCS } from "./app.docs";

// Route modules
import authRoutes from "./routes/auth.routes";
import oauthRoutes from "./routes/oauth.routes";
import oauth2Routes from "./routes/oauth2.routes";
import mfaRoutes from "./routes/mfa.routes";
import apiKeyRoutes from "./routes/apiKey.routes";
import organizationRoutes from "./routes/organization.routes";
import webhookRoutes from "./routes/webhook.routes";
import adminRoutes from "./routes/admin.routes";
import sdkAnalyticsRoutes from "./routes/sdkAnalytics.routes";
import notificationRoutes from "./routes/notification.routes";
import applicationRoutes from "./routes/application.routes";
import sdkRoutes from "./routes/sdk.routes";

// Inline public handlers
import { validateMFA } from "./services/mfa.validate.service";
import { lookupInvitation } from "./services/Invitation.lookup.service";
import {
  authorizeHandler,
  tokenHandler,
  refreshHandler,
  logoutHandler,
} from "./controllers/oauth2.controller";
import { discoveryHandler, jwksHandler } from "./controllers/oidc.controller";

export function registerRoutes(app: Application): void {
  // ─── Health ─────────────────────────────────────────────────────────────────
  app.get("/health", (req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      message: "Server is running",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
    });
  });

  // ─── Docs ────────────────────────────────────────────────────────────────────
  app.get("/docs", (_req: Request, res: Response) =>
    res.status(200).json(API_DOCS),
  );

  // ─── OAuth2 root-level endpoints (must NOT be under /api) ────────────────────
  app.get("/authorize", authorizeHandler);
  app.post("/oauth/token", tokenHandler);
  app.post("/oauth/refresh", refreshHandler);
  app.post("/oauth/logout", logoutHandler);

  // ─── OIDC discovery (must be at root — standard paths clients expect) ─────────
  app.get("/.well-known/openid-configuration", discoveryHandler);
  app.get("/.well-known/jwks.json", jwksHandler);

  // ─── Public Auth ─────────────────────────────────────────────────────────────
  app.use("/api/auth", authRoutes);
  app.use("/api/auth", oauthRoutes);

  // ─── OAuth2 API routes (frontend-facing: complete-login, app-info) ────────────
  app.use("/api/oauth2", oauth2Routes);

  // ─── Public MFA validate (called post-login when MFA is required) ────────────
  app.post("/api/mfa/validate", validateMFA);

  // ─── Public invite lookup (frontend reads invite details before login) ────────
  app.get("/api/organizations/invite/:token", lookupInvitation);

  // ─── Protected Routes ────────────────────────────────────────────────────────
  app.use("/api/mfa", apiRateLimiter, mfaRoutes);
  app.use("/api/api-keys", apiRateLimiter, apiKeyRoutes);
  app.use("/api/organizations", apiRateLimiter, organizationRoutes);
  app.use("/api/webhooks", apiRateLimiter, webhookRoutes);
  app.use("/api/admin", apiRateLimiter, adminRoutes);
  app.use("/api/admin/sdk-analytics", apiRateLimiter, sdkAnalyticsRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/applications", apiRateLimiter, applicationRoutes);
  app.use("/api/sdk", apiRateLimiter, sdkRoutes);

  // ─── 404 ─────────────────────────────────────────────────────────────────────
  app.use((req: Request, res: Response) => {
    res
      .status(404)
      .json({ success: false, message: "Route not found", path: req.path });
  });
}
