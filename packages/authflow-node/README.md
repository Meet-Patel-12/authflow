# @meet_patel_12/authflow-node

Server-side SDK for AuthFlow — token exchange, verification, and middleware for Node.js/Express and Next.js. Handles authorization code exchange, token refresh, id_token verification, and Bearer token validation.

## Installation

```bash
npm install @meet_patel_12/authflow-node
```

Requirements:

- Node.js 16+
- `jsonwebtoken` (included as a dependency)
- Express or Next.js (for middleware)
- Session store: express-session, cookies, or similar (see examples below)

## Quick start — Express

```ts
import express, { json } from "express";
import session from "express-session";
import {
  AuthFlowNodeClient,
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  createExpressMiddleware,
  createSessionRefreshMiddleware,
  requireAuth,
  AuthFlowNodeError,
} from "@meet_patel_12/authflow-node";

// Configure session store (example: memory store for dev, use proper store in production)
const app = express();
app.use(json());
app.use(
  session({
    secret: "your-session-secret",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === "production" },
  }),
);

// Initialize AuthFlow client
const authflow = new AuthFlowNodeClient({
  domain: "https://your-authflow-domain.com",
  clientId: "af_your_client_id",
  clientSecret: process.env.AUTHFLOW_SECRET!,
  redirectUri: "https://your-app.com/callback",
  scope: "openid profile email", // optional
});

// GET /login — Start the OAuth2 authorization flow
app.get("/login", (req, res) => {
  try {
    const verifier = generateCodeVerifier();
    const challenge = generateCodeChallenge(verifier);
    const state = generateState();

    // Store PKCE parameters in session
    req.session.pkce = { verifier, state };

    // Redirect to AuthFlow Universal Login
    const authUrl = authflow.buildAuthorizeUrl({
      state,
      codeChallenge: challenge,
      codeChallengeMethod: "S256",
      screen_hint: req.query.signup ? "signup" : "login", // optional
    });

    res.redirect(authUrl);
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "login_failed" });
  }
});

// GET /callback — Exchange authorization code for tokens
app.get("/callback", async (req, res) => {
  try {
    const { code, state, error } = req.query;

    // Check for OAuth2 error response
    if (error) {
      return res.status(400).json({
        error,
        error_description: req.query.error_description,
      });
    }

    // Validate state parameter (CSRF protection)
    const { verifier, state: storedState } = req.session.pkce || {};
    if (state !== storedState) {
      return res.status(400).json({ error: "state_mismatch" });
    }

    if (!code || !verifier) {
      return res.status(400).json({ error: "missing_code_or_verifier" });
    }

    // Exchange code for tokens
    const tokens = await authflow.exchangeCode(code as string, verifier);

    // Store tokens in session (or httpOnly cookie)
    req.session.tokens = tokens;
    delete req.session.pkce; // Clean up

    res.redirect("/dashboard");
  } catch (err) {
    if (err instanceof AuthFlowNodeError) {
      console.error("Token exchange error:", err.error, err.errorDescription);
    }
    res.status(400).json({
      error: "callback_failed",
      error_description: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

// GET /dashboard — Protected route
app.get(
  "/dashboard",
  createSessionRefreshMiddleware(authflow),
  requireAuth("/login"),
  (req, res) => {
    const user = req.session?.tokens ? " (authenticated)" : "";
    res.json({
      message: `Welcome to dashboard${user}`,
      tokens: req.session?.tokens ? "stored" : "none",
    });
  },
);

// GET /api/me — Protected API endpoint with Bearer token validation
app.get(
  "/api/me",
  createExpressMiddleware(authflow, {
    publicKeyOrSecret: process.env.OIDC_PUBLIC_KEY,
    credentialsRequired: true,
  }),
  (req, res) => {
    // req.authUser is populated by the middleware
    res.json({
      user: req.authUser,
      message: "This requires a valid Bearer token",
    });
  },
);

// GET /logout — Revoke tokens and clear session
app.get("/logout", async (req, res) => {
  const tokens = req.session?.tokens;
  if (tokens?.refresh_token) {
    try {
      // Optional: revoke on server side
      // await authflow.revokeToken(tokens.refresh_token);
    } catch (err) {
      console.error("Token revocation failed:", err);
    }
  }
  req.session?.destroy(() => {
    res.redirect("/");
  });
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
```

