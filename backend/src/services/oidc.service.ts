import jwt from "jsonwebtoken";
import crypto from "crypto";
import { ISDKUser } from "../models/sdkUser.model";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface IdTokenClaims {
  // Required OIDC claims — always present
  sub: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
  // Profile scope claims — only present when scope includes "profile"
  name?: string;
  // Email scope claims — only present when scope includes "email"
  email?: string;
  email_verified?: boolean;
}

// ─── Key loading ──────────────────────────────────────────────────────────────
//
// Keys are loaded once at startup from environment variables.
// OIDC_PRIVATE_KEY and OIDC_PUBLIC_KEY must be PEM strings with literal \n.
// See scripts/generate-oidc-keys.ts for how to generate them.
//
// If keys are missing at startup we fall back to HS256 so the server still
// boots in dev without extra setup. In production, missing keys throw.

interface OidcKeys {
  privateKey: string;
  publicKey: string;
  kid: string; // key ID — included in id_token header and jwks.json
  algorithm: "RS256" | "HS256";
}

const loadKeys = (): OidcKeys => {
  const rawPrivate = process.env.OIDC_PRIVATE_KEY;
  const rawPublic = process.env.OIDC_PUBLIC_KEY;
  const kid = process.env.OIDC_KEY_ID ?? "authflow-key-1";

  if (rawPrivate && rawPublic) {
    // Env vars store \n as literal backslash-n — restore real newlines
    return {
      privateKey: rawPrivate.replace(/\\n/g, "\n"),
      publicKey: rawPublic.replace(/\\n/g, "\n"),
      kid,
      algorithm: "RS256",
    };
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "OIDC_PRIVATE_KEY and OIDC_PUBLIC_KEY are required in production. " +
        "Run: npx ts-node scripts/generate-oidc-keys.ts",
    );
  }

  // Dev fallback — HS256 with JWT_ACCESS_SECRET
  console.warn(
    "⚠️  OIDC keys not set — using HS256 fallback. " +
      "Run scripts/generate-oidc-keys.ts to enable RS256.",
  );
  return {
    privateKey: process.env.JWT_ACCESS_SECRET!,
    publicKey: process.env.JWT_ACCESS_SECRET!,
    kid: "hs256-dev-fallback",
    algorithm: "HS256",
  };
};

// Load once at module init — not per-request
const OIDC_KEYS = loadKeys();

export const getOidcAlgorithm = () => OIDC_KEYS.algorithm;

// ─── id_token generation ─────────────────────────────────────────────────────

export const generateIdToken = (
  sdkUser: ISDKUser,
  clientId: string,
  scope: string,
  accessTokenTTL: number,
): string => {
  const now = Math.floor(Date.now() / 1000);
  const issuer = process.env.APP_URL ?? "http://localhost:3000";

  // Parse the scope string once — "openid profile email" → Set{"openid","profile","email"}
  const scopes = new Set(
    scope
      .split(" ")
      .map((s) => s.trim())
      .filter(Boolean),
  );

  const claims: IdTokenClaims = {
    // Required OIDC claims — always present regardless of scope
    sub: sdkUser._id.toString(),
    iss: issuer,
    aud: clientId,
    iat: now,
    exp: now + accessTokenTTL,

    // Profile scope — name claim
    // OIDC Core 1.0 §5.4: only include when "profile" scope was requested
    ...(scopes.has("profile") ? { name: sdkUser.name } : {}),

    // Email scope — email + email_verified claims
    // OIDC Core 1.0 §5.4: only include when "email" scope was requested
    ...(scopes.has("email")
      ? {
          email: sdkUser.email,
          email_verified: sdkUser.isEmailVerified ?? false,
        }
      : {}),
  };

  return jwt.sign(claims, OIDC_KEYS.privateKey, {
    algorithm: OIDC_KEYS.algorithm,
    keyid: OIDC_KEYS.kid,
    // exp is already in claims — do NOT pass expiresIn or jsonwebtoken
    // will overwrite it silently.
  });
};

// ─── id_token verification ───────────────────────────────────────────────────

export const verifyIdToken = (token: string): IdTokenClaims | null => {
  try {
    return jwt.verify(token, OIDC_KEYS.publicKey, {
      algorithms: [OIDC_KEYS.algorithm],
    }) as IdTokenClaims;
  } catch {
    return null;
  }
};

// ─── JWKS document ───────────────────────────────────────────────────────────
//
// Returns the public key in JWK Set format so any client can verify
// id_tokens without calling your server.
//
// For HS256 (dev fallback) there is no public key to advertise —
// returns an empty keyset. Clients fall back to userinfo_endpoint.

export const buildJWKS = () => {
  if (OIDC_KEYS.algorithm === "HS256") {
    return { keys: [] };
  }

  // Derive JWK components from the PEM public key using Node crypto.
  // This avoids any dependency on jwk-to-pem or similar — pure stdlib.
  const pubKeyObj = crypto.createPublicKey(OIDC_KEYS.publicKey);
  const jwk = pubKeyObj.export({ format: "jwk" }) as {
    kty: string;
    n: string;
    e: string;
  };

  return {
    keys: [
      {
        kty: "RSA",
        use: "sig",
        alg: "RS256",
        kid: OIDC_KEYS.kid,
        n: jwk.n, // base64url-encoded modulus
        e: jwk.e, // base64url-encoded exponent — almost always "AQAB"
      },
    ],
  };
};

// ─── OIDC discovery document ─────────────────────────────────────────────────

export const buildDiscoveryDocument = () => {
  const issuer = process.env.APP_URL ?? "http://localhost:3000";

  return {
    issuer,
    authorization_endpoint: `${issuer}/authorize`,
    token_endpoint: `${issuer}/oauth/token`,
    userinfo_endpoint: `${issuer}/api/sdk/auth/me`,
    jwks_uri: `${issuer}/.well-known/jwks.json`,
    end_session_endpoint: `${issuer}/oauth/logout`,
    scopes_supported: ["openid", "profile", "email"],
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: [OIDC_KEYS.algorithm],
    token_endpoint_auth_methods_supported: ["client_secret_post", "none"],
    claims_supported: [
      "sub",
      "iss",
      "aud",
      "iat",
      "exp",
      "name",
      "email",
      "email_verified",
    ],
    code_challenge_methods_supported: ["S256"],
  };
};
