import type { AuthFlowUser, TokenSet } from "./types";

// ─── JWT decode (no verification) ────────────────────────────────────────────
//
// The SDK decodes the id_token client-side to extract user claims.
// We do NOT verify the signature here — that is the job of your backend server.
// In a browser SPA, verification is only possible with RS256 (public key available
// via jwks.json). For HS256 (dev fallback), the secret must never reach the browser.
//
// Trust model: the id_token was delivered over HTTPS from your own server.
// If an attacker can MITM your HTTPS, they own the session regardless of JWT sig.

export const decodeJwt = (token: string): Record<string, unknown> | null => {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    // Base64url → base64 → JSON
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");

    // Pad to a multiple of 4 (atob requires this)
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);

    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
};

// ─── Extract AuthFlowUser from id_token claims ────────────────────────────────

export const extractUser = (idToken: string): AuthFlowUser | null => {
  const claims = decodeJwt(idToken);
  if (!claims) return null;

  // Require the standard OIDC subject claim
  if (typeof claims.sub !== "string") return null;

  return {
    sub: claims.sub,
    email: (claims.email as string) ?? "",
    name: (claims.name as string) ?? "",
    email_verified: (claims.email_verified as boolean) ?? false,
    // Spread all claims so custom fields are accessible too
    ...claims,
  };
};

// ─── Token expiry ─────────────────────────────────────────────────────────────

/**
 * Returns true if the access_token is expired or within `bufferSeconds`
 * of expiring. Default buffer is 60 seconds — enough time to make a request
 * before the token actually expires on the server.
 */
export const isAccessTokenExpired = (
  tokens: TokenSet,
  bufferSeconds = 60,
): boolean => {
  return Date.now() >= tokens.expires_at - bufferSeconds * 1000;
};
