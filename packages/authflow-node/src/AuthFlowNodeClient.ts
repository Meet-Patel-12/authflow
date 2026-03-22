import * as crypto from "crypto";
import * as jwtLib from "jsonwebtoken";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NodeClientConfig {
  /** Your AuthFlow backend domain. e.g. "https://auth.yourcompany.com" */
  domain: string;

  /** The client_id of your Application from the AuthFlow dashboard. */
  clientId: string;

  /**
   * The client_secret from your AuthFlow dashboard.
   * Required for regular_web server-side apps.
   * Keep this in an env var — never expose it to the browser.
   */
  clientSecret: string;

  /** Where AuthFlow should redirect after login. Must match Allowed Callback URLs. */
  redirectUri: string;

  /** OAuth2 scopes to request. Defaults to "openid profile email" */
  scope?: string;
}

export interface TokenSet {
  access_token: string;
  refresh_token: string;
  id_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  /** Unix timestamp (ms) when access_token expires — computed on receipt */
  expires_at: number;
}

export interface AuthFlowUser {
  sub: string;
  email: string;
  name: string;
  email_verified: boolean;
  [key: string]: unknown;
}

export interface AuthorizeUrlParams {
  state: string;
  codeChallenge: string;
  codeChallengeMethod: "S256";
  screen_hint?: "login" | "signup";
}

export class AuthFlowNodeError extends Error {
  constructor(
    public readonly error: string,
    public readonly errorDescription?: string,
  ) {
    super(errorDescription ?? error);
    this.name = "AuthFlowNodeError";
  }
}

// ─── PKCE helpers (Node crypto) ───────────────────────────────────────────────

export const generateCodeVerifier = (): string =>
  crypto.randomBytes(32).toString("base64url");

export const generateCodeChallenge = (verifier: string): string =>
  crypto.createHash("sha256").update(verifier).digest("base64url");

export const generateState = (): string =>
  crypto.randomBytes(16).toString("base64url");

// ─── AuthFlowNodeClient ───────────────────────────────────────────────────────

export class AuthFlowNodeClient {
  private readonly domain: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly scope: string;

  constructor(config: NodeClientConfig) {
    if (!config.domain) throw new Error("[AuthFlow] domain is required");
    if (!config.clientId) throw new Error("[AuthFlow] clientId is required");
    if (!config.clientSecret)
      throw new Error("[AuthFlow] clientSecret is required");
    if (!config.redirectUri)
      throw new Error("[AuthFlow] redirectUri is required");

    this.domain = config.domain.replace(/\/$/, "");
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.redirectUri = config.redirectUri;
    this.scope = config.scope ?? "openid profile email";
  }

  // ─── buildAuthorizeUrl ──────────────────────────────────────────────────────

  /**
   * Builds the /authorize URL to redirect the user to.
   * Call generateCodeVerifier() + generateCodeChallenge() first,
   * store the verifier in the user's session, then redirect to this URL.
   *
   * @example — Express:
   *   const verifier   = generateCodeVerifier();
   *   const challenge  = generateCodeChallenge(verifier);
   *   const state      = generateState();
   *   req.session.pkce = { verifier, state };
   *   res.redirect(client.buildAuthorizeUrl({ state, codeChallenge: challenge, codeChallengeMethod: "S256" }));
   *
   * @example — Next.js route handler:
   *   const verifier  = generateCodeVerifier();
   *   const challenge = generateCodeChallenge(verifier);
   *   const state     = generateState();
   *   cookies().set("pkce_verifier", verifier, { httpOnly: true, secure: true });
   *   cookies().set("pkce_state",    state,    { httpOnly: true, secure: true });
   *   redirect(client.buildAuthorizeUrl({ state, codeChallenge: challenge, codeChallengeMethod: "S256" }));
   */
  buildAuthorizeUrl(params: AuthorizeUrlParams): string {
    const query = new URLSearchParams({
      response_type: "code",
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: this.scope,
      state: params.state,
      code_challenge: params.codeChallenge,
      code_challenge_method: params.codeChallengeMethod,
    });

    if (params.screen_hint) {
      query.set("screen_hint", params.screen_hint);
    }

    return `${this.domain}/authorize?${query.toString()}`;
  }

  // ─── exchangeCode ───────────────────────────────────────────────────────────

