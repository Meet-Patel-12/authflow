import { Request, Response } from "express";
import {
  validateAuthorizeRequest,
  generateAuthCode,
  exchangeAuthCode,
  getPublicAppInfo,
} from "../services/oauth2.service";
import { validateClientCredentials } from "../services/applicationAuth.service";
import {
  sdkLogin,
  sdkRegister,
  sdkRefresh,
  sdkLogout,
} from "../services/sdk.service";
import {
  findActiveSDKUserById,
  createSDKSession,
  saveSDKUser,
} from "../repositories/sdk.repository";
import { findActiveApplicationByClientId } from "../repositories/application.repository";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt";
import { generateIdToken } from "../services/oidc.service";
import { getIpAddress, getUserAgent } from "../utils/request.util";
import { createAuditEntry } from "../repositories/audit.repository";

// ─── GET /authorize ───────────────────────────────────────────────────────────

export const authorizeHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const {
    client_id,
    redirect_uri,
    response_type,
    scope,
    state,
    code_challenge,
    code_challenge_method,
    screen_hint,
  } = req.query as Record<string, string>;

  const result = await validateAuthorizeRequest({
    clientId: client_id,
    redirectUri: redirect_uri,
    responseType: response_type,
    scope: scope ?? "openid",
    state,
    codeChallenge: code_challenge,
    codeChallengeMethod: code_challenge_method,
    screenHint: screen_hint,
  });

  if (!result.success) {
    res.status(400).json({
      success: false,
      error: result.error,
      error_description: result.errorDescription,
    });
    return;
  }

  // Redirect to the hosted Universal Login page on the frontend
  const loginPath =
    screen_hint === "signup" ? "/universal/signup" : "/universal/login";

  const loginUrl = new URL(
    loginPath,
    process.env.FRONTEND_URL ?? "http://localhost:5173",
  );

  loginUrl.searchParams.set("client_id", client_id);
  loginUrl.searchParams.set("redirect_uri", redirect_uri);
  loginUrl.searchParams.set("response_type", response_type);
  loginUrl.searchParams.set("scope", scope ?? "openid");
  if (state) loginUrl.searchParams.set("state", state);
  if (code_challenge)
    loginUrl.searchParams.set("code_challenge", code_challenge);
  if (code_challenge_method)
    loginUrl.searchParams.set("code_challenge_method", code_challenge_method);

  res.redirect(302, loginUrl.toString());
};

// ─── POST /api/oauth2/complete-login ──────────────────────────────────────────
// Called by the hosted Universal Login page after user submits credentials.
// Not part of the public OAuth2 spec — this is your frontend ↔ backend bridge.

export const completeLoginHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const {
      email,
      password,
      client_id,
      redirect_uri,
      scope,
      state,
      code_challenge,
      code_challenge_method,
    } = req.body;

    // Re-validate — user could tamper with hidden form fields
    const validateResult = await validateAuthorizeRequest({
      clientId: client_id,
      redirectUri: redirect_uri,
      responseType: "code",
      scope: scope ?? "openid",
      codeChallenge: code_challenge,
      codeChallengeMethod: code_challenge_method,
    });

    if (!validateResult.success) {
      res.status(400).json({
        success: false,
        error: validateResult.error,
        error_description: validateResult.errorDescription,
      });
      return;
    }

    const app = validateResult.application;
    const organizationId = app.organizationId.toString();

    // Use the existing sdkLogin — correct model, correct session, correct tokens
    const loginResult = await sdkLogin({
      organizationId,
      email,
      password,
      refreshTokenTTL: app.tokenExpiry.refreshTokenTTL,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
    });

    if (!loginResult.success) {
      res.status(loginResult.status).json({
        success: false,
        error: "access_denied",
        error_description: loginResult.message ?? "Invalid email or password.",
      });
      return;
    }

    const user = loginResult.user as any;

    const codeResult = await generateAuthCode({
      userId: user.id.toString(),
      organizationId,
      clientId: client_id,
      redirectUri: redirect_uri,
      scope: scope ?? "openid",
      codeChallenge: code_challenge,
      codeChallengeMethod: code_challenge_method,
      createdAt: Date.now(),
    });

    if (!codeResult.success) {
      res.status(500).json({
        success: false,
        error: codeResult.error,
        error_description: codeResult.errorDescription,
      });
      return;
    }

    const callbackUrl = new URL(redirect_uri);
    callbackUrl.searchParams.set("code", codeResult.code);
    if (state) callbackUrl.searchParams.set("state", state);

    await createAuditEntry({
      userId: app.organizationId,
      organizationId,
      action: "oauth2_code_issued",
      resource: "sdk_user",
      resourceId: user.id.toString(),
      method: req.method,
      path: req.path,
      statusCode: 200,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
      metadata: { clientId: client_id, scope },
    });

    res.status(200).json({
      success: true,
      redirectUrl: callbackUrl.toString(),
    });
  } catch (error: any) {
    console.error("completeLogin error:", error);
    res.status(500).json({
      success: false,
      error: "server_error",
      error_description: "Login failed.",
    });
  }
};

