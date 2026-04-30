import { RedisService } from "./redis.service";
import { IApiKey } from "../models/apiKey.model";

export interface RateLimitResult {
  allowed: boolean;
  current: number;
  dailyCurrent?: number;
  message?: string;
  limit?: number;
  retryAfter?: number;
}
export const checkRateLimit = async (
  key: string,
  max: number,
  windowSeconds: number,
): Promise<RateLimitResult> => {
  const current = await RedisService.incrementRateLimit(key, windowSeconds);

  if (current > max) {
    return { allowed: false, current, retryAfter: windowSeconds };
  }

  return { allowed: true, current };
};

export const checkApiKeyRateLimit = async (
  apiKey: IApiKey,
): Promise<RateLimitResult> => {
  // rateLimit is optional on the model — if not set, allow the request
  if (!apiKey.rateLimit) {
    return { allowed: true, current: 0 };
  }

  const hourlyCount = await RedisService.incrementRateLimit(
    `apikey:${apiKey._id}:hourly`,
    3600,
  );
  const dailyCount = await RedisService.incrementRateLimit(
    `apikey:${apiKey._id}:daily`,
    86400,
  );

  if (hourlyCount > apiKey.rateLimit.requestsPerHour) {
    return {
      allowed: false,
      current: hourlyCount,
      message: "Hourly rate limit exceeded",
      limit: apiKey.rateLimit.requestsPerHour,
      retryAfter: 3600,
    };
  }

  if (dailyCount > apiKey.rateLimit.requestsPerDay) {
    return {
      allowed: false,
      current: dailyCount,
      message: "Daily rate limit exceeded",
      limit: apiKey.rateLimit.requestsPerDay,
      retryAfter: 86400,
    };
  }

  return { allowed: true, current: hourlyCount, dailyCurrent: dailyCount };
};
