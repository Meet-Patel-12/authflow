# @meet_patel_03/authflow-js

Vanilla JS/TypeScript SDK for AuthFlow — Authorization Code + PKCE flow for browser SPAs. Implements OAuth2/OIDC with PKCE security, automatic token refresh, and localStorage persistence.

## Installation

```bash
npm install @meet_patel_03/authflow-js
```

## Quick start

```ts
import { AuthFlowClient, AuthFlowError } from "@meet_patel_03/authflow-js";

const auth = new AuthFlowClient({
  domain: "https://your-authflow-domain.com",
  clientId: "af_your_client_id",
  redirectUri: "https://your-app.com/callback",
});

// Login button — redirects to AuthFlow Universal Login
try {
  await auth.loginWithRedirect();
  // Optionally, land on signup page: await auth.loginWithRedirect({ screen_hint: "signup" });
} catch (err) {
  console.error("Login failed:", err);
}

// In your /callback route — exchanges authorization code for tokens
try {
  const tokens = await auth.handleRedirectCallback();
  console.log("Logged in! Access token:", tokens.access_token);
} catch (err) {
  if (err instanceof AuthFlowError) {
    console.error("OAuth error:", err.error, err.errorDescription);
  }
}

// Check authentication status
if (auth.isAuthenticated()) {
  console.log("User is logged in");
}

// Read the current user from id_token (no network call)
const user = auth.getUser();
// { sub, email, name, email_verified, ...customFields }

// Get a valid access token (auto-refreshes if within 60s of expiry)
const token = await auth.getAccessToken();

// Use in API calls
const res = await fetch("/api/me", {
  headers: { Authorization: `Bearer ${token}` },
});

// Fetch fresh user data from the server
const freshUser = await auth.getUserInfo();

// Logout (revokes refresh token + clears localStorage)
await auth.logout({ returnTo: "https://your-app.com" });
```

## Configuration

| Option        | Required | Default                              | Description                                                                          |
| ------------- | -------- | ------------------------------------ | ------------------------------------------------------------------------------------ |
| `domain`      | Yes      | —                                    | Your AuthFlow backend URL (e.g. `https://auth.yourcompany.com`)                      |
| `clientId`    | Yes      | —                                    | Application `client_id` from the AuthFlow dashboard                                  |
| `redirectUri` | No       | `window.location.origin + /callback` | OAuth2 redirect URI. Must match an entry in your Application's Allowed Callback URLs |
| `scope`       | No       | `openid profile email`               | Space-separated OAuth2 scopes to request                                             |
| `storageKey`  | No       | `authflow`                           | localStorage key prefix. Change if you have multiple AuthFlow instances              |

## API

### `loginWithRedirect(options?)`

Initiates the Authorization Code + PKCE flow. Generates a PKCE code verifier/challenge and CSRF state token, stores them in sessionStorage, then redirects the user to your AuthFlow Universal Login page.

**Parameters:**

- `options.screen_hint` — `"signup"` to show the registration page, or omit/`"login"` for login (default)
- `options.state` — Custom state to round-trip (merged with internal CSRF state)

**Throws:** `AuthFlowError` if domain or clientId are not configured.

```ts
await auth.loginWithRedirect(); // Shows login page
await auth.loginWithRedirect({ screen_hint: "signup" }); // Shows signup page
```

### `handleRedirectCallback()`

Completes the OAuth2 redirect flow. Call this **once** in your `/callback` route. Validates the OAuth2 response, verifies the CSRF state, exchanges the authorization code for tokens, and persists them to localStorage.

**Returns:** `TokenSet` containing `access_token`, `refresh_token`, `id_token`, and token metadata.

**Throws:** `AuthFlowError` if:

- OAuth2 endpoint returns an error (user denied, invalid client, etc.)
- State parameter doesn't match (CSRF violation)
- Token exchange fails (network, invalid code, etc.)

```ts
try {
  const tokens = await auth.handleRedirectCallback();
  console.log("Successfully exchanged code for tokens");
} catch (err) {
  if (err instanceof AuthFlowError) {
    console.error(`OAuth Error: ${err.error} - ${err.errorDescription}`);
  }
}
```

### `getUser()`

Returns the currently authenticated user decoded from the stored `id_token`. **No network call** — reads from localStorage and decodes the JWT.

**Returns:** `AuthFlowUser | null` with properties: `sub` (user ID), `email`, `name`, `email_verified`, and any custom claims from your backend.

```ts
const user = auth.getUser();
if (user) {
  console.log(`Logged in as ${user.email}`);
} else {
  console.log("Not logged in");
}
```

### `getAccessToken()`

Returns a valid `access_token` for API requests. Automatically performs a silent refresh if the token is within 60 seconds of expiring.

**Returns:** `string | null` — the access token if authenticated, or null if not logged in or refresh fails.

**Important:** Call this before **every** API request to ensure you have a fresh token.

```ts
const token = await auth.getAccessToken();
if (!token) {
  // User is not logged in
  return;
}

const response = await fetch("/api/me", {
  headers: { Authorization: `Bearer ${token}` },
});
```

### `isAuthenticated()`

Checks if the user has valid, non-expired tokens. **No network call** — purely local state check.

**Returns:** `boolean`

```ts
if (auth.isAuthenticated()) {
  // User can access protected routes
} else {
  // Redirect to login
}
```

### `getUserInfo()`

Fetches the latest user claims from the server's userinfo endpoint. Use this when you need up-to-date profile data (e.g., after profile updates on another device).

**Returns:** `AuthFlowUser | null` if successful, null if not authenticated or request fails.

```ts
const freshUser = await auth.getUserInfo();
if (freshUser) {
  console.log("Updated email:", freshUser.email);
}
```

### `logout(options?)`

Revokes the refresh token on the server, clears all stored tokens and session state, then redirects to a return URL.

**Parameters:**

- `options.returnTo` — URL to redirect to after logout (defaults to `window.location.origin`). Must be registered in your Application's Allowed Logout URLs.

**Note:** The server-side token revocation is best-effort. If it fails (network down, token expired), local tokens are still cleared and the redirect still happens. The user is logged out from this device regardless of the network call result.

```ts
// Logout to the home page
await auth.logout({ returnTo: "https://your-app.com" });

// Logout to a custom page
await auth.logout({ returnTo: "https://your-app.com/goodbye" });
```

## Error Handling

The SDK exports `AuthFlowError` for handling OAuth2 and authentication errors:

```ts
import { AuthFlowError } from "@meet_patel_03/authflow-js";

try {
  await auth.handleRedirectCallback();
} catch (err) {
  if (err instanceof AuthFlowError) {
    console.error("Error code:", err.error);
    console.error("Description:", err.errorDescription);
    // Handle specific errors:
    // - "missing_code" — No authorization code in URL
    // - "state_mismatch" — CSRF check failed
    // - "invalid_grant" — Code expired or already used
  } else {
    console.error("Unexpected error:", err);
  }
}
```

## Types

The SDK exports the following TypeScript types:

- **`AuthFlowConfig`** — Constructor configuration object
- **`AuthFlowUser`** — Decoded user claims from id_token
- **`TokenSet`** — OAuth2 tokens (access_token, refresh_token, id_token, etc.)
- **`AuthFlowError`** — OAuth2/authentication errors with `error` and `errorDescription` properties
- **`RedirectState`** — PKCE and CSRF state stored during redirect
