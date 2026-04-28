// ─── Time & TTL ───────────────────────────────────────────────────────────────

export const TTL = {
  // Auth tokens
  EMAIL_VERIFICATION_TOKEN: 24 * 60 * 60 * 1000, // 24 hours
  PASSWORD_RESET_TOKEN: 1 * 60 * 60 * 1000, // 1 hour
  REFRESH_TOKEN: 7 * 24 * 60 * 60 * 1000, // 7 days
  SESSION: 24 * 60 * 60 * 1000, // 24 hours

  // MFA
  OTP_WINDOW: 2, // TOTP window tolerance (±2 steps)

  // Magic links
  MAGIC_LINK_EXPIRY: 15 * 60 * 1000, // 15 minutes

  // Webhooks
  WEBHOOK_TIMEOUT: 10_000, // 10 seconds
  WEBHOOK_RETRY_INTERVAL: 5 * 60 * 1000, // 5 minutes
  WEBHOOK_MAX_RETRIES: 5,
} as const;

// ─── Rate Limiting ────────────────────────────────────────────────────────────

export const RATE_LIMITS = {
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: "Too many login attempts, please try again in 15 minutes",
  },
  STRICT_AUTH: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: "Too many attempts, please try again in 1 hour",
  },
  API: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100,
  },
} as const;

// ─── Validation ───────────────────────────────────────────────────────────────

export const VALIDATION = {
  PASSWORD: {
    minLength: 8,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    message:
      "Password must contain at least one uppercase letter, one lowercase letter, and one number",
  },
  NAME: {
    minLength: 2,
    maxLength: 100,
  },
  EMAIL: {
    pattern: /^\S+@\S+\.\S+$/,
  },
  ORGANIZATION: {
    name: { minLength: 2, maxLength: 100 },
    slug: { minLength: 2, maxLength: 50, pattern: /^[a-z0-9-]+$/ },
  },
  API_KEY: {
    nameMaxLength: 100,
    prefixLength: 16,
  },
  MFA_TOKEN: {
    length: 6,
  },
  WEBHOOK: {
    urlMaxLength: 2048,
  },
} as const;

// ─── Pagination ───────────────────────────────────────────────────────────────

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// ─── Organization Limits ──────────────────────────────────────────────────────

export const DEFAULT_ORG_LIMITS = {
  FREE: {
    maxUsers: 5,
    maxApiKeys: 2,
    maxApiCalls: 10_000,
  },
  PRO: {
    maxUsers: 50,
    maxApiKeys: 20,
    maxApiCalls: 1_000_000,
  },
  ENTERPRISE: {
    maxUsers: Infinity,
    maxApiKeys: Infinity,
    maxApiCalls: Infinity,
  },
} as const;

// ─── Error Codes ──────────────────────────────────────────────────────────────

export const ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  AUTHENTICATION_ERROR: "AUTHENTICATION_ERROR",
  AUTHORIZATION_ERROR: "AUTHORIZATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  RATE_LIMIT_ERROR: "RATE_LIMIT_ERROR",
  DATABASE_ERROR: "DATABASE_ERROR",
  EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