// ─── POST /api/oauth2/complete-register ───────────────────────────────────────
// Same flow as complete-login but creates a new SDKUser first.

export const completeRegisterHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const {
      email,
      password,
      name,
      client_id,
      redirect_uri,
      scope,
      state,
      code_challenge,
      code_challenge_method,
    } = req.body;

    const validateResult = await validateAuthorizeRequest({
      clientId: client_id,
      redirectUri: redirect_uri,
      responseType: "code",
      scope: scope ?? "openid",
      codeChallenge: code_challenge,
      codeChallengeMethod: code_challenge_method,
    });

    if (!validateResult.success) {
      res.status(400).json({
        success: false,
        error: validateResult.error,
        error_description: validateResult.errorDescription,
      });
      return;
    }

    const app = validateResult.application;
    const organizationId = app.organizationId.toString();

    const registerResult = await sdkRegister({
      organizationId,
      applicationId: app._id.toString(),
      email,
      password,
      name,
      metadata: {},
      refreshTokenTTL: app.tokenExpiry.refreshTokenTTL,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
    });

    if (!registerResult.success) {
      res.status(registerResult.status).json({
        success: false,
        error: "access_denied",
        error_description: registerResult.message,
      });
      return;
    }

    const user = registerResult.user as any;

    const codeResult = await generateAuthCode({
      userId: user.id.toString(),
      organizationId,
      clientId: client_id,
      redirectUri: redirect_uri,
      scope: scope ?? "openid",
      codeChallenge: code_challenge,
      codeChallengeMethod: code_challenge_method,
      createdAt: Date.now(),
    });

    if (!codeResult.success) {
      res.status(500).json({
        success: false,
        error: codeResult.error,
        error_description: codeResult.errorDescription,
      });
      return;
    }

    const callbackUrl = new URL(redirect_uri);
    callbackUrl.searchParams.set("code", codeResult.code);
    if (state) callbackUrl.searchParams.set("state", state);

    await createAuditEntry({
      userId: app.organizationId,
      organizationId,
      action: "oauth2_register_code_issued",
      resource: "sdk_user",
      resourceId: user.id.toString(),
      method: req.method,
      path: req.path,
      statusCode: 200,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
      metadata: { clientId: client_id, scope },
    });

    res.status(200).json({
      success: true,
      redirectUrl: callbackUrl.toString(),
    });
  } catch (error: any) {
    console.error("completeRegister error:", error);
    res.status(500).json({
      success: false,
      error: "server_error",
      error_description: "Registration failed.",
    });
  }
};

// ─── POST /oauth/token ────────────────────────────────────────────────────────
// Called by the developer's backend server — never by the browser directly.