## Quick start — Next.js App Router

```ts
// app/api/me/route.ts
import { AuthFlowNodeClient, getServerUser } from "@meet_patel_12/authflow-node";

const authflow = new AuthFlowNodeClient({ ... });

export async function GET(req: Request) {
  const user = await getServerUser(req, authflow);
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json({ user });
}

// app/login/route.ts
import { cookies, redirect } from "next/headers";
import { generateCodeVerifier, generateCodeChallenge, generateState, AuthFlowNodeClient } from "@meet_patel_12/authflow-node";

const authflow = new AuthFlowNodeClient({
  domain: process.env.AUTHFLOW_DOMAIN!,
  clientId: process.env.AUTHFLOW_CLIENT_ID!,
  clientSecret: process.env.AUTHFLOW_CLIENT_SECRET!,
  redirectUri: process.env.AUTHFLOW_REDIRECT_URI!,
});

export async function GET() {
  const verifier  = generateCodeVerifier();
  const challenge = generateCodeChallenge(verifier);
  const state     = generateState();
  cookies().set("pkce_verifier", verifier, { httpOnly: true, secure: true, sameSite: "lax" });
  cookies().set("pkce_state",    state,    { httpOnly: true, secure: true, sameSite: "lax" });
  redirect(authflow.buildAuthorizeUrl({ state, codeChallenge: challenge, codeChallengeMethod: "S256" }));
}

// app/callback/route.ts
import { cookies, redirect } from "next/headers";
import { AuthFlowNodeClient, AuthFlowNodeError } from "@meet_patel_12/authflow-node";

const authflow = new AuthFlowNodeClient({
  domain: process.env.AUTHFLOW_DOMAIN!,
  clientId: process.env.AUTHFLOW_CLIENT_ID!,
  clientSecret: process.env.AUTHFLOW_CLIENT_SECRET!,
  redirectUri: process.env.AUTHFLOW_REDIRECT_URI!,
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Check for OAuth2 errors
    if (error) {
      throw new AuthFlowNodeError(
        error,
        searchParams.get("error_description") || undefined
      );
    }

    // Validate state (CSRF protection)
    const storedState = cookies().get("pkce_state")?.value;
    const storedVerifier = cookies().get("pkce_verifier")?.value;

    if (!state || !storedState || state !== storedState) {
      return new Response("State mismatch", { status: 400 });
    }

    if (!code || !storedVerifier) {
      return new Response("Missing code or verifier", { status: 400 });
    }

    // Exchange code for tokens
    const tokens = await authflow.exchangeCode(code, storedVerifier);

    // Store tokens in secure httpOnly cookie
    cookies().set("authflow_tokens", JSON.stringify(tokens), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: tokens.expires_in,
    });

    // Clean up PKCE cookies
    cookies().delete("pkce_verifier");
    cookies().delete("pkce_state");

    redirect("/dashboard");
  } catch (err) {
    console.error("Callback error:", err);
    return new Response(
      JSON.stringify({
        error: "callback_failed",
        message: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
}
```

## Configuration

| Option         | Required | Description                                                                                     |
| -------------- | -------- | ----------------------------------------------------------------------------------------------- |
| `domain`       | Yes      | Your AuthFlow backend URL (e.g. `https://auth.yourcompany.com`)                                 |
| `clientId`     | Yes      | Application `client_id` from the AuthFlow dashboard                                             |
| `clientSecret` | Yes      | Application `client_secret` from the dashboard. **Keep in env vars — never expose to frontend** |
| `redirectUri`  | Yes      | OAuth2 redirect URI. Must match an entry in your Application's Allowed Callback URLs            |
| `scope`        | No       | Space-separated OAuth2 scopes (defaults to `openid profile email`)                              |

