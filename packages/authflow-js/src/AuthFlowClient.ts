import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
} from "./pkce";
import {
  saveTokens,
  loadTokens,
  clearTokens,
  saveRedirectState,
  loadRedirectState,
  clearRedirectState,
} from "./storage";
import { extractUser, isAccessTokenExpired } from "./token";
import { AuthFlowError } from "./types";
import type { AuthFlowConfig, AuthFlowUser, TokenSet } from "./types";

export class AuthFlowClient {
  private readonly domain: string;
  private readonly clientId: string;
  private readonly redirectUri: string;
  private readonly scope: string;
  private readonly storageKey: string;

  constructor(config: AuthFlowConfig) {
    if (!config.domain) throw new Error("[AuthFlow] domain is required");
    if (!config.clientId) throw new Error("[AuthFlow] clientId is required");

    // Strip trailing slash so URL building is consistent
    this.domain = config.domain.replace(/\/$/, "");
    this.clientId = config.clientId;
    this.redirectUri =
      config.redirectUri ?? `${globalThis.location.origin}/callback`;
    this.scope = config.scope ?? "openid profile email";
    this.storageKey = config.storageKey ?? "authflow";
  }

  // ─── loginWithRedirect ───────────────────────────────────────────────────────

  /**
   * Starts the Authorization Code + PKCE flow by redirecting the user to your
   * AuthFlow Universal Login page.
   *
   * Generates a code_verifier + code_challenge (PKCE) and a random state
   * parameter (CSRF protection), stores them in sessionStorage, then navigates
   * to GET /authorize on your backend.
   *
   * @param options.screen_hint  "signup" to land on the registration page instead
   * @param options.state        Additional state to round-trip through the redirect.
   *                             Merged with the internal CSRF state.
   */
  async loginWithRedirect(
    options: {
      screen_hint?: "login" | "signup";
      state?: string;
    } = {},
  ): Promise<void> {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const csrfState = generateState();

    // Persist verifier and state so handleRedirectCallback can retrieve them
    saveRedirectState(this.storageKey, {
      code_verifier: codeVerifier,
      state: csrfState,
      redirect_uri: this.redirectUri,
    });

    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: this.scope,
      state: csrfState,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    if (options.screen_hint) {
      params.set("screen_hint", options.screen_hint);
    }

    globalThis.location.href = `${this.domain}/authorize?${params.toString()}`;
  }

  // ─── handleRedirectCallback ──────────────────────────────────────────────────

  /**
   * Call this once in your /callback route.
   *
   * Reads the authorization code and state from the URL, verifies the state
   * matches (CSRF check), exchanges the code for tokens via POST /oauth/token,
   * persists the tokens, and cleans up the URL.
   *
   * Throws AuthFlowError if the callback contains an OAuth2 error, the state
   * doesn't match, or the token exchange fails.
   *
   * @returns The full TokenSet including access_token, refresh_token, id_token.
   */
  async handleRedirectCallback(): Promise<TokenSet> {
    const params = new URLSearchParams(globalThis.location.search);

    // Check for OAuth2 error response first
    const error = params.get("error");
    const errorDescription = params.get("error_description");
    if (error) {
      throw new AuthFlowError(error, errorDescription ?? undefined);
    }

    const code = params.get("code");
    const state = params.get("state");

    if (!code) {
      throw new AuthFlowError(
        "missing_code",
        "No authorization code found in the callback URL.",
      );
    }

    // Load and immediately clear the stored redirect state —
    // prevents replay attacks if this function is accidentally called twice
    const stored = loadRedirectState(this.storageKey);
    clearRedirectState(this.storageKey);

    if (!stored) {
      throw new AuthFlowError(
        "missing_state",
        "No pending login found. The redirect state was not stored or has expired.",
      );
    }

    // CSRF check — state must match what we sent
    if (state !== stored.state) {
      throw new AuthFlowError(
        "state_mismatch",
        "State parameter mismatch. This may indicate a CSRF attack.",
      );
    }

    // Exchange code for tokens
    const tokens = await this._exchangeCode({
      code,
      codeVerifier: stored.code_verifier,
      redirectUri: stored.redirect_uri,
    });

    // Persist and clean up URL
    saveTokens(this.storageKey, tokens);
    this._cleanUrl();

    return tokens;
  }

  // ─── getUser ─────────────────────────────────────────────────────────────────

  /**
   * Returns the current user decoded from the stored id_token, or null if
   * the user is not authenticated.
   *
   * Does NOT make a network request — reads from localStorage + decodes the JWT.
   * For fresh claims from the server, call getUserInfo() instead.
   */
  getUser(): AuthFlowUser | null {
    const tokens = loadTokens(this.storageKey);
    if (!tokens?.id_token) return null;
    return extractUser(tokens.id_token);
  }

  // ─── getAccessToken ──────────────────────────────────────────────────────────

  /**
   * Returns a valid access_token, automatically refreshing it if it's within
   * 60 seconds of expiring.
   *
   * Returns null if the user is not logged in or the refresh token is expired.
   *
   * This is what you should call before every API request:
   *   const token = await client.getAccessToken();
   *   fetch("/api/me", { headers: { Authorization: `Bearer ${token}` } });
   */
  async getAccessToken(): Promise<string | null> {
    const tokens = loadTokens(this.storageKey);
    if (!tokens) return null;

    if (!isAccessTokenExpired(tokens)) {
      return tokens.access_token;
    }

    // Access token is expiring — attempt silent refresh
    try {
      const refreshed = await this._refresh(tokens.refresh_token);
      saveTokens(this.storageKey, refreshed);
      return refreshed.access_token;
    } catch {
      // Refresh failed (token revoked, user logged out elsewhere, etc.)
      // Clear stale tokens so the next getUser() call returns null
      clearTokens(this.storageKey);
      return null;
    }
  }