export const tokenHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const {
      grant_type,
      code,
      client_id,
      client_secret,
      redirect_uri,
      code_verifier,
    } = req.body;

    if (grant_type !== "authorization_code") {
      res.status(400).json({
        success: false,
        error: "unsupported_grant_type",
        error_description: "Only grant_type=authorization_code is supported.",
      });
      return;
    }

    if (!code || !client_id || !redirect_uri) {
      res.status(400).json({
        success: false,
        error: "invalid_request",
        error_description: "code, client_id, and redirect_uri are required.",
      });
      return;
    }

    // Verify client_secret when provided (regular_web apps).
    // SPA apps use PKCE instead — client_secret not required for them.
    let application = null;
    if (client_secret !== undefined) {
      const clientResult = await validateClientCredentials(
        client_id,
        client_secret,
      );
      if (!clientResult.success) {
        res.status(401).json({
          success: false,
          error: "invalid_client",
          error_description: "Invalid client credentials.",
        });
        return;
      }
      application = clientResult.application;
    }

    // Exchange the code — verifies PKCE, client_id, redirect_uri, and TTL
    const exchangeResult = await exchangeAuthCode({
      code,
      clientId: client_id,
      redirectUri: redirect_uri,
      codeVerifier: code_verifier,
    });

    if (!exchangeResult.success) {
      res.status(400).json({
        success: false,
        error: exchangeResult.error,
        error_description: exchangeResult.errorDescription,
      });
      return;
    }

    const { userId, organizationId, scope } = exchangeResult.payload;

    // Load the SDKUser — correct model for developer app end-users
    const sdkUser = await findActiveSDKUserById(userId, organizationId);
    if (!sdkUser) {
      res.status(400).json({
        success: false,
        error: "invalid_grant",
        error_description:
          "User associated with this code no longer exists or is inactive.",
      });
      return;
    }

    // Load application if not already loaded (SPA path — no client_secret)
    if (!application) {
      application = await findActiveApplicationByClientId(client_id);
      if (!application) {
        res.status(400).json({
          success: false,
          error: "invalid_client",
          error_description: "Application not found.",
        });
        return;
      }
    }

    const tokenPayload = {
      userId: sdkUser._id.toString(),
      email: sdkUser.email,
      role: "sdk_user" as const,
      organizationId,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    const idToken = generateIdToken(
      sdkUser,
      client_id,
      scope,
      application.tokenExpiry?.accessTokenTTL ?? 86400,
    );

    // Create SDKSession so the refresh endpoint can validate the token.
    // Without this, sdkRefresh() looks up the session in MongoDB, finds nothing,
    // and returns "session_expired" on every refresh attempt.
    await createSDKSession({
      sdkUserId: sdkUser._id.toString(),
      organizationId,
      refreshToken,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
      expiresAt: new Date(
        Date.now() +
          (application.tokenExpiry?.refreshTokenTTL ?? 604800) * 1000,
      ),
    });

    // Update last login metadata — the completeLogin path calls sdkLogin() which
    // updates these, but tokenHandler loads the user independently so we sync here.
    sdkUser.lastLoginAt = new Date();
    sdkUser.lastLoginIp = getIpAddress(req);
    await saveSDKUser(sdkUser);

    await createAuditEntry({
      userId: application.organizationId,
      organizationId,
      action: "oauth2_token_issued",
      resource: "sdk_user",
      resourceId: sdkUser._id.toString(),
      method: req.method,
      path: req.path,
      statusCode: 200,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
      metadata: { clientId: client_id, scope },
    });

    // Standard OAuth2 token response shape
    res.status(200).json({
      access_token: accessToken,
      refresh_token: refreshToken,
      id_token: idToken,
      token_type: "Bearer",
      expires_in: application.tokenExpiry?.accessTokenTTL ?? 86400,
      scope,
    });
  } catch (error: any) {
    console.error("token exchange error:", error);
    res.status(500).json({
      success: false,
      error: "server_error",
      error_description: "Token exchange failed.",
    });
  }
};

// ─── GET /api/oauth2/app-info ─────────────────────────────────────────────────
// Public — no auth. Used by Universal Login page to show app name/logo.