## API

### `new AuthFlowNodeClient(config)`

Initializes the SDK. Throws an error if required config values are missing.

```ts
const authflow = new AuthFlowNodeClient({
  domain: process.env.AUTHFLOW_DOMAIN!,
  clientId: process.env.AUTHFLOW_CLIENT_ID!,
  clientSecret: process.env.AUTHFLOW_CLIENT_SECRET!,
  redirectUri: process.env.AUTHFLOW_REDIRECT_URI!,
  scope: "openid profile email", // optional
});
```

### `buildAuthorizeUrl(params)`

Builds the AuthFlow `/authorize` URL. **Always generate and store a new `code_verifier` and `state` before calling this.**

**Parameters:**

- `state` (required) — CSRF token. Store in session/cookie before redirecting.
- `codeChallenge` (required) — PKCE challenge generated from `generateCodeChallenge()`.
- `codeChallengeMethod` (required) — Always `"S256"`.
- `screen_hint` (optional) — `"signup"` to show registration page, or omit for login.

**Returns:** Full authorization URL string.

```ts
const verifier = generateCodeVerifier();
const challenge = generateCodeChallenge(verifier);
const state = generateState();

// Store verifier and state in session/cookie
sessionStorage.pkce = { verifier, state };

// Build and redirect
const authUrl = authflow.buildAuthorizeUrl({
  state,
  codeChallenge: challenge,
  codeChallengeMethod: "S256",
  screen_hint: "login", // optional
});
res.redirect(authUrl);
```

### `exchangeCode(code, codeVerifier)`

Exchanges an authorization code for tokens. **Must verify the `state` parameter matches before calling.**

**Parameters:**

- `code` — Authorization code from the OAuth2 callback.
- `codeVerifier` — The original PKCE verifier (from `generateCodeVerifier()`).

**Returns:** `TokenSet` containing `access_token`, `refresh_token`, `id_token`, and metadata.

**Throws:** `AuthFlowNodeError` if the exchange fails (invalid code, expired code, etc.).

```ts
try {
  const tokens = await authflow.exchangeCode(
    req.query.code as string,
    req.session.pkce.verifier,
  );
  req.session.tokens = tokens; // Store in session
  res.redirect("/dashboard");
} catch (err) {
  if (err instanceof AuthFlowNodeError) {
    console.error("Token exchange failed:", err.error, err.errorDescription);
  }
}
```

### `refreshTokens(refreshToken)`

Silently refreshes an access token using the refresh token. Use this in middleware when the stored access token is expired.

**Parameters:**

- `refreshToken` — The stored refresh token.

**Returns:** New `TokenSet`. The refresh token is preserved unless the server issued a new one.

**Throws:** `AuthFlowNodeError` if the refresh fails (token revoked, user logged out elsewhere, etc.).

```ts
if (authflow.isTokenExpired(req.session.tokens)) {
  try {
    req.session.tokens = await authflow.refreshTokens(
      req.session.tokens.refresh_token,
    );
  } catch (err) {
    // Refresh failed — user needs to re-authenticate
    return res.redirect("/login");
  }
}
```

### `verifyIdToken(idToken, publicKeyOrSecret, options?)`

Verifies the JWT signature of an `id_token` and returns the decoded user claims. Use this for Bearer token validation in your API endpoints.

**Parameters:**

- `idToken` — The JWT id_token string.
- `publicKeyOrSecret` — Public key (RS256) or shared secret (HS256). Use `process.env.OIDC_PUBLIC_KEY` for production.
- `options.algorithms` (optional) — JWT algorithms to accept (defaults to `["RS256", "HS256"]`).

