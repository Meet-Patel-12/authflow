import type { TokenSet, RedirectState } from "./types";

// ─── Storage keys ─────────────────────────────────────────────────────────────

export const keys = (prefix: string) => ({
  tokens: `${prefix}:tokens`,
  redirectState: `${prefix}:redirect_state`,
});

// ─── TokenSet ─────────────────────────────────────────────────────────────────

export const saveTokens = (prefix: string, tokens: TokenSet): void => {
  try {
    localStorage.setItem(keys(prefix).tokens, JSON.stringify(tokens));
  } catch {
    // localStorage unavailable (private browsing quota, etc.) — fail silently.
    // The user will need to re-authenticate on the next page load.
    console.warn("[AuthFlow] Could not persist tokens to localStorage.");
  }
};

export const loadTokens = (prefix: string): TokenSet | null => {
  try {
    const raw = localStorage.getItem(keys(prefix).tokens);
    return raw ? (JSON.parse(raw) as TokenSet) : null;
  } catch {
    return null;
  }
};

export const clearTokens = (prefix: string): void => {
  try {
    localStorage.removeItem(keys(prefix).tokens);
  } catch {
    /* ignore */
  }
};

// ─── Redirect state (code_verifier + state + redirect_uri) ───────────────────
// Stored in sessionStorage — scoped to the current tab and cleared on close.
// If the user opens two tabs and starts two login flows, each tab has its own
// state, preventing cross-tab PKCE verification failures.

export const saveRedirectState = (
  prefix: string,
  state: RedirectState,
): void => {
  try {
    sessionStorage.setItem(keys(prefix).redirectState, JSON.stringify(state));
  } catch {
    console.warn(
      "[AuthFlow] Could not persist redirect state to sessionStorage.",
    );
  }
};

export const loadRedirectState = (prefix: string): RedirectState | null => {
  try {
    const raw = sessionStorage.getItem(keys(prefix).redirectState);
    return raw ? (JSON.parse(raw) as RedirectState) : null;
  } catch {
    return null;
  }
};

export const clearRedirectState = (prefix: string): void => {
  try {
    sessionStorage.removeItem(keys(prefix).redirectState);
  } catch {
    /* ignore */
  }
};
