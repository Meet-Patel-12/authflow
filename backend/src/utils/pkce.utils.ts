import crypto from "crypto";

// ─── PKCE (Proof Key for Code Exchange) — RFC 7636 ───────────────────────────
//
// PKCE prevents authorization code interception attacks.
// The flow:
//
//   1. Client generates a random code_verifier (43–128 chars, URL-safe)
//   2. Client computes code_challenge = BASE64URL(SHA256(code_verifier))
//   3. Client sends code_challenge in GET /authorize
//   4. Server stores code_challenge with the auth code in Redis
//   5. Client sends code_verifier in POST /oauth/token
//   6. Server recomputes SHA256(code_verifier) and compares — must match
//
// Only S256 is supported. "plain" (no hash) is intentionally omitted —
// it provides no security benefit over not using PKCE at all.

// ─── Generate a code verifier (client-side util) ──────────────────────────────

/**
 * Generates a cryptographically random code_verifier.
 * 32 random bytes → 43 base64url chars (within the 43–128 char RFC limit).
 *
 * Use this in your SDK / frontend — never on the server.
 */
export const generateCodeVerifier = (): string => {
  return crypto.randomBytes(32).toString("base64url");
};

// ─── Derive the code challenge from a verifier (client-side util) ─────────────

/**
 * Computes code_challenge = BASE64URL(SHA256(code_verifier)).
 * Send this in the GET /authorize request as code_challenge.
 * Never send the verifier itself until POST /oauth/token.
 */
export const generateCodeChallenge = (codeVerifier: string): string => {
  return crypto.createHash("sha256").update(codeVerifier).digest("base64url");
};

// ─── Verify a verifier against a stored challenge (server-side) ───────────────

/**
 * Called in POST /oauth/token.
 * Recomputes SHA256(codeVerifier) and compares against the stored
 * codeChallenge using a timing-safe comparison.
 *
 * Returns false if:
 *   - method is not "S256"
 *   - the lengths differ (fast path before the safe comparison)
 *   - the computed hash does not match the stored challenge
 */
export const verifyPKCE = (
  codeVerifier: string,
  codeChallenge: string,
  method: string,
): boolean => {
  if (method !== "S256") return false;

  const computed = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");

  // Length check first — timingSafeEqual throws if buffers differ in length
  if (computed.length !== codeChallenge.length) return false;

  return crypto.timingSafeEqual(
    Buffer.from(computed),
    Buffer.from(codeChallenge),
  );
};

// ─── Validate a verifier's format (before attempting verification) ────────────

/**
 * Checks that a code_verifier meets the RFC 7636 character and length rules.
 * Call this before verifyPKCE() to give callers a clear error rather than
 * a silent false.
 *
 * Valid chars: A-Z a-z 0-9 - . _ ~
 * Valid length: 43–128 characters
 */
export const isValidCodeVerifier = (codeVerifier: string): boolean => {
  if (!codeVerifier) return false;
  if (codeVerifier.length < 43 || codeVerifier.length > 128) return false;
  return /^[A-Za-z0-9\-._~]+$/.test(codeVerifier);
};

/**
 * Checks that a code_challenge is a valid base64url string of the expected
 * length for a SHA-256 hash (32 bytes → 43 base64url chars, no padding).
 */
export const isValidCodeChallenge = (codeChallenge: string): boolean => {
  if (!codeChallenge) return false;
  if (codeChallenge.length !== 43) return false;
  return /^[A-Za-z0-9\-_]+$/.test(codeChallenge);
};
