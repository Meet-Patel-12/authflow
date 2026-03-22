import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import session from "express-session";
import passport from "./config/passport";
import { auditLogger } from "./middlewares/audit.middleware";
import { errorHandler } from "./middlewares/error.middleware";
import { requestIdMiddleware } from "./middlewares/requestId.middleware";
import { registerRoutes } from "./app.routes";

const IS_PRODUCTION = process.env.NODE_ENV === "production";

if (!process.env.SESSION_SECRET) {
  throw new Error(
    "SESSION_SECRET environment variable is required. " +
      "Set it to a random string of at least 32 characters.",
  );
}

const app: Application = express();

// ─── Trust Proxy ──────────────────────────────────────────────────────────────
app.set("trust proxy", 1);

// ─── Request ID ───────────────────────────────────────────────────────────────
app.use(requestIdMiddleware);

// ─── Helmet ───────────────────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        fontSrc: ["'self'", "https:", "data:"],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        // Allow navigation to any HTTPS origin — required for the OAuth2 redirect
        // flow. After the user logs in, the universal login page does:
        //   window.location.href = "https://their-app.com/callback?code=xxx"
        // Without this, CSP blocks the navigation because their-app.com is not
        // in 'self'. Developer app origins are registered at runtime so we
        // cannot whitelist them at build time.
        // http: included in dev only — never in production.
        formAction: ["'self'"],
        navigateTo: IS_PRODUCTION
          ? ["https:", "'self'"]
          : ["https:", "http:", "'self'"],
        // Only set upgradeInsecureRequests in production — in dev it would
        // force http://localhost to https and break everything.
        ...(IS_PRODUCTION ? { upgradeInsecureRequests: [] } : {}),
      },
    },
    crossOriginEmbedderPolicy: false,
    // same-origin-allow-popups instead of same-origin.
    // The OAuth2 redirect flow navigates from your universal login page
    // (your domain) to the developer app callback (their domain).
    // "same-origin" blocks that outbound cross-origin navigation.
    // "same-origin-allow-popups" allows it while still isolating your
    // pages from being embedded or controlled by cross-origin openers.
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    // cross-origin — already correct. Lets developer apps fetch
    // /.well-known/openid-configuration and /api/oauth2/app-info from browsers.
    crossOriginResourcePolicy: { policy: "cross-origin" },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: "deny" },
    hsts: IS_PRODUCTION
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,
    hidePoweredBy: true,
    noSniff: true,
    // no-referrer-when-downgrade instead of strict-origin-when-cross-origin.
    // strict-origin-when-cross-origin strips the Referer header on cross-origin
    // navigations. Some OAuth2 client libraries (Auth.js, Passport) use it as
    // a secondary CSRF check on the callback. no-referrer-when-downgrade sends
    // the full URL on HTTPS→HTTPS cross-origin navigations, which is what the
    // callback redirect will always be in production.
    referrerPolicy: { policy: "no-referrer-when-downgrade" },
    xssFilter: true,
  }),
);

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-API-Key",
      "X-Organization-Id",
      "X-Request-Id",
    ],
  }),
);

// ─── Body Parser ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ─── Session ──────────────────────────────────────────────────────────────────
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: IS_PRODUCTION,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: IS_PRODUCTION ? "strict" : "lax",
    },
  }),
);

// ─── Passport ─────────────────────────────────────────────────────────────────
app.use(passport.initialize());
app.use(passport.session());

// ─── Audit Logger ─────────────────────────────────────────────────────────────
app.use(auditLogger);

// ─── Routes ───────────────────────────────────────────────────────────────────
registerRoutes(app);

// ─── Error Handler (must be last) ─────────────────────────────────────────────
app.use(errorHandler);

export default app;