export const appInfoHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { client_id } = req.query as { client_id: string };
    const result = await getPublicAppInfo(client_id);

    if (!result.success) {
      res.status(404).json({ success: false, message: result.error });
      return;
    }

    res
      .status(200)
      .json({
        success: true,
        data: { name: result.name, logo: result.logo, type: result.type },
      });
  } catch (error: any) {
    console.error("appInfo error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch app info." });
  }
};

// ─── POST /oauth/refresh ──────────────────────────────────────────────────────
//
// Standard OAuth2 refresh_token grant.
// Called by the developer's backend (or SPA via PKCE) to silently get a new
// access_token without making the user log in again.
//
// Body: {
//   grant_type:    "refresh_token",
//   refresh_token: "...",
//   client_id:     "af_xxx",
//   client_secret: "afs_xxx",   ← required for regular_web, omit for SPA/PKCE
// }

export const refreshHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { grant_type, refresh_token, client_id, client_secret } = req.body;

    if (grant_type !== "refresh_token") {
      res.status(400).json({
        success: false,
        error: "unsupported_grant_type",
        error_description: "grant_type must be refresh_token.",
      });
      return;
    }

    if (!refresh_token || !client_id) {
      res.status(400).json({
        success: false,
        error: "invalid_request",
        error_description: "refresh_token and client_id are required.",
      });
      return;
    }

    // Verify client identity.
    // regular_web apps must send client_secret.
    // SPA apps using PKCE may omit it — the refresh_token itself proves
    // the original PKCE exchange was valid.
    let application = null;
    if (client_secret !== undefined) {
      const clientResult = await validateClientCredentials(
        client_id,
        client_secret,
      );
      if (!clientResult.success) {
        res.status(401).json({
          success: false,
          error: "invalid_client",
          error_description: "Invalid client credentials.",
        });
        return;
      }
      application = clientResult.application;
    } else {
      // No secret — look up app to get org context and token TTL
      application = await findActiveApplicationByClientId(client_id);
      if (!application) {
        res.status(401).json({
          success: false,
          error: "invalid_client",
          error_description: "Unknown client_id.",
        });
        return;
      }
    }

    const organizationId = application.organizationId.toString();

    // Delegate to the existing sdkRefresh — validates the refresh token JWT,
    // checks the session is still active in the DB, and returns a new access_token
    const refreshResult = await sdkRefresh(organizationId, refresh_token);

    if (!refreshResult.success) {
      // Map internal error codes to standard OAuth2 error codes
      const errorMap: Record<string, string> = {
        invalid_token: "invalid_grant",
        session_expired: "invalid_grant",
        org_mismatch: "invalid_grant",
        user_not_found: "invalid_grant",
      };
      const oauthError = errorMap[refreshResult.error] ?? "invalid_grant";

      res.status(refreshResult.status).json({
        success: false,
        error: oauthError,
        error_description: refreshResult.message,
      });
      return;
    }

    // Load the SDKUser to mint a fresh id_token with current claims.
    // User data (name, email_verified) may have changed since original login.
    const { verifyRefreshToken } = await import("../utils/jwt");
    const decoded = verifyRefreshToken(refresh_token);
    const sdkUser = decoded
      ? await findActiveSDKUserById(decoded.userId, organizationId)
      : null;

    const idToken = sdkUser
      ? generateIdToken(
          sdkUser,
          client_id,
          "openid",
          application.tokenExpiry?.accessTokenTTL ?? 86400,
        )
      : undefined;

    await createAuditEntry({
      userId: application.organizationId,
      organizationId,
      action: "oauth2_token_refreshed",
      resource: "sdk_user",
      resourceId: decoded?.userId,
      method: req.method,
      path: req.path,
      statusCode: 200,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
      metadata: { clientId: client_id },
    });

    // Standard OAuth2 token response — note: no new refresh_token issued.
    // Refresh token rotation (issuing a new refresh_token on each use) is
    // a security improvement but requires revoking the old one atomically.
    // Add it here when ready: generate new refresh_token, revoke old session,
    // create new SDKSession, include refresh_token in response.
    res.status(200).json({
      access_token: refreshResult.accessToken,
      ...(idToken ? { id_token: idToken } : {}),
      token_type: "Bearer",
      expires_in: application.tokenExpiry?.accessTokenTTL ?? 86400,
    });
  } catch (error: any) {
    console.error("oauth2 refresh error:", error);
    res.status(500).json({
      success: false,
      error: "server_error",
      error_description: "Token refresh failed.",
    });
  }
};

