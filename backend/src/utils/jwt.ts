import dotenv from "dotenv";
import jwt, { SignOptions } from "jsonwebtoken";
import { AuthUser } from "../types/auth.types";

// Ensure dotenv is loaded
dotenv.config();

const getSecrets = () => {
  const accessSecret = process.env.JWT_ACCESS_SECRET as string;
  const refreshSecret = process.env.JWT_REFRESH_SECRET as string;

  if (!accessSecret || !refreshSecret) {
    throw new Error("JWT secrets not configured");
  }

  return { accessSecret, refreshSecret };
};

let cachedSecrets: { accessSecret: string; refreshSecret: string } | null =
  null;

const getAccessSecret = () => {
  if (!cachedSecrets) {
    cachedSecrets = getSecrets();
  }
  return cachedSecrets.accessSecret;
};

const getRefreshSecret = () => {
  if (!cachedSecrets) {
    cachedSecrets = getSecrets();
  }
  return cachedSecrets.refreshSecret;
};

const ACCESS_EXPIRY = (process.env.JWT_ACCESS_EXPIRY ||
  "15m") as SignOptions["expiresIn"];
const REFRESH_EXPIRY = (process.env.JWT_REFRESH_EXPIRY ||
  "7d") as SignOptions["expiresIn"];

// ─── Generate ─────────────────────────────────────────────────────────────────

export const generateAccessToken = (payload: AuthUser): string =>
  jwt.sign(payload, getAccessSecret(), { expiresIn: ACCESS_EXPIRY });

export const generateRefreshToken = (payload: AuthUser): string =>
  jwt.sign(payload, getRefreshSecret(), { expiresIn: REFRESH_EXPIRY });

// ─── Verify ───────────────────────────────────────────────────────────────────

export const verifyAccessToken = (token: string): AuthUser | null => {
  try {
    return jwt.verify(token, getAccessSecret()) as AuthUser;
  } catch {
    return null;
  }
};

export const verifyRefreshToken = (token: string): AuthUser | null => {
  try {
    return jwt.verify(token, getRefreshSecret()) as AuthUser;
  } catch {
    return null;
  }
};
