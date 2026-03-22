import type {
  AuthFlowNodeClient,
  TokenSet,
  AuthFlowUser,
} from "./AuthFlowNodeClient";

// ─── Express ──────────────────────────────────────────────────────────────────

// Minimal typings so the middleware compiles without depending on @types/express
interface ExpressRequest {
  headers: Record<string, string | string[] | undefined>;
  session?: Record<string, unknown> & { tokens?: TokenSet };
  authUser?: AuthFlowUser;
}
interface ExpressResponse {
  status: (code: number) => ExpressResponse;
  json: (body: unknown) => void;
}
type ExpressNext = () => void;

/**
 * Express middleware that validates the Bearer token on every request.
 * Attaches the decoded user to req.authUser.
 *
 * Requires:
 *   - Authorization: Bearer <access_token> header
 *   - process.env.OIDC_PUBLIC_KEY (or JWT_ACCESS_SECRET for HS256 dev mode)
 *
 * @example
 *   import { createExpressMiddleware } from "@authflow/node";
 *   app.use("/api", createExpressMiddleware(client));
 *   app.get("/api/me", (req, res) => res.json(req.authUser));
 */
export const createExpressMiddleware = (
  client: AuthFlowNodeClient,
  options: {
    publicKeyOrSecret?: string;
    credentialsRequired?: boolean;
  } = {},
) => {
  const {
    publicKeyOrSecret = process.env.OIDC_PUBLIC_KEY ??
      process.env.JWT_ACCESS_SECRET ??
      "",
    credentialsRequired = true,
  } = options;

  return async (
    req: ExpressRequest,
    res: ExpressResponse,
    next: ExpressNext,
  ): Promise<void> => {
    const authHeader = req.headers["authorization"] as string | undefined;
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : undefined;

    if (!token) {
      if (credentialsRequired) {
        res
          .status(401)
          .json({
            error: "unauthorized",
            error_description: "Bearer token required.",
          });
        return;
      }
      next();
      return;
    }

    try {
      req.authUser = client.verifyIdToken(token, publicKeyOrSecret);
      next();
    } catch {
      res
        .status(401)
        .json({
          error: "invalid_token",
          error_description: "Token is invalid or expired.",
        });
    }
  };
};

// ─── Express session-based auto-refresh ───────────────────────────────────────

/**
 * Express middleware that automatically refreshes expired access_tokens
 * stored in the session. Use this before your protected routes.
 *
 * Requires express-session (or compatible) to be configured.
 *
 * @example
 *   app.use(createSessionRefreshMiddleware(client));
 *   app.get("/dashboard", requireAuth, (req, res) => { ... });
 */
export const createSessionRefreshMiddleware =
  (client: AuthFlowNodeClient) =>
  async (
    req: ExpressRequest,
    _res: ExpressResponse,
    next: ExpressNext,
  ): Promise<void> => {
    const tokens = req.session?.tokens;
    if (!tokens) {
      next();
      return;
    }

    if (client.isTokenExpired(tokens)) {
      try {
        req.session!.tokens = await client.refreshTokens(tokens.refresh_token);
      } catch {
        // Refresh failed — clear the session so requireAuth redirects to login
        delete req.session!.tokens;
      }
    }

    next();
  };

// ─── Express requireAuth guard ────────────────────────────────────────────────

/**
 * Express route guard — call after createSessionRefreshMiddleware.
 * Redirects to login if there are no valid session tokens.
 *
 * @example
 *   app.get("/dashboard", requireAuth("/login"), dashboardHandler);
 */
export const requireAuth =
  (loginPath = "/login") =>
  (req: ExpressRequest, res: any, next: ExpressNext): void => {
    if (!req.session?.tokens) {
      res.redirect(loginPath);
      return;
    }
    next();
  };

// ─── Next.js App Router helper ────────────────────────────────────────────────

/**
 * Next.js App Router utility — verifies the access_token from a cookie or
 * Authorization header in a Route Handler or Server Component.
 *
 * Returns the decoded user, or null if no valid token is present.
 *
 * @example — Route Handler (app/api/me/route.ts):
 *   import { getServerUser } from "@authflow/node";
 *   export async function GET(req: Request) {
 *     const user = await getServerUser(req, client);
 *     if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
 *     return Response.json({ user });
 *   }
 *
 * @example — Server Component:
 *   import { cookies } from "next/headers";
 *   import { getServerUser } from "@authflow/node";
 *   export default async function Page() {
 *     const user = await getServerUser(null, client, { cookieName: "access_token" });
 *     if (!user) redirect("/login");
 *     return <div>Hello {user.name}</div>;
 *   }
 */
export const getServerUser = async (
  req: Request | null,
  client: AuthFlowNodeClient,
  options: {
    publicKeyOrSecret?: string;
    /** Cookie name to read access_token from — for Next.js Server Components */
    cookieName?: string;
    /** Pre-read cookie value — pass cookies().get(cookieName)?.value */
    cookieValue?: string;
  } = {},
): Promise<AuthFlowUser | null> => {
  const {
    publicKeyOrSecret = process.env.OIDC_PUBLIC_KEY ??
      process.env.JWT_ACCESS_SECRET ??
      "",
  } = options;

  let token: string | undefined;

  // Try Authorization header first (Route Handlers)
  if (req) {
    const auth = req.headers.get("authorization");
    if (auth?.startsWith("Bearer ")) {
      token = auth.slice(7);
    }
  }

  // Fall back to cookie (Server Components)
  if (!token && options.cookieValue) {
    token = options.cookieValue;
  }

  if (!token) return null;

  try {
    return client.verifyIdToken(token, publicKeyOrSecret);
  } catch {
    return null;
  }
};
