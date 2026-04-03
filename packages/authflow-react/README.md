# @meet_patel_12/authflow-react

React SDK for AuthFlow — hooks and provider for the Authorization Code + PKCE flow. Includes state management, automatic token refresh, and session persistence.

## Installation

```bash
npm install @meet_patel_12/authflow-react @meet_patel_12/authflow-js
```

Requirements:

- React 18+
- `@meet_patel_12/authflow-js` (peer dependency)

## Quick start

```tsx
// main.tsx — wrap your app with AuthFlowProvider
import { AuthFlowProvider } from "@meet_patel_12/authflow-react";
import { App } from "./App";

export default function Root() {
  return (
    <AuthFlowProvider
      config={{
        domain: "https://your-authflow-domain.com",
        clientId: "af_your_client_id",
        redirectUri: "https://your-app.com/callback",
        scope: "openid profile email", // optional
      }}>
      <App />
    </AuthFlowProvider>
  );
}

// components/navbar.tsx — use hooks in any component
import { useAuthFlow } from "@meet_patel_12/authflow-react";

export function Navbar() {
  const { user, isAuthenticated, isLoading, loginWithRedirect, logout } =
    useAuthFlow();

  if (isLoading) {
    return <div>Loading authentication state...</div>;
  }

  if (!isAuthenticated) {
    return (
      <nav>
        <button onClick={() => loginWithRedirect({ screen_hint: "login" })}>
          Login
        </button>
        <button onClick={() => loginWithRedirect({ screen_hint: "signup" })}>
          Sign Up
        </button>
      </nav>
    );
  }

  return (
    <nav>
      <span>Hello {user?.name || user?.email}</span>
      <button onClick={() => logout({ returnTo: window.location.origin })}>
        Logout
      </button>
    </nav>
  );
}

// components/protected-route.tsx — protect routes
import { useAuthFlow } from "@meet_patel_12/authflow-react";
import { ReactNode } from "react";
import { Navigate } from "react-router";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthFlow();

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" />;

  return <>{children}</>;
}

// pages/callback.tsx — handle OAuth redirect
import { useAuthCallback } from "@meet_patel_12/authflow-react";
import { useNavigate } from "react-router";

export function CallbackPage() {
  const navigate = useNavigate();
  const { status, error } = useAuthCallback({
    onSuccess: () => {
      // Redirect to dashboard after successful login
      navigate("/dashboard", { replace: true });
    },
    onError: (err) => {
      console.error("Login failed:", err);
      navigate("/login?error=" + encodeURIComponent(err), { replace: true });
    },
  });

  if (status === "loading") {
    return <div>Completing login...</div>;
  }

  if (status === "error") {
    return (
      <div>
        <p>Login failed: {error}</p>
        <a href="/login">Back to login</a>
      </div>
    );
  }

  // Success — navigation happens via onSuccess callback
  return null;
}

// pages/dashboard.tsx — access user and tokens
import { useAuthFlow } from "@meet_patel_12/authflow-react";

export function DashboardPage() {
  const { user, getAccessToken } = useAuthFlow();

  const fetchProtectedApi = async () => {
    const token = await getAccessToken();
    if (!token) {
      console.error("Not authenticated");
      return;
    }

    const res = await fetch("/api/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    console.log("API response:", data);
  };

  return (
    <div>
      <h1>Welcome, {user?.email}</h1>
      <p>Email verified: {user?.email_verified ? "Yes" : "No"}</p>
      <button onClick={fetchProtectedApi}>Call API</button>
    </div>
  );
}
```

## Configuration

The `<AuthFlowProvider>` accepts the same configuration as `AuthFlowClient` from `@authflow/js`:

| Option        | Required | Default                              | Description                                                     |
| ------------- | -------- | ------------------------------------ | --------------------------------------------------------------- |
| `domain`      | Yes      | —                                    | Your AuthFlow backend URL (e.g. `https://auth.yourcompany.com`) |
| `clientId`    | Yes      | —                                    | Application `client_id` from the AuthFlow dashboard             |
| `redirectUri` | No       | `window.location.origin + /callback` | OAuth2 redirect URI. Must match Allowed Callback URLs           |
| `scope`       | No       | `openid profile email`               | Space-separated OAuth2 scopes to request                        |
| `storageKey`  | No       | `authflow`                           | localStorage key prefix for token persistence                   |

## API

### `<AuthFlowProvider config={...}>`

Wraps your app and provides authentication context. Initialize this **once** at the root level.

**Props:**

- `config` — `AuthFlowConfig` object (see Configuration above)
- `children` — React elements to wrap

**Behavior:**

- Creates an internal `AuthFlowClient` instance (reused across re-renders)
- On mount, restores authentication state from localStorage
- Silently refreshes expired access tokens
- Provides context values to all child components