**Returns:** `AuthFlowUser` with properties: `sub`, `email`, `name`, `email_verified`, and custom claims.

**Throws:** `AuthFlowNodeError` if verification fails (invalid signature, expired token, wrong audience, etc.).

```ts
try {
  const user = authflow.verifyIdToken(
    bearerToken,
    process.env.OIDC_PUBLIC_KEY!,
  );
  console.log("Authenticated user:", user.email);
} catch (err) {
  console.error(
    "Token invalid:",
    err instanceof AuthFlowNodeError ? err.error : err,
  );
  return res.status(401).json({ error: "unauthorized" });
}
```

### `decodeIdToken(idToken)`

Decodes an `id_token` **without verifying the signature**. Use only when you trust the token source (e.g., it was just received from your own `/oauth/token` endpoint).

**Parameters:**

- `idToken` — The JWT string.

**Returns:** `AuthFlowUser | null` — null if decoding fails.

```ts
const user = authflow.decodeIdToken(tokens.id_token);
if (user) {
  console.log("User email:", user.email);
} else {
  console.error("Failed to decode id_token");
}
```

### `isTokenExpired(tokens, bufferSeconds?)`

Checks if the access token is expired or within the buffer time.

**Parameters:**

- `tokens` — The `TokenSet` to check.
- `bufferSeconds` (optional) — Seconds before actual expiry to consider "expired" (default: 60). Use 0 to check actual expiry.

**Returns:** `boolean` — `true` if expired or expiring soon.

```ts
if (authflow.isTokenExpired(req.session.tokens)) {
  // Token is expired or about to expire — consider refreshing
}

if (authflow.isTokenExpired(req.session.tokens, 0)) {
  // Token is already expired (no buffer)
}
```

## PKCE Helpers

These functions use Node.js `crypto` for secure randomness:

### `generateCodeVerifier()`

Generates a cryptographically secure PKCE code verifier.

**Returns:** 43-128 character base64url string.

```ts
const verifier = generateCodeVerifier();
// Example: "E9Mzc...DPxQo9aw"
```

### `generateCodeChallenge(verifier)`

Creates an S256 (SHA-256) code challenge from a verifier.

**Parameters:**

- `verifier` — Output from `generateCodeVerifier()`.

**Returns:** base64url-encoded SHA-256 hash.

```ts
const verifier = generateCodeVerifier();
const challenge = generateCodeChallenge(verifier);
// Store verifier, use challenge in authorization request
```

### `generateState()`

Generates a random CSRF state token.

**Returns:** 16-character base64url string.

```ts
const state = generateState();
// Example: "kX92nL...Qr8pZQ"
```

## Middleware

### `createExpressMiddleware(client, options?)`

Express middleware that validates Bearer tokens on API endpoints.

**Parameters:**

- `client` — `AuthFlowNodeClient` instance.
- `options.publicKeyOrSecret` (optional) — JWT verification key. Defaults to `process.env.OIDC_PUBLIC_KEY` or `process.env.JWT_ACCESS_SECRET`.
- `options.credentialsRequired` (optional) — Reject requests without Bearer token (default: `true`). Set to `false` to allow unauthenticated access but populate `req.authUser` when a token is present.

**Effects:**

- Populates `req.authUser` with decoded user claims if authentication succeeds.
- Returns 401 with error JSON if token is missing or invalid.

```ts
// Require Bearer token on all /api routes
app.use("/api", createExpressMiddleware(authflow));

app.get("/api/me", (req, res) => {
  // req.authUser is guaranteed to exist here
  res.json({ user: req.authUser });
});

// Optional authentication on /public routes
app.use(
  "/public",
  createExpressMiddleware(authflow, { credentialsRequired: false }),
);
app.get("/public/profile", (req, res) => {
  if (req.authUser) {
    res.json({ message: "Logged in", user: req.authUser });
  } else {
    res.json({ message: "Anonymous" });
  }
});
```

