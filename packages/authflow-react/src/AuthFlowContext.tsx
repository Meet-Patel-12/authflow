import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AuthFlowClient } from "@authflow/js";
import type { AuthFlowConfig, AuthFlowUser, TokenSet } from "@authflow/js";

// ─── Context shape ────────────────────────────────────────────────────────────

export interface AuthFlowContextValue {
  /** The underlying AuthFlowClient instance — use this for advanced operations */
  client: AuthFlowClient;

  /** Current authenticated user, null if not logged in */
  user: AuthFlowUser | null;

  /** True once the initial auth state has been resolved */
  isLoading: boolean;

  /** True if the user is logged in and the access token is not expired */
  isAuthenticated: boolean;

  /** Redirect to the AuthFlow Universal Login page */
  loginWithRedirect: (options?: {
    screen_hint?: "login" | "signup";
  }) => Promise<void>;

  /**
   * Call in your /callback route.
   * Exchanges the authorization code for tokens, then resolves with the TokenSet.
   */
  handleRedirectCallback: () => Promise<TokenSet>;

  /**
   * Returns a valid access token, auto-refreshing if near expiry.
   * Returns null if not authenticated.
   */
  getAccessToken: () => Promise<string | null>;

  /** Revokes server-side session, clears tokens, and redirects to returnTo */
  logout: (options?: { returnTo?: string }) => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthFlowContext = createContext<AuthFlowContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export interface AuthFlowProviderProps {
  /** AuthFlow configuration — same shape as AuthFlowClient constructor */
  config: AuthFlowConfig;
  children: React.ReactNode;
}

export const AuthFlowProvider: React.FC<AuthFlowProviderProps> = ({
  config,
  children,
}) => {
  // Create the client once — config changes are ignored after initial mount
  // to avoid resetting auth state on re-renders. Use a ref so we never
  // recreate it even if the parent re-renders with a new config object.
  const clientRef = useRef<AuthFlowClient | null>(null);
  if (!clientRef.current) {
    clientRef.current = new AuthFlowClient(config);
  }
  const client = clientRef.current;

  const [user, setUser] = useState<AuthFlowUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // ─── Initialize auth state from stored tokens ─────────────────────────────
  // On first mount, check if there are valid tokens in localStorage.
  // This keeps the user logged in across page refreshes.

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Try to get an access token — this silently refreshes if near expiry
        const token = await client.getAccessToken();
        if (token) {
          const currentUser = client.getUser();
          setUser(currentUser);
          setIsAuthenticated(true);
        }
      } catch {
        // Stored tokens invalid — user needs to log in again
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [client]);

  // ─── Stable callbacks ─────────────────────────────────────────────────────

  const loginWithRedirect = useCallback(
    (options?: { screen_hint?: "login" | "signup" }) =>
      client.loginWithRedirect(options),
    [client],
  );

  const handleRedirectCallback = useCallback(async (): Promise<TokenSet> => {
    const tokens = await client.handleRedirectCallback();
    setUser(client.getUser());
    setIsAuthenticated(true);
    return tokens;
  }, [client]);

  const getAccessToken = useCallback(() => client.getAccessToken(), [client]);

  const logout = useCallback(
    async (options?: { returnTo?: string }) => {
      await client.logout(options);
      setUser(null);
      setIsAuthenticated(false);
    },
    [client],
  );

  const value: AuthFlowContextValue = {
    client,
    user,
    isLoading,
    isAuthenticated,
    loginWithRedirect,
    handleRedirectCallback,
    getAccessToken,
    logout,
  };

  return (
    <AuthFlowContext.Provider value={value}>
      {children}
    </AuthFlowContext.Provider>
  );
};

// ─── useAuthFlow ─────────────────────────────────────────────────────────────

/**
 * Primary hook — use this in any component to access auth state and actions.
 *
 * @throws if used outside of <AuthFlowProvider>
 */
export const useAuthFlow = (): AuthFlowContextValue => {
  const ctx = useContext(AuthFlowContext);
  if (!ctx) {
    throw new Error(
      "useAuthFlow must be used inside <AuthFlowProvider>. " +
        "Wrap your app: <AuthFlowProvider config={...}><App /></AuthFlowProvider>",
    );
  }
  return ctx;
};

// ─── useUser ─────────────────────────────────────────────────────────────────

/** Convenience hook — returns just the current user */
export const useUser = (): AuthFlowUser | null => useAuthFlow().user;

// ─── withAuthRequired ────────────────────────────────────────────────────────

/**
 * HOC that redirects to login if the user is not authenticated.
 * Renders null while auth state is loading.
 *
 * @example
 *   const ProtectedDashboard = withAuthRequired(Dashboard);
 */
export function withAuthRequired<P extends object>(
  Component: React.ComponentType<P>,
  options: { returnTo?: string } = {},
): React.FC<P> {
  const displayName = Component.displayName ?? Component.name ?? "Component";

  const WithAuthRequired: React.FC<P> = (props) => {
    const { isAuthenticated, isLoading, loginWithRedirect } = useAuthFlow();

    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        loginWithRedirect();
      }
    }, [isLoading, isAuthenticated, loginWithRedirect]);

    if (isLoading || !isAuthenticated) return null;

    return <Component {...props} />;
  };

  WithAuthRequired.displayName = `withAuthRequired(${displayName})`;
  return WithAuthRequired;
}
