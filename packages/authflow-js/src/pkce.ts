// ─── PKCE — Web Crypto API ────────────────────────────────────────────────────
//
// Browser-safe PKCE implementation using globalThis.crypto.subtle.
// No Node.js crypto, no Buffer, no polyfills needed.
// SubtleCrypto is available in all modern browsers and in Web Workers.

/**
 * Generates a cryptographically random code_verifier.
 * 32 random bytes → 43 base64url chars, within the RFC 7636 43–128 char range.
 */
export const generateCodeVerifier = (): string => {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return base64urlEncode(bytes);
};

/**
 * Computes code_challenge = BASE64URL(SHA256(verifier)) using SubtleCrypto.
 * Must be awaited — SubtleCrypto digest is async.
 */
export const generateCodeChallenge = async (
  codeVerifier: string,
): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
  return base64urlEncode(new Uint8Array(digest));
};

/**
 * Generates a cryptographically random state parameter for CSRF protection.
 * 16 bytes → 22 base64url chars.
 */
export const generateState = (): string => {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return base64urlEncode(bytes);
};

// ─── base64url encoding ───────────────────────────────────────────────────────
// Standard base64 with + → -, / → _, = padding stripped.
// This matches what the server's verifyPKCE() expects.

const base64urlEncode = (bytes: Uint8Array): string => {
  // btoa works on binary strings — convert Uint8Array to binary string first
  const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
};
