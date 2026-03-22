# @authflow/node

Server-side SDK for AuthFlow — token exchange, verification, and middleware for Next.js and Express.

## Installation

```bash
npm install @authflow/node
```

## Quick start — Express

```ts
import {
  AuthFlowNodeClient,
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  createExpressMiddleware,
  createSessionRefreshMiddleware,
  requireAuth,
} from "@authflow/node";

const authflow = new AuthFlowNodeClient({
  domain: "https://your-authflow-domain.com",
  clientId: "af_your_client_id",
  clientSecret: process.env.AUTHFLOW_SECRET!,
  redirectUri: "https://your-app.com/callback",
});

// /login — start the OAuth2 flow
app.get("/login", (req, res) => {
  const verifier = generateCodeVerifier();
  const challenge = generateCodeChallenge(verifier);
  const state = generateState();
  req.session.pkce = { verifier, state };
  res.redirect(
    authflow.buildAuthorizeUrl({
      state,
      codeChallenge: challenge,
      codeChallengeMethod: "S256",
    }),
  );
});

// /callback — exchange code for tokens
app.get("/callback", async (req, res) => {
  const { verifier, state } = req.session.pkce;
  if (req.query.state !== state) return res.status(400).send("State mismatch");
  req.session.tokens = await authflow.exchangeCode(req.query.code, verifier);
  res.redirect("/dashboard");
});

// API middleware — verifies Bearer token on every request
app.use("/api", createExpressMiddleware(authflow));
app.get("/api/me", (req, res) => res.json(req.authUser));

// Auto-refresh session tokens
app.use(createSessionRefreshMiddleware(authflow));
app.get("/dashboard", requireAuth("/login"), dashboardHandler);
```

## Quick start — Next.js App Router

```ts
// app/api/me/route.ts
import { AuthFlowNodeClient, getServerUser } from "@authflow/node";

const authflow = new AuthFlowNodeClient({ ... });

export async function GET(req: Request) {
  const user = await getServerUser(req, authflow);
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json({ user });
}

// app/login/route.ts
import { cookies, redirect } from "next/headers";
import { generateCodeVerifier, generateCodeChallenge, generateState } from "@authflow/node";

export async function GET() {
  const verifier  = generateCodeVerifier();
  const challenge = generateCodeChallenge(verifier);
  const state     = generateState();
  cookies().set("pkce_verifier", verifier, { httpOnly: true, secure: true, sameSite: "lax" });
  cookies().set("pkce_state",    state,    { httpOnly: true, secure: true, sameSite: "lax" });
  redirect(authflow.buildAuthorizeUrl({ state, codeChallenge: challenge, codeChallengeMethod: "S256" }));
}

// app/callback/route.ts
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const verifier = cookies().get("pkce_verifier")?.value!;
  const state    = cookies().get("pkce_state")?.value!;
  if (searchParams.get("state") !== state) return new Response("State mismatch", { status: 400 });
  const tokens = await authflow.exchangeCode(searchParams.get("code")!, verifier);
  cookies().set("tokens", JSON.stringify(tokens), { httpOnly: true, secure: true });
  redirect("/dashboard");
}
```

## API

### `new AuthFlowNodeClient(config)`

Config: `{ domain, clientId, clientSecret, redirectUri, scope? }`.

### `buildAuthorizeUrl(params)`

Builds the `/authorize` URL. Store `code_verifier` and `state` in the session before redirecting.

### `exchangeCode(code, codeVerifier)`

Exchanges an authorization code for tokens. Returns `TokenSet`.

### `refreshTokens(refreshToken)`

Exchanges a refresh token for a new access token. Returns updated `TokenSet`.

### `verifyIdToken(idToken, publicKeyOrSecret)`

Verifies and decodes an `id_token`. Use `process.env.OIDC_PUBLIC_KEY` for RS256.

### `decodeIdToken(idToken)`

Decodes without verifying — use only when the token source is trusted.

### `isTokenExpired(tokens, bufferSeconds?)`

Returns `true` if access token is expired or within `bufferSeconds` (default 60) of expiry.

### PKCE helpers

`generateCodeVerifier()`, `generateCodeChallenge(verifier)`, `generateState()` — all use Node.js `crypto`.
