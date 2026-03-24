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
  throw new Error("SESSION_SECRET environment variable is required.");
}

const app: Application = express();

app.set("trust proxy", 1);

app.use(requestIdMiddleware);

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
        formAction: ["'self'"],
        navigateTo: IS_PRODUCTION
          ? ["https:", "'self'"]
          : ["https:", "http:", "'self'"],
        ...(IS_PRODUCTION ? { upgradeInsecureRequests: [] } : {}),
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: "deny" },
    hsts: IS_PRODUCTION
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,
    hidePoweredBy: true,
    noSniff: true,
    referrerPolicy: { policy: "no-referrer-when-downgrade" },
    xssFilter: true,
  }),
);

// ─── CORS ─────────────────────────────────────────────────────────────────────
// In development: all origins allowed so developers can test from any localhost port.
// In production: only origins in ALLOWED_ORIGINS + FRONTEND_URL are allowed.
// Set ALLOWED_ORIGINS as a comma-separated list in your env vars to add more origins.
// Example: ALLOWED_ORIGINS=https://app.yourdomain.com,https://other.yourdomain.com

const buildAllowedOrigins = (): string[] => {
  const origins: string[] = [];

  if (process.env.ALLOWED_ORIGINS) {
    origins.push(
      ...process.env.ALLOWED_ORIGINS.split(",")
        .map((o) => o.trim())
        .filter(Boolean),
    );
  }

  if (process.env.FRONTEND_URL) {
    origins.push(process.env.FRONTEND_URL.trim());
  }

  // Common localhost ports for developer testing
  const devPorts = [3000, 3001, 4000, 4173, 5173, 5174, 8080, 8000];
  for (const port of devPorts) {
    origins.push(`http://localhost:${port}`);
    origins.push(`http://127.0.0.1:${port}`);
  }

  return [...new Set(origins)];
};

const allowedOrigins = buildAllowedOrigins();

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (!IS_PRODUCTION) return callback(null, true);
      callback(new Error(`CORS: origin '${origin}' is not allowed.`));
    },
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

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

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

app.use(passport.initialize());
app.use(passport.session());

app.use(auditLogger);

registerRoutes(app);

app.use(errorHandler);

export default app;