### `createSessionRefreshMiddleware(client)`

Express middleware that automatically refreshes expired tokens stored in `req.session.tokens`.

**Parameters:**

- `client` — `AuthFlowNodeClient` instance.

**Effects:**

- If access token is expired or expiring within 60 seconds, silently refreshes it.
- Updates `req.session.tokens` with new tokens.
- Calls `next()` to continue (does not send a response).

```ts
app.use(createSessionRefreshMiddleware(authflow));

app.get("/protected", (req, res) => {
  // Tokens are guaranteed fresh at this point
  const tokens = req.session.tokens;
  res.json({ accessToken: tokens.access_token });
});
```

### `requireAuth(loginUrl?)`

Express middleware that redirects unauthenticated users to a login page.

**Parameters:**

- `loginUrl` (optional) — URL to redirect to if `req.session.tokens` is missing (default: `/login`).

**Effects:**

- If tokens are not stored in session, redirects to the login URL.
- Otherwise, calls `next()` to continue.

```ts
app.get("/dashboard", requireAuth("/login"), (req, res) => {
  res.json({ message: "Welcome", tokens: req.session.tokens });
});
```

### `getServerUser(request, client, options?)`

Next.js helper to extract and verify the authenticated user from a Request.

**Parameters:**

- `request` — Next.js `Request` object.
- `client` — `AuthFlowNodeClient` instance.
- `options.cookieName` (optional) — Cookie name for tokens (default: `authflow_tokens`).
- `options.publicKeyOrSecret` (optional) — JWT verification key.

**Returns:** `AuthFlowUser | null` — null if no token is found or verification fails.

```ts
import { getServerUser } from "@meet_patel_12/authflow-node";

export async function GET(req: Request) {
  const user = await getServerUser(req, authflow);
  if (!user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  return Response.json({ user });
}
```

## Error Handling

The SDK exports `AuthFlowNodeError` for OAuth2 and authentication failures:

```ts
import { AuthFlowNodeError } from "@meet_patel_12/authflow-node";

try {
  await authflow.exchangeCode(code, verifier);
} catch (err) {
  if (err instanceof AuthFlowNodeError) {
    console.error("Error:", err.error);
    console.error("Description:", err.errorDescription);
    // Common errors:
    // - "invalid_grant" — Code expired, already used, or invalid
    // - "invalid_client" — clientId or clientSecret incorrect
    // - "refresh_failed" — Refresh token revoked or expired
  } else {
    console.error("Network or unknown error:", err);
  }
}
```

## Types

The SDK exports the following TypeScript types:

- **`NodeClientConfig`** — Constructor configuration object
- **`AuthFlowUser`** — Decoded user claims from id_token (sub, email, name, email_verified, custom fields)
- **`TokenSet`** — OAuth2 tokens (access_token, refresh_token, id_token, expires_in, expires_at, scope)
- **`AuthorizeUrlParams`** — Parameters for `buildAuthorizeUrl()`
- **`AuthFlowNodeError`** — OAuth2 errors with `error` and `errorDescription` properties

## Common Patterns

### Express: Protected API with auto-refresh

```ts
app.use("/api", createSessionRefreshMiddleware(authflow));
app.use("/api", createExpressMiddleware(authflow));
app.get("/api/profile", (req, res) => res.json(req.authUser));
```

### Next.js: Server component with auth

```ts
import { cookies } from "next/headers";
import { authflow } from "@/lib/authflow";

export default async function ProfilePage() {
  const c = await cookies();
  const tokensJson = c.get("authflow_tokens")?.value;
  const tokens = tokensJson ? JSON.parse(tokensJson) : null;

  if (!tokens) {
    redirect("/login");
  }

  const user = authflow.decodeIdToken(tokens.id_token);
  return <div>Welcome, {user?.email}</div>;
}
```
