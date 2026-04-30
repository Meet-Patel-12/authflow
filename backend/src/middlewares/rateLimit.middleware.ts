import { Request, Response, NextFunction } from "express";
import {
  checkRateLimit,
  checkApiKeyRateLimit,
} from "../services/rateLimit.service";
import {
  keyGenerators,
  setRateLimitHeaders,
  setApiKeyRateLimitHeaders,
  IS_PRODUCTION,
} from "../utils/rateLimit.util";
import { RATE_LIMITS } from "../constants/constants";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export const createRateLimiter = (options: RateLimitOptions) => {
  const {
    windowMs,
    max,
    message = "Too many requests, please try again later",
    keyGenerator = keyGenerators.byIp,
  } = options;

  const windowSeconds = Math.ceil(windowMs / 1000);

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = `rateLimit:${keyGenerator(req)}`;
      const result = await checkRateLimit(key, max, windowSeconds);

      setRateLimitHeaders(res, max, result.current, windowMs);

      if (!result.allowed) {
        return res.status(429).json({
          success: false,
          message,
          retryAfter: windowSeconds,
        });
      }

      next();
    } catch (error) {
      console.error("Rate limit error:", error);
      if (IS_PRODUCTION) {
        return res
          .status(503)
          .json({ success: false, message: "Service temporarily unavailable" });
      }
      next(); // Dev: fail open if Redis is down
    }
  };
};

// ─── Predefined Limiters ──────────────────────────────────────────────────────

export const authRateLimiter = createRateLimiter({
  ...RATE_LIMITS.AUTH,
  keyGenerator: keyGenerators.byIpSuffix("auth"),
});

export const strictAuthRateLimiter = createRateLimiter({
  ...RATE_LIMITS.STRICT_AUTH,
  keyGenerator: keyGenerators.byIpSuffix("password-reset"),
});

export const apiRateLimiter = createRateLimiter({
  ...RATE_LIMITS.API,
  keyGenerator: keyGenerators.byUserOrIp,
});

// ─── API Key Rate Limiter ─────────────────────────────────────────────────────

export const apiKeyRateLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const apiKey = req.apiKey;
    if (!apiKey?.rateLimit) return next();

    const result = await checkApiKeyRateLimit(apiKey);

    setApiKeyRateLimitHeaders(
      res,
      apiKey.rateLimit.requestsPerHour,
      result.current,
      apiKey.rateLimit.requestsPerDay,
      result.dailyCurrent ?? result.current,
    );

    if (!result.allowed) {
      return res.status(429).json({
        success: false,
        message: result.message,
        limit: result.limit,
        retryAfter: result.retryAfter,
      });
    }

    next();
  } catch (error) {
    console.error("API key rate limit error:", error);
    next();
  }
};