  // ─── isAuthenticated ─────────────────────────────────────────────────────────

  /**
   * Returns true if there are stored tokens and the access_token is not expired.
   * Does not attempt a refresh — use getAccessToken() for that.
   */
  isAuthenticated(): boolean {
    const tokens = loadTokens(this.storageKey);
    if (!tokens) return false;
    return !isAccessTokenExpired(tokens);
  }

  // ─── getUserInfo ─────────────────────────────────────────────────────────────

  /**
   * Fetches fresh user claims from the server's userinfo endpoint.
   * Use this when you need up-to-date data (e.g. after a profile update).
   */
  async getUserInfo(): Promise<AuthFlowUser | null> {
    const accessToken = await this.getAccessToken();
    if (!accessToken) return null;

    const res = await fetch(`${this.domain}/api/sdk/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) return null;

    const body = await res.json();
    return body?.data?.user ?? null;
  }

  // ─── logout ──────────────────────────────────────────────────────────────────

  /**
   * Revokes the refresh_token on the server, clears all stored tokens, then
   * redirects to returnTo.
   *
   * The server-side revocation call is best-effort — if it fails (network down,
   * token already expired), local tokens are still cleared and the redirect still
   * happens. A failed revocation call is never surfaced to the user.
   *
   * @param options.returnTo  Where to redirect after logout.
   *                          Defaults to globalThis.location.origin.
   *                          Must be registered in your Application's
   *                          Allowed Logout URLs to trigger a server-side
   *                          redirect — otherwise the client handles it.
   */
  async logout(options: { returnTo?: string } = {}): Promise<void> {
    const tokens = loadTokens(this.storageKey);
    const returnTo = options.returnTo ?? globalThis.location.origin;

    // Always clear local state immediately — even if the network call fails,
    // the user is logged out from this device.
    clearTokens(this.storageKey);
    clearRedirectState(this.storageKey);

    if (tokens?.refresh_token) {
      try {
        await fetch(`${this.domain}/oauth/logout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: this.clientId,
            refresh_token: tokens.refresh_token,
            // Include access_token so the backend can blacklist it in Redis.
            // Without this, the access_token stays valid until it naturally
            // expires (up to 24h) even though the session is revoked.
            ...(tokens.access_token
              ? { access_token: tokens.access_token }
              : {}),
            // If returnTo is provided, pass it as post_logout_redirect_uri.
            // The backend validates it against allowedLogoutUrls.
            ...(options.returnTo
              ? { post_logout_redirect_uri: options.returnTo }
              : {}),
          }),
        });
      } catch {
        // Network failure or server error — local logout already done above.
        // Swallow silently; the user is already logged out on this device.
      }
    }

    globalThis.location.href = returnTo;
  }

  // ─── Private: exchange code for tokens ───────────────────────────────────────

  private async _exchangeCode(params: {
    code: string;
    codeVerifier: string;
    redirectUri: string;
  }): Promise<TokenSet> {
    const res = await fetch(`${this.domain}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code: params.code,
        client_id: this.clientId,
        redirect_uri: params.redirectUri,
        code_verifier: params.codeVerifier,
        // No client_secret — SPAs use PKCE instead
      }),
    });

    const body = await res.json();

    if (!res.ok) {
      throw new AuthFlowError(
        body?.error ?? "token_exchange_failed",
        body?.error_description ??
          `Token exchange failed with status ${res.status}`,
      );
    }

    return this._normalizeTokenResponse(body);
  }

  // ─── Private: refresh access token ───────────────────────────────────────────

  private async _refresh(refreshToken: string): Promise<TokenSet> {
    const res = await fetch(`${this.domain}/oauth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: this.clientId,
        // No client_secret — SPAs authenticate via PKCE
      }),
    });

    const body = await res.json();

    if (!res.ok) {
      throw new AuthFlowError(
        body?.error ?? "refresh_failed",
        body?.error_description ??
          `Token refresh failed with status ${res.status}`,
      );
    }

    // Refresh response doesn't include a new refresh_token —
    // keep the existing one and merge it in
    const existingTokens = loadTokens(this.storageKey);
    return this._normalizeTokenResponse({
      ...body,
      refresh_token: body.refresh_token ?? existingTokens?.refresh_token ?? "",
    });
  }

  // ─── Private: normalize token response ───────────────────────────────────────

  private _normalizeTokenResponse(body: Record<string, unknown>): TokenSet {
    const expiresIn = (body.expires_in as number) ?? 86400;
    return {
      access_token: body.access_token as string,
      refresh_token: body.refresh_token as string,
      id_token: body.id_token as string,
      token_type: (body.token_type as string) ?? "Bearer",
      expires_in: expiresIn,
      scope: (body.scope as string) ?? "openid",
      expires_at: Date.now() + expiresIn * 1000,
    };
  }

  // ─── Private: clean OAuth2 params from the URL after callback ────────────────

  private _cleanUrl(): void {
    try {
      const url = new URL(globalThis.location.href);
      url.searchParams.delete("code");
      url.searchParams.delete("state");
      url.searchParams.delete("error");
      url.searchParams.delete("error_description");
      // Replace current history entry so the back button doesn't re-trigger
      // the callback with a used (already deleted) code
      globalThis.history.replaceState({}, "", url.toString());
    } catch {
      // Ignore — URL cleanup is cosmetic
    }
  }
}
