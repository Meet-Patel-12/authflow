# @authflow/react

React SDK for AuthFlow — hooks and provider for the Authorization Code + PKCE flow.

## Installation

```bash
npm install @authflow/react @authflow/js
```

## Quick start

```tsx
// main.tsx — wrap your app
import { AuthFlowProvider } from "@authflow/react";

<AuthFlowProvider
  config={{
    domain: "https://your-authflow-domain.com",
    clientId: "af_your_client_id",
    redirectUri: "https://your-app.com/callback",
  }}>
  <App />
</AuthFlowProvider>;

// Any component
import { useAuthFlow } from "@authflow/react";

function Navbar() {
  const { user, isAuthenticated, isLoading, loginWithRedirect, logout } =
    useAuthFlow();

  if (isLoading) return <Spinner />;

  if (!isAuthenticated) {
    return <button onClick={() => loginWithRedirect()}>Login</button>;
  }

  return (
    <div>
      Hello {user?.name}
      <button onClick={() => logout({ returnTo: window.location.origin })}>
        Logout
      </button>
    </div>
  );
}

// /callback route
import { useAuthCallback } from "@authflow/react";

function CallbackPage() {
  const { status, error } = useAuthCallback({
    onSuccess: () => navigate("/dashboard"),
    onError: (err) => navigate("/login?error=" + err),
  });

  if (status === "loading") return <div>Completing login...</div>;
  if (status === "error") return <div>Login failed: {error}</div>;
  return null;
}
```

## API

### `<AuthFlowProvider config={...}>`

Wrap your app once. Initialises the auth client, restores session from localStorage on mount.

### `useAuthFlow()`

Returns `{ user, isLoading, isAuthenticated, loginWithRedirect, handleRedirectCallback, getAccessToken, logout, client }`.

### `useUser()`

Convenience hook — returns just the current `user`.

### `useAuthCallback({ onSuccess, onError })`

Drop in your `/callback` route. Handles the code exchange and calls your callbacks. Safe against React 18 StrictMode double-invocation.

### `withAuthRequired(Component)`

HOC that redirects unauthenticated users to login. Renders `null` while loading.
