// ─── Configuration ────────────────────────────────────────────────────────────

export interface AuthFlowConfig {
  /** Your AuthFlow backend domain. e.g. "https://auth.yourcompany.com" */
  domain: string;

  /** The client_id of your Application from the AuthFlow dashboard. */
  clientId: string;

  /**
   * Where AuthFlow should redirect after login.
   * Must be registered in your Application's Allowed Callback URLs.
   * Defaults to window.location.origin + "/callback"
   */
  redirectUri?: string;

  /**
   * OAuth2 scopes to request.
   * Defaults to "openid profile email"
   */
  scope?: string;

  /**
   * Key prefix used for localStorage entries.
   * Defaults to "authflow" — change if you have multiple AuthFlow instances.
   */
  storageKey?: string;
}

// ─── User ─────────────────────────────────────────────────────────────────────

export interface AuthFlowUser {
  /** SDKUser._id from your AuthFlow backend */
  sub: string;
  email: string;
  name: string;
  email_verified: boolean;
  /** Raw decoded id_token claims — includes any custom fields */
  [key: string]: unknown;
}

// ─── Tokens ───────────────────────────────────────────────────────────────────

export interface TokenSet {
  access_token: string;
  refresh_token: string;
  id_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  /** Unix timestamp (ms) when access_token expires */
  expires_at: number;
}

// ─── Redirect state ───────────────────────────────────────────────────────────

/** Stored in sessionStorage during the redirect round-trip */
export interface RedirectState {
  code_verifier: string;
  state: string;
  redirect_uri: string;
}

// ─── Errors ───────────────────────────────────────────────────────────────────

export class AuthFlowError extends Error {
  constructor(
    public readonly error: string,
    public readonly errorDescription?: string,
  ) {
    super(errorDescription ?? error);
    this.name = "AuthFlowError";
  }
}
