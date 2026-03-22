# @authflow/js

Vanilla JS/TypeScript SDK for AuthFlow — Authorization Code + PKCE flow for browser SPAs.

## Installation

```bash
npm install @authflow/js
```

## Quick start

```ts
import { AuthFlowClient } from "@authflow/js";

const auth = new AuthFlowClient({
  domain: "https://your-authflow-domain.com",
  clientId: "af_your_client_id",
  redirectUri: "https://your-app.com/callback",
});

// Login button
await auth.loginWithRedirect();

// /callback route — exchanges code for tokens
await auth.handleRedirectCallback();

// Read the user
const user = auth.getUser();
// { sub, email, name, email_verified }

// Get a valid access token (auto-refreshes if expiring)
const token = await auth.getAccessToken();

// Use in API calls
fetch("/api/me", {
  headers: { Authorization: `Bearer ${token}` },
});

// Logout (revokes server session + clears localStorage)
await auth.logout({ returnTo: "https://your-app.com" });
```

## Configuration

| Option        | Required | Default                | Description                              |
| ------------- | -------- | ---------------------- | ---------------------------------------- |
| `domain`      | Yes      | —                      | Your AuthFlow backend URL                |
| `clientId`    | Yes      | —                      | Application client_id from the dashboard |
| `redirectUri` | No       | `origin + /callback`   | Must match Allowed Callback URLs         |
| `scope`       | No       | `openid profile email` | OAuth2 scopes to request                 |
| `storageKey`  | No       | `authflow`             | localStorage key prefix                  |

## API

### `loginWithRedirect(options?)`

Redirects to the AuthFlow Universal Login page. Pass `{ screen_hint: "signup" }` to land on the registration page.

### `handleRedirectCallback()`

Call in your `/callback` route. Reads the code from the URL, verifies state (CSRF), exchanges for tokens, saves to localStorage.

### `getUser()`

Returns the current user decoded from the stored `id_token`. No network call.

### `getAccessToken()`

Returns a valid access token. Auto-refreshes silently if within 60 seconds of expiry. Returns `null` if not authenticated.

### `isAuthenticated()`

Returns `true` if tokens are stored and not expired. No network call.

### `getUserInfo()`

Fetches fresh user claims from the server. Use after profile updates.

### `logout(options?)`

Calls `POST /oauth/logout` to revoke the server session, then clears localStorage and redirects.
