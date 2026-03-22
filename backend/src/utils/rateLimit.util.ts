import { Request, Response } from "express";

export const IS_PRODUCTION = process.env.NODE_ENV === "production";

// ─── Key Generators ───────────────────────────────────────────────────────────

export const keyGenerators = {
  byIp: (req: Request) => req.ip || "unknown",
  byIpSuffix: (suffix: string) => (req: Request) => `${req.ip}:${suffix}`,
  byUserOrIp: (req: Request) => {
    const userId = req.user?.userId;
    return userId ? `user:${userId}` : `ip:${req.ip}`;
  },
};

// ─── Header Setters ───────────────────────────────────────────────────────────

export const setRateLimitHeaders = (
  res: Response,
  max: number,
  current: number,
  windowMs: number,
): void => {
  res.setHeader("X-RateLimit-Limit", max);
  res.setHeader("X-RateLimit-Remaining", Math.max(0, max - current));
  res.setHeader("X-RateLimit-Reset", Date.now() + windowMs);
};

export const setApiKeyRateLimitHeaders = (
  res: Response,
  hourlyLimit: number,
  hourlyCount: number,
  dailyLimit: number,
  dailyCount: number,
): void => {
  res.setHeader("X-RateLimit-Limit-Hour", hourlyLimit);
  res.setHeader(
    "X-RateLimit-Remaining-Hour",
    Math.max(0, hourlyLimit - hourlyCount),
  );
  res.setHeader("X-RateLimit-Limit-Day", dailyLimit);
  res.setHeader(
    "X-RateLimit-Remaining-Day",
    Math.max(0, dailyLimit - dailyCount),
  );
};
