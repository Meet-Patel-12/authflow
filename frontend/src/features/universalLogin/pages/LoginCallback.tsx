import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle, AlertCircle } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CallbackTokens {
  access_token: string;
  refresh_token: string;
  id_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

interface LoginCallbackProps {
  // The developer passes their backend token-exchange URL.
  // Their server calls POST /oauth/token with the code + client_secret.
  // This component never touches client_secret — that stays server-side.
  tokenExchangeUrl?: string;

  // Called with the tokens once exchange succeeds.
  // Developer uses this to store tokens and redirect to their app.
  onSuccess?: (tokens: CallbackTokens) => void;

  // Called if the exchange fails.
  onError?: (error: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * LoginCallback — drop this at /callback in the developer's app.
 *
 * Reads the authorization code from the URL, exchanges it for tokens
 * via the developer's own backend (so client_secret never touches the browser),
 * then calls onSuccess with the token set.
 *
 * Example usage in the developer's React app:
 *
 *   <Route
 *     path="/callback"
 *     element={
 *       <LoginCallback
 *         tokenExchangeUrl="https://my-api.com/auth/callback"
 *         onSuccess={(tokens) => {
 *           localStorage.setItem("access_token", tokens.access_token);
 *           navigate("/dashboard");
 *         }}
 *         onError={(err) => navigate("/login?error=" + err)}
 *       />
 *     }
 *   />
 *
 * The developer's backend at /auth/callback should:
 *   1. Receive { code, state, redirect_uri } from this component
 *   2. POST to /oauth/token with code + client_id + client_secret
 *   3. Return the tokens to this component
 */
const LoginCallback = ({
  tokenExchangeUrl,
  onSuccess,
  onError,
}: LoginCallbackProps) => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    // If AuthFlow returned an error (e.g. user denied, invalid params)
    if (error) {
      const msg = errorDescription ?? error;
      setErrorMessage(msg);
      setStatus("error");
      onError?.(msg);
      return;
    }

    if (!code) {
      const msg = "No authorization code returned.";
      setErrorMessage(msg);
      setStatus("error");
      onError?.(msg);
      return;
    }

    // If no tokenExchangeUrl provided, just surface the code — the developer
    // handles the exchange themselves (e.g. server-side rendered apps)
    if (!tokenExchangeUrl) {
      setStatus("success");
      return;
    }

    // Exchange code for tokens via the developer's backend
    const exchange = async () => {
      try {
        const res = await fetch(tokenExchangeUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
            state,
            redirect_uri: window.location.origin + window.location.pathname,
          }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            body?.error_description ?? body?.message ?? "Token exchange failed",
          );
        }

        const tokens: CallbackTokens = await res.json();
        setStatus("success");
        onSuccess?.(tokens);
      } catch (err: any) {
        const msg = err?.message ?? "Token exchange failed.";
        setErrorMessage(msg);
        setStatus("error");
        onError?.(msg);
      }
    };

    exchange();
  }, []);

  // ─── Loading ─────────────────────────────────────────────────────────────────

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto mb-4" />
          <p className="text-sm text-gray-500">Completing sign in...</p>
        </div>
      </div>
    );
  }

  // ─── Success ─────────────────────────────────────────────────────────────────

  if (status === "success") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="card max-w-sm w-full text-center">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Signed in successfully
          </h2>
          <p className="text-sm text-gray-500">Redirecting you now...</p>
        </div>
      </div>
    );
  }

  // ─── Error ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="card max-w-sm w-full text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6 text-red-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Sign in failed
        </h2>
        <p className="text-sm text-gray-500 mb-4">{errorMessage}</p>
        <button
          onClick={() => window.history.back()}
          className="btn btn-outline text-sm">
          Go back
        </button>
      </div>
    </div>
  );
};

export default LoginCallback;
