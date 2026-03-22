import jwt, { SignOptions } from "jsonwebtoken";
import { AuthUser } from "../types/auth.types";

const accessSecret = process.env.JWT_ACCESS_SECRET as string;
const refreshSecret = process.env.JWT_REFRESH_SECRET as string;

if (!accessSecret || !refreshSecret) {
  throw new Error("JWT secrets not configured");
}

const ACCESS_EXPIRY = (process.env.JWT_ACCESS_EXPIRY ||
  "15m") as SignOptions["expiresIn"];
const REFRESH_EXPIRY = (process.env.JWT_REFRESH_EXPIRY ||
  "7d") as SignOptions["expiresIn"];

// ─── Generate ─────────────────────────────────────────────────────────────────

export const generateAccessToken = (payload: AuthUser): string =>
  jwt.sign(payload, accessSecret, { expiresIn: ACCESS_EXPIRY });

export const generateRefreshToken = (payload: AuthUser): string =>
  jwt.sign(payload, refreshSecret, { expiresIn: REFRESH_EXPIRY });

// ─── Verify ───────────────────────────────────────────────────────────────────

export const verifyAccessToken = (token: string): AuthUser | null => {
  try {
    return jwt.verify(token, accessSecret) as AuthUser;
  } catch {
    return null;
  }
};

export const verifyRefreshToken = (token: string): AuthUser | null => {
  try {
    return jwt.verify(token, refreshSecret) as AuthUser;
  } catch {
    return null;
  }
};
