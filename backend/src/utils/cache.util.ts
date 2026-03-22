import { redis, redisAvailable } from "../config/redis";

export const isRedisAvailable = (): boolean => {
  return redisAvailable && redis !== null;
};

export const getCache = async (key: string): Promise<string | null> => {
  if (!isRedisAvailable()) return null;
  try {
    return await redis!.get(key);
  } catch {
    return null;
  }
};

export const setCache = async (
  key: string,
  value: string,
  expirySeconds?: number,
): Promise<void> => {
  if (!isRedisAvailable()) return;
  try {
    if (expirySeconds) {
      await redis!.setex(key, expirySeconds, value);
    } else {
      await redis!.set(key, value);
    }
  } catch {
    // Fail silently
  }
};

export const deleteCache = async (key: string): Promise<void> => {
  if (!isRedisAvailable()) return;
  try {
    await redis!.del(key);
  } catch {
    // Fail silently
  }
};
