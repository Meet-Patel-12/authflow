/**
 * JWT decode utility - extract user from token without external library
 */

export interface JWTPayload {
  userId: string;
  email: string;
  role: "admin" | "owner" | "user" | "member";
  organizationId: string;
  iat: number;
  exp: number;
}

/**
 * Decode JWT token (without verification - client-side only)
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    // Decode payload (base64url → base64 → JSON)
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")),
    );
    return payload;
  } catch {
    return null;
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeJWT(token);
  if (!payload) return true;
  return Date.now() >= payload.exp * 1000;
}

/**
 * Extract user object from token
 */
export function getUserFromToken(
  token: string,
): Omit<JWTPayload, "iat" | "exp"> | null {
  const payload = decodeJWT(token);
  if (!payload) return null;

  return {
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    organizationId: payload.organizationId,
  };
}
