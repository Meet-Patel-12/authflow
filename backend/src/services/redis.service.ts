import { redis } from "../config/redis";
import {
  isRedisAvailable,
  getCache,
  setCache,
  deleteCache,
} from "../utils/cache.util";

export class RedisService {
  // ─── Availability ────────────────────────────────────────────────────────────

  static isAvailable(): boolean {
    return isRedisAvailable();
  }

  // ─── Generic Cache ───────────────────────────────────────────────────────────

  static async get(key: string): Promise<string | null> {
    return getCache(key);
  }

  static async set(
    key: string,
    value: string,
    expirySeconds?: number,
  ): Promise<void> {
    return setCache(key, value, expirySeconds);
  }

  static async delete(key: string): Promise<void> {
    return deleteCache(key);
  }

  // ─── Rate Limiting ───────────────────────────────────────────────────────────

  static async incrementRateLimit(
    key: string,
    windowSeconds: number,
  ): Promise<number> {
    if (!isRedisAvailable()) return 1; // No enforcement without Redis
    try {
      const current = await redis!.incr(key);
      if (current === 1) {
        await redis!.expire(key, windowSeconds);
      }
      return current;
    } catch {
      return 0; // Allow request on error
    }
  }

  static async getRateLimit(key: string): Promise<number> {
    if (!isRedisAvailable()) return 0;
    try {
      const value = await redis!.get(key);
      return value ? parseInt(value) : 0;
    } catch {
      return 0;
    }
  }

  // ─── Session Management ──────────────────────────────────────────────────────

  static async setSession(
    sessionId: string,
    data: any,
    expirySeconds: number,
  ): Promise<void> {
    return setCache(
      `session:${sessionId}`,
      JSON.stringify(data),
      expirySeconds,
    );
  }

  static async getSession(sessionId: string): Promise<any | null> {
    const data = await getCache(`session:${sessionId}`);
    try {
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  static async deleteSession(sessionId: string): Promise<void> {
    return deleteCache(`session:${sessionId}`);
  }

  // ─── Token Blacklist ─────────────────────────────────────────────────────────

  static async blacklistToken(
    token: string,
    expirySeconds: number,
  ): Promise<void> {
    return setCache(`blacklist:${token}`, "1", expirySeconds);
  }

  static async isTokenBlacklisted(token: string): Promise<boolean> {
    const result = await getCache(`blacklist:${token}`);
    return result === "1";
  }

  // ─── Email Verification ──────────────────────────────────────────────────────

  static async setEmailVerificationToken(
    email: string,
    token: string,
    expirySeconds: number,
  ): Promise<void> {
    return setCache(`email_verify:${email}`, token, expirySeconds);
  }

  static async getEmailVerificationToken(
    email: string,
  ): Promise<string | null> {
    return getCache(`email_verify:${email}`);
  }

  static async deleteEmailVerificationToken(email: string): Promise<void> {
    return deleteCache(`email_verify:${email}`);
  }

  // ─── Password Reset ──────────────────────────────────────────────────────────

  static async setPasswordResetToken(
    email: string,
    token: string,
    expirySeconds: number,
  ): Promise<void> {
    return setCache(`password_reset:${email}`, token, expirySeconds);
  }

  static async getPasswordResetToken(email: string): Promise<string | null> {
    return getCache(`password_reset:${email}`);
  }

  static async deletePasswordResetToken(email: string): Promise<void> {
    return deleteCache(`password_reset:${email}`);
  }

  // ─── Magic Link ──────────────────────────────────────────────────────────────

  static async setMagicLinkToken(
    token: string,
    email: string,
    expirySeconds: number,
  ): Promise<void> {
    return setCache(`magic_link:${token}`, email, expirySeconds);
  }

  static async getMagicLinkToken(token: string): Promise<string | null> {
    return getCache(`magic_link:${token}`);
  }

  static async deleteMagicLinkToken(token: string): Promise<void> {
    return deleteCache(`magic_link:${token}`);
  }

  // ─── MFA ─────────────────────────────────────────────────────────────────────

  static async setMFACode(
    userId: string,
    code: string,
    expirySeconds: number,
  ): Promise<void> {
    return setCache(`mfa_code:${userId}`, code, expirySeconds);
  }

  static async getMFACode(userId: string): Promise<string | null> {
    return getCache(`mfa_code:${userId}`);
  }

  static async deleteMFACode(userId: string): Promise<void> {
    return deleteCache(`mfa_code:${userId}`);
  }
}