```tsx
import { AuthFlowProvider } from "@meet_patel_12/authflow-react";

export function App() {
  return (
    <AuthFlowProvider
      config={{
        domain: "https://auth.yourcompany.com",
        clientId: "af_your_client_id",
        redirectUri: "https://your-app.com/callback",
      }}>
      <Routes>
        <Route
          path="/callback"
          element={<CallbackPage />}
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        {/* ... */}
      </Routes>
    </AuthFlowProvider>
  );
}
```

### `useAuthFlow()`

Primary hook — provides access to authentication state and actions. Must be used inside `<AuthFlowProvider>`.

**Returns:**

```ts
{
  client: AuthFlowClient,           // Underlying SDK instance for advanced use
  user: AuthFlowUser | null,        // Current user or null if not authenticated
  isLoading: boolean,               // True while initial auth state is loading
  isAuthenticated: boolean,         // True if user is logged in with valid token
  loginWithRedirect(options?),      // Redirect to login page
  handleRedirectCallback(),         // Exchange code for tokens (call in /callback)
  getAccessToken(),                 // Get valid access token (auto-refreshes)
  logout(options?),                 // Logout and clear session
}
```

**Throws:** If used outside `<AuthFlowProvider>`.

```ts
import { useAuthFlow } from "@meet_patel_12/authflow-react";

function MyComponent() {
  const { user, isLoading, isAuthenticated, loginWithRedirect } = useAuthFlow();

  if (isLoading) return <div>Checking authentication...</div>;

  if (!isAuthenticated) {
    return <button onClick={() => loginWithRedirect()}>Login</button>;
  }

  return <div>Welcome, {user?.email}</div>;
}
```

#### `loginWithRedirect(options?)`

Redirects the user to the AuthFlow Universal Login page.

**Parameters:**

- `options.screen_hint` (optional) — `"login"` (default) or `"signup"` to show registration page

```ts
const { loginWithRedirect } = useAuthFlow();

// Login page
<button onClick={() => loginWithRedirect()}>Login</button>

// Signup page
<button onClick={() => loginWithRedirect({ screen_hint: "signup" })}>Sign Up</button>
```

#### `handleRedirectCallback()`

Completes the OAuth2 redirect. **Call this once in your `/callback` route.**

**Returns:** `Promise<TokenSet>` — resolves with access, refresh, and ID tokens

**Throws:** `AuthFlowError` if the code exchange fails

```ts
const { handleRedirectCallback } = useAuthFlow();

try {
  const tokens = await handleRedirectCallback();
  console.log("Login successful!");
} catch (err) {
  console.error("Token exchange failed:", err);
}
```

#### `getAccessToken()`

Returns a valid access token, automatically refreshing if near expiry.

**Returns:** `Promise<string | null>` — valid token or null if not authenticated

**Use cases:**

- Before making API calls
- Getting the token to send in Authorization header

```ts
const { getAccessToken } = useAuthFlow();

const fetchUserProfile = async () => {
  const token = await getAccessToken();
  if (!token) {
    console.log("Not authenticated");
    return;
  }

  const res = await fetch("/api/profile", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const profile = await res.json();
  console.log(profile);
};
```

#### `logout(options?)`

Revokes the server-side session, clears local tokens, and redirects.

**Parameters:**

- `options.returnTo` (optional) — URL to redirect to after logout (defaults to `window.location.origin`)

```ts
const { logout } = useAuthFlow();

<button onClick={() => logout({ returnTo: "https://your-app.com" })}>
  Logout
</button>
```

### `useUser()`

Convenience hook — returns just the current user without needing the full `useAuthFlow()` context.

**Returns:** `AuthFlowUser | null`

```ts
import { useUser } from "@meet_patel_12/authflow-react";

function UserCard() {
  const user = useUser();

  if (!user) return <div>Not logged in</div>;

  return (
    <div>
      <p>Name: {user.name}</p>
      <p>Email: {user.email}</p>
      <p>Verified: {user.email_verified ? "Yes" : "No"}</p>
    </div>
  );
}
```

### `useAuthCallback({ onSuccess?, onError? })`

Handles the OAuth2 redirect callback. Drop this in your `/callback` route component.

**Parameters:**

- `onSuccess` (optional) — Callback when token exchange succeeds (typically redirects to dashboard)
- `onError` (optional) — Callback when exchange fails, receives error message

**Returns:**

```ts
{
  status: "loading" | "success" | "error",  // Current state
  error: string | null,                     // Error message if status === "error"
}
```

**Important:** This hook guards against React 18 StrictMode double-execution, so the token exchange runs exactly once even in development.

