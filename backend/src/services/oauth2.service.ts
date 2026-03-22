import crypto from "crypto";
import { RedisService } from "./redis.service";
import { isRedisAvailable } from "../utils/cache.util";
import { findActiveApplicationByClientId } from "../repositories/application.repository";
import { IApplication } from "../models/application.model";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthorizeParams {
  clientId: string;
  redirectUri: string;
  responseType: string;
  scope: string;
  state?: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  screenHint?: string;
}

export interface AuthCodePayload {
  userId: string;
  organizationId: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  createdAt: number;
}

export type ValidateAuthorizeResult =
  | { success: true; application: IApplication }
  | { success: false; error: string; errorDescription: string };

export type GenerateAuthCodeResult =
  | { success: true; code: string }
  | { success: false; error: string; errorDescription: string };

export type ExchangeAuthCodeResult =
  | { success: true; payload: AuthCodePayload }
  | { success: false; error: string; errorDescription: string };

export type AppInfoResult =
  | { success: true; name: string; logo?: string; type: string }
  | { success: false; error: string };

// ─── Constants ────────────────────────────────────────────────────────────────

const AUTH_CODE_TTL_SECONDS = 600; // 10 minutes
const AUTH_CODE_PREFIX = "oauth2_code:";

// ─── PKCE ─────────────────────────────────────────────────────────────────────

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
  if (computed.length !== codeChallenge.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(computed),
    Buffer.from(codeChallenge),
  );
};

// ─── Validate /authorize request ──────────────────────────────────────────────

export const validateAuthorizeRequest = async (
  params: AuthorizeParams,
): Promise<ValidateAuthorizeResult> => {
  // Trim whitespace from string params before any validation.
  // Accidental spaces encoded as %20 in URLs (e.g. "code%20", "callback%20")
  // arrive here already decoded by Express — trimming catches them before
  // the === "code" check and includes() lookup would silently fail.
  const responseType = (params.responseType ?? "").trim();
  const redirectUri = (params.redirectUri ?? "").trim();
  const clientId = (params.clientId ?? "").trim();
  const scope = (params.scope ?? "openid").trim();

  // Reassign so all downstream checks use the trimmed values
  params = { ...params, responseType, redirectUri, clientId, scope };

  if (!isRedisAvailable()) {
    return {
      success: false,
      error: "server_error",
      errorDescription:
        "Authorization server temporarily unavailable. Redis is required for the OAuth2 flow.",
    };
  }

  if (params.responseType !== "code") {
    return {
      success: false,
      error: "unsupported_response_type",
      errorDescription: "Only response_type=code is supported.",
    };
  }

  if (!params.clientId) {
    return {
      success: false,
      error: "invalid_request",
      errorDescription: "client_id is required.",
    };
  }

  const application = await findActiveApplicationByClientId(params.clientId);
  if (!application) {
    return {
      success: false,
      error: "invalid_client",
      errorDescription: "Unknown or inactive client_id.",
    };
  }

  if (!params.redirectUri) {
    return {
      success: false,
      error: "invalid_request",
      errorDescription: "redirect_uri is required.",
    };
  }

  if (!application.allowedCallbacks.includes(params.redirectUri)) {
    return {
      success: false,
      error: "invalid_request",
      errorDescription: `redirect_uri '${params.redirectUri}' is not registered for this application.`,
    };
  }

  // SPAs must use PKCE
  if (application.type === "spa") {
    if (!params.codeChallenge) {
      return {
        success: false,
        error: "invalid_request",
        errorDescription:
          "code_challenge is required for SPA applications. Use PKCE with S256.",
      };
    }
    if (params.codeChallengeMethod !== "S256") {
      return {
        success: false,
        error: "invalid_request",
        errorDescription: "code_challenge_method must be S256.",
      };
    }
  }

  // If challenge provided for any app type, method must be S256
  if (params.codeChallenge && params.codeChallengeMethod !== "S256") {
    return {
      success: false,
      error: "invalid_request",
      errorDescription: "code_challenge_method must be S256.",
    };
  }

  return { success: true, application };
};

// ─── Generate one-time auth code ──────────────────────────────────────────────

export const generateAuthCode = async (
  payload: AuthCodePayload,
): Promise<GenerateAuthCodeResult> => {
  if (!isRedisAvailable()) {
    return {
      success: false,
      error: "server_error",
      errorDescription: "Authorization server temporarily unavailable.",
    };
  }

  const code = crypto.randomBytes(32).toString("hex");
  const key = `${AUTH_CODE_PREFIX}${code}`;

  try {
    await RedisService.set(key, JSON.stringify(payload), AUTH_CODE_TTL_SECONDS);
    return { success: true, code };
  } catch {
    return {
      success: false,
      error: "server_error",
      errorDescription: "Failed to store authorization code.",
    };
  }
};

// ─── Exchange code for payload (one-time use) ─────────────────────────────────

export const exchangeAuthCode = async (params: {
  code: string;
  clientId: string;
  redirectUri: string;
  codeVerifier?: string;
}): Promise<ExchangeAuthCodeResult> => {
  if (!isRedisAvailable()) {
    return {
      success: false,
      error: "server_error",
      errorDescription: "Authorization server temporarily unavailable.",
    };
  }

  const key = `${AUTH_CODE_PREFIX}${params.code}`;
  const raw = await RedisService.get(key);

  if (!raw) {
    return {
      success: false,
      error: "invalid_grant",
      errorDescription:
        "Authorization code is invalid or expired. Codes expire after 10 minutes and can only be used once.",
    };
  }

  let payload: AuthCodePayload;
  try {
    payload = JSON.parse(raw);
  } catch {
    await RedisService.delete(key);
    return {
      success: false,
      error: "server_error",
      errorDescription: "Malformed authorization code payload.",
    };
  }

  // Delete immediately — one-time use even if checks below fail
  await RedisService.delete(key);

  if (payload.clientId !== params.clientId) {
    return {
      success: false,
      error: "invalid_grant",
      errorDescription: "client_id does not match the authorization code.",
    };
  }

  if (payload.redirectUri !== params.redirectUri) {
    return {
      success: false,
      error: "invalid_grant",
      errorDescription: "redirect_uri does not match the authorization code.",
    };
  }

  if (payload.codeChallenge) {
    if (!params.codeVerifier) {
      return {
        success: false,
        error: "invalid_grant",
        errorDescription:
          "code_verifier is required. This code was created with PKCE.",
      };
    }

    const pkceValid = verifyPKCE(
      params.codeVerifier,
      payload.codeChallenge,
      payload.codeChallengeMethod ?? "S256",
    );

    if (!pkceValid) {
      return {
        success: false,
        error: "invalid_grant",
        errorDescription: "code_verifier does not match code_challenge.",
      };
    }
  }

  return { success: true, payload };
};

// ─── Public app info (for hosted login page) ──────────────────────────────────

export const getPublicAppInfo = async (
  clientId: string,
): Promise<AppInfoResult> => {
  if (!clientId) {
    return { success: false, error: "client_id is required." };
  }

  const application = await findActiveApplicationByClientId(clientId);
  if (!application) {
    return { success: false, error: "Application not found." };
  }

  return {
    success: true,
    name: application.name,
    logo: application.logo,
    type: application.type,
  };
};
