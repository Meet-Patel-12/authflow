import express, { Application } from "express";
import helmet from "helmet";
import session from "express-session";
import passport from "./config/passport";
import { auditLogger } from "./middlewares/audit.middleware";
import { errorHandler } from "./middlewares/error.middleware";
import { requestIdMiddleware } from "./middlewares/requestId.middleware";
import { registerRoutes } from "./app.routes";
import {
  findActiveApplicationByClientId,
  findApplicationByOrigin,
} from "./repositories/application.repository";

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
  }),
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// ─── CORS ─────────────────────────────────────────────────────────────────────

const getStaticAllowedOrigins = (): string[] => {
  const raw = [
    ...(process.env.ALLOWED_ORIGINS?.split(",") ?? []),
    process.env.FRONTEND_URL ?? "",
  ];
  return [...new Set(raw.map((o) => o.trim()).filter(Boolean))];
};

const staticAllowedOrigins = getStaticAllowedOrigins();

const applyCors = (
  res: express.Response,
  origin: string,
  isOptions: boolean,
) => {
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  if (isOptions) {
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-API-Key, X-Client-Id, X-Organization-Id, X-Request-Id",
    );
  }
};

// Custom CORS handler with dynamic application-based validation
const corsHandler = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  const origin = req.headers.origin;

  // Continue if no origin (same-origin requests)
  if (!origin) return next();

  const isOptions = req.method === "OPTIONS";
  const allow = () => {
    applyCors(res, origin, isOptions);
    return isOptions ? res.sendStatus(204) : next();
  };

  // Always allow static origins
  if (staticAllowedOrigins.includes(origin) || !IS_PRODUCTION) return allow();

  // Production: Check application-specific origins
  try {
    const clientId =
      (req.query.client_id as string) ||
      (req.query.clientId as string) ||
      (req.body?.client_id as string) ||
      (req.body?.clientId as string) ||
      (req.headers["x-client-id"] as string);

    const application = clientId
      ? await findActiveApplicationByClientId(clientId)
      : await findApplicationByOrigin(origin);

    if (application?.allowedOrigins?.includes(origin)) return allow();
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