// ─── POST /oauth/logout ───────────────────────────────────────────────────────
//
// Revokes the refresh_token and its associated SDKSession.
// Optionally redirects to post_logout_redirect_uri if it is registered in the
// application's allowedLogoutUrls — mirrors the OIDC RP-Initiated Logout spec.
//
// Body: {
//   client_id:                "af_xxx",
//   client_secret?:           "afs_xxx",   ← required for regular_web
//   refresh_token:            "eyJ...",
//   access_token?:            "eyJ...",    ← if provided, blacklisted in Redis
//   post_logout_redirect_uri?: "https://their-app.com/logged-out"
// }

export const logoutHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const {
      client_id,
      client_secret,
      refresh_token,
      access_token,
      post_logout_redirect_uri,
    } = req.body;

    if (!client_id || !refresh_token) {
      res.status(400).json({
        success: false,
        error: "invalid_request",
        error_description: "client_id and refresh_token are required.",
      });
      return;
    }

    // Verify client identity — same pattern as tokenHandler and refreshHandler.
    // regular_web apps must send client_secret.
    // SPA apps may omit it — the refresh_token proves the original PKCE exchange.
    let application = null;
    if (client_secret !== undefined) {
      const clientResult = await validateClientCredentials(
        client_id,
        client_secret,
      );
      if (!clientResult.success) {
        res.status(401).json({
          success: false,
          error: "invalid_client",
          error_description: "Invalid client credentials.",
        });
        return;
      }
      application = clientResult.application;
    } else {
      application = await findActiveApplicationByClientId(client_id);
      if (!application) {
        res.status(401).json({
          success: false,
          error: "invalid_client",
          error_description: "Unknown client_id.",
        });
        return;
      }
    }

    const organizationId = application.organizationId.toString();

    // Validate post_logout_redirect_uri against allowedLogoutUrls.
    // If not provided, we won't redirect — just revoke and return 200.
    // If provided but not registered, reject — same security reasoning as
    // redirect_uri validation on /authorize: never redirect to unregistered URLs.
    if (post_logout_redirect_uri) {
      const isAllowed = application.allowedLogoutUrls.includes(
        post_logout_redirect_uri,
      );
      if (!isAllowed) {
        res.status(400).json({
          success: false,
          error: "invalid_request",
          error_description: `post_logout_redirect_uri '${post_logout_redirect_uri}' is not registered for this application. Add it in your AuthFlow dashboard under Allowed Logout URLs.`,
        });
        return;
      }
    }

    // Revoke the session and optionally blacklist the access_token.
    // sdkLogout() calls revokeSDKSessionByToken (MongoDB) + blacklistToken (Redis).
    // This is fire-and-forget safe — even if the token was already revoked or
    // expired, we still return success to avoid leaking session state.
    await sdkLogout(refresh_token, organizationId, access_token);

    await createAuditEntry({
      userId: application.organizationId,
      organizationId,
      action: "oauth2_logout",
      resource: "sdk_user",
      method: req.method,
      path: req.path,
      statusCode: 200,
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
      metadata: { clientId: client_id },
    });

    // If a redirect URI was provided and validated, redirect.
    // Otherwise return 200 JSON — the client handles its own navigation.
    if (post_logout_redirect_uri) {
      res.redirect(302, post_logout_redirect_uri);
      return;
    }

    res
      .status(200)
      .json({ success: true, message: "Logged out successfully." });
  } catch (error: any) {
    console.error("oauth2 logout error:", error);
    res.status(500).json({
      success: false,
      error: "server_error",
      error_description: "Logout failed.",
    });
  }
};
