import express, { Application } from "express";
import helmet from "helmet";
import session from "express-session";
import passport from "./config/passport";
import { auditLogger } from "./middlewares/audit.middleware";
import { errorHandler } from "./middlewares/error.middleware";
import { requestIdMiddleware } from "./middlewares/requestId.middleware";
import { registerRoutes } from "./app.routes";
import { findActiveApplicationByClientId } from "./repositories/application.repository";

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
// Dynamic CORS configuration based on application settings.
// - FRONTEND_URL is always allowed
// - Application-specific allowed origins from the database (when client_id is provided)
// - Localhost ports allowed in development
// Clients specify their application via client_id query param, body, or X-Client-Id header

const getStaticAllowedOrigins = (): string[] => {
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

const staticAllowedOrigins = getStaticAllowedOrigins();

// Custom CORS handler with dynamic application-based validation
const corsHandler = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  const origin = req.headers.origin;

  // Continue if no origin (same-origin requests)
  if (!origin) {
    return next();
  }

  // Always allow static origins
  if (staticAllowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");

    if (req.method === "OPTIONS") {
      res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      );
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-API-Key, X-Client-Id, X-Organization-Id, X-Request-Id",
      );
      return res.sendStatus(204);
    }
    return next();
  }

  // Allow all origins in development
  if (!IS_PRODUCTION) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");

    if (req.method === "OPTIONS") {
      res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      );
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-API-Key, X-Client-Id, X-Organization-Id, X-Request-Id",
      );
      return res.sendStatus(204);
    }
    return next();
  }

  // Production: Check application-specific origins
  try {
    const clientId =
      (req.query.client_id as string) ||
      (req.query.clientId as string) ||
      ((req.body as any)?.client_id as string) ||
      ((req.body as any)?.clientId as string) ||
      (req.headers["x-client-id"] as string);

    if (clientId) {
      const application = await findActiveApplicationByClientId(clientId);

      if (
        application &&
        application.allowedOrigins &&
        application.allowedOrigins.includes(origin)
      ) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Credentials", "true");

        if (req.method === "OPTIONS") {
          res.setHeader(
            "Access-Control-Allow-Methods",
            "GET, POST, PUT, PATCH, DELETE, OPTIONS",
          );
          res.setHeader(
            "Access-Control-Allow-Headers",
            "Content-Type, Authorization, X-API-Key, X-Client-Id, X-Organization-Id, X-Request-Id",
          );
          return res.sendStatus(204);
        }
        return next();
      }
    }
  } catch (err) {
    console.error("Error validating CORS origin:", err);
  }

  // Origin not allowed
  return res.status(403).json({
    error: "CORS",
    message: `Origin '${origin}' is not allowed. Please register this origin in your application settings.`,
  });
};

app.use(corsHandler);

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