```ts
import { useAuthCallback } from "@meet_patel_12/authflow-react";
import { useNavigate } from "react-router-dom";

function CallbackPage() {
  const navigate = useNavigate();
  const { status, error } = useAuthCallback({
    onSuccess: () => {
      console.log("Login successful!");
      navigate("/dashboard", { replace: true });
    },
    onError: (err) => {
      console.error("Login error:", err);
      navigate("/login?error=" + encodeURIComponent(err), { replace: true });
    },
  });

  if (status === "loading") {
    return <div>Completing login...</div>;
  }

  if (status === "error") {
    return (
      <div>
        <p>Login failed: {error}</p>
        <a href="/login">Try again</a>
      </div>
    );
  }

  return null;
}
```

### `withAuthRequired(Component)`

Higher-Order Component that protects a route from unauthenticated access.

**Behavior:**

- Returns `null` while `isLoading` is true
- Redirects to `/login` if not authenticated
- Renders the component if authenticated

**Parameters:**

- `Component` — React component to protect

**Returns:** Wrapped component

```ts
import { withAuthRequired } from "@meet_patel_12/authflow-react";

function DashboardPage() {
  const { user } = useAuthFlow();
  return <h1>Welcome, {user?.email}</h1>;
}

// Protect the route
export default withAuthRequired(DashboardPage);

// In router:
<Route path="/dashboard" element={<ProtectedDashboard />} />
```

## Error Handling

Use `AuthFlowError` from `@meet_patel_12/authflow-js` for detailed error handling:

```ts
import { useAuthCallback } from "@meet_patel_12/authflow-react";
import { AuthFlowError } from "@meet_patel_12/authflow-js";

function CallbackPage() {
  const { status, error } = useAuthCallback({
    onError: (err) => {
      console.error("Callback error:", err);
      // Network errors, CSRF, invalid state, etc.
    },
  });
}
```

Common error scenarios:

- **"state_mismatch"** — CSRF token validation failed; user may have been redirected from a different browser tab
- **"missing_code"** — OAuth provider didn't return an authorization code
- **"invalid_grant"** — Authorization code expired, already used, or invalid
- Network errors if the backend is unreachable

## Types

The SDK exports all types from `@meet_patel_12/authflow-js`:

- **`AuthFlowUser`** — User claims (sub, email, name, email_verified, custom fields)
- **`AuthFlowConfig`** — Provider configuration
- **`TokenSet`** — OAuth2 tokens (access_token, refresh_token, id_token, expires_in, etc.)
- **`AuthFlowError`** — OAuth2 errors with `error` and `errorDescription` properties
- **`AuthFlowProviderProps`** — Props for `<AuthFlowProvider>`
- **`AuthFlowContextValue`** — Return type of `useAuthFlow()`
- **`CallbackStatus`** — Type of `status` from `useAuthCallback()` ("loading" | "success" | "error")

```ts
import type {
  AuthFlowUser,
  AuthFlowConfig,
  TokenSet,
  AuthFlowError,
} from "@meet_patel_12/authflow-react";
```

## Common Patterns

### Protected Route Component

```tsx
import { useAuthFlow } from "@meet_patel_12/authflow-react";
import { Navigate, useLocation } from "react-router-dom";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthFlow();
  const location = useLocation();

  if (isLoading) return <div>Loading...</div>;

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  return <>{children}</>;
}

// Usage:
<Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  }
/>;
```

### API Client with Auto-Refresh

```ts
import { useAuthFlow } from "@meet_patel_12/authflow-react";

export function useApi() {
  const { getAccessToken } = useAuthFlow();

  return {
    async get(url: string) {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");

      return fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json());
    },

    async post(url: string, data: unknown) {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");

      return fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      }).then((r) => r.json());
    },
  };
}

// Usage in components:
function MyComponent() {
  const api = useApi();

  const deleteAccount = async () => {
    await api.post("/api/account/delete", {});
  };
}
```

### Conditional Navigation

```tsx
import { useAuthFlow } from "@meet_patel_12/authflow-react";
import { useNavigate } from "react-router-dom";

function LoginPrompt() {
  const { isAuthenticated, loginWithRedirect } = useAuthFlow();
  const navigate = useNavigate();

  const handleClick = async () => {
    if (!isAuthenticated) {
      await loginWithRedirect();
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <button onClick={handleClick}>
      {isAuthenticated ? "Go to Dashboard" : "Login"}
    </button>
  );
}
```

### Loading States

```tsx
import { useAuthFlow } from "@meet_patel_12/authflow-react";

function RootLayout() {
  const { isLoading } = useAuthFlow();

  if (isLoading) {
    return <div>Initializing authentication...</div>;
  }

  return <main>{/* Your routes */}</main>;
}
```