  /**
   * Exchanges an authorization code for tokens.
   * Call this in your /callback route after verifying the state parameter.
   *
   * @example — Express:
   *   const { verifier, state } = req.session.pkce;
   *   if (req.query.state !== state) throw new Error("State mismatch");
   *   const tokens = await client.exchangeCode(req.query.code, verifier);
   *   req.session.tokens = tokens;
   *   res.redirect("/dashboard");
   *
   * @example — Next.js:
   *   const verifier = cookies().get("pkce_verifier")?.value;
   *   const state    = cookies().get("pkce_state")?.value;
   *   if (searchParams.get("state") !== state) throw new Error("State mismatch");
   *   const tokens = await client.exchangeCode(searchParams.get("code")!, verifier!);
   */
  async exchangeCode(code: string, codeVerifier: string): Promise<TokenSet> {
    const res = await fetch(`${this.domain}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        code_verifier: codeVerifier,
      }),
    });

    const body = (await res.json()) as Record<string, unknown>;

    if (!res.ok) {
      throw new AuthFlowNodeError(
        (body.error as string) ?? "token_exchange_failed",
        (body.error_description as string) ?? `Status ${res.status}`,
      );
    }

    return this._normalize(body);
  }

  // ─── refreshTokens ──────────────────────────────────────────────────────────

  /**
   * Exchanges a refresh_token for a new access_token.
   * Call this from your API middleware when the stored access_token is expired.
   *
   * @example — Express middleware:
   *   if (isExpired(req.session.tokens)) {
   *     req.session.tokens = await client.refreshTokens(req.session.tokens.refresh_token);
   *   }
   */
  async refreshTokens(refreshToken: string): Promise<TokenSet> {
    const res = await fetch(`${this.domain}/oauth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });

    const body = (await res.json()) as Record<string, unknown>;

    if (!res.ok) {
      throw new AuthFlowNodeError(
        (body.error as string) ?? "refresh_failed",
        (body.error_description as string) ?? `Status ${res.status}`,
      );
    }

    // Preserve the existing refresh_token if a new one wasn't issued
    return this._normalize({
      ...body,
      refresh_token: body.refresh_token ?? refreshToken,
    });
  }

  // ─── verifyIdToken ──────────────────────────────────────────────────────────

  /**
   * Decodes and verifies an id_token.
   *
   * Pass the public key PEM (from your OIDC_PUBLIC_KEY env var) for RS256.
   * Pass the shared secret (JWT_ACCESS_SECRET) for HS256 dev fallback.
   *
   * @example:
   *   const user = client.verifyIdToken(tokens.id_token, process.env.OIDC_PUBLIC_KEY!);
   */
  verifyIdToken(
    idToken: string,
    publicKeyOrSecret: string,
    options: { algorithms?: jwtLib.Algorithm[] } = {},
  ): AuthFlowUser {
    const algorithms = options.algorithms ?? ["RS256", "HS256"];

    try {
      const claims = jwtLib.verify(idToken, publicKeyOrSecret, {
        algorithms,
        audience: this.clientId,
        issuer: this.domain,
      }) as jwtLib.JwtPayload;

      return {
        sub: claims.sub!,
        email: (claims.email as string) ?? "",
        name: (claims.name as string) ?? "",
        email_verified: (claims.email_verified as boolean) ?? false,
        ...claims,
      };
    } catch (err: unknown) {
      throw new AuthFlowNodeError(
        "invalid_id_token",
        err instanceof Error ? err.message : "id_token verification failed",
      );
    }
  }

  // ─── decodeIdToken ──────────────────────────────────────────────────────────

  /**
   * Decodes an id_token WITHOUT verifying the signature.
   * Use only when you trust the token source (e.g. it just came from your own
   * /oauth/token response) and you don't have the public key available.
   */
  decodeIdToken(idToken: string): AuthFlowUser | null {
    try {
      const claims = jwtLib.decode(idToken) as jwtLib.JwtPayload | null;
      if (!claims?.sub) return null;
      return {
        sub: claims.sub,
        email: (claims.email as string) ?? "",
        name: (claims.name as string) ?? "",
        email_verified: (claims.email_verified as boolean) ?? false,
        ...claims,
      };
    } catch {
      return null;
    }
  }

  // ─── isTokenExpired ─────────────────────────────────────────────────────────

  /**
   * Returns true if the access_token is expired or within bufferSeconds of expiring.
   * Use this in middleware to decide whether to call refreshTokens().
   */
  isTokenExpired(tokens: TokenSet, bufferSeconds = 60): boolean {
    return Date.now() >= tokens.expires_at - bufferSeconds * 1000;
  }

  // ─── Private: normalize token response ───────────────────────────────────────

  private _normalize(body: Record<string, unknown>): TokenSet {
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
}
