import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle, AlertCircle, Loader } from "lucide-react";

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
      } catch (e) {
        const err = e as { message?: string };
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
      <div
        className="min-h-screen flex items-center justify-center p-4 animate-fade-in"
        style={{
          background:
            "linear-gradient(135deg, var(--bg-base) 0%, rgba(99,102,241,0.05) 100%)",
        }}>
        <div
          className="rounded-2xl p-8 text-center max-w-sm w-full animate-slide-up"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          }}>
          <div className="flex justify-center mb-6">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{
                background:
                  "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))",
              }}>
              <Loader
                className="w-6 h-6 animate-spin"
                style={{ color: "#6366f1" }}
              />
            </div>
          </div>
          <p
            className="text-sm font-medium"
            style={{ color: "var(--text-primary)" }}>
            Completing sign in...
          </p>
          <p
            className="text-xs mt-2"
            style={{ color: "var(--text-muted)" }}>
            Please wait while we authenticate you
          </p>
        </div>
      </div>
    );
  }

  // ─── Success ─────────────────────────────────────────────────────────────────

  if (status === "success") {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4 animate-fade-in"
        style={{
          background:
            "linear-gradient(135deg, var(--bg-base) 0%, rgba(16,185,129,0.05) 100%)",
        }}>
        <div
          className="rounded-2xl p-8 text-center max-w-sm w-full animate-slide-up"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          }}>
          <div className="flex justify-center mb-6">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{
                background:
                  "linear-gradient(135deg, rgba(16,185,129,0.2), rgba(34,197,94,0.2))",
              }}>
              <CheckCircle
                className="w-7 h-7"
                style={{ color: "#10b981" }}
              />
            </div>
          </div>
          <h2
            className="text-lg font-semibold mb-1"
            style={{ color: "var(--text-primary)" }}>
            Signed in successfully
          </h2>
          <p
            className="text-sm"
            style={{ color: "var(--text-muted)" }}>
            Redirecting you to your account...
          </p>
        </div>
      </div>
    );
  }

  // ─── Error ───────────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 animate-fade-in"
      style={{
        background:
          "linear-gradient(135deg, var(--bg-base) 0%, rgba(244,63,94,0.05) 100%)",
      }}>
      <div
        className="rounded-2xl p-8 text-center max-w-sm w-full animate-slide-up"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}>
        <div className="flex justify-center mb-6">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg, rgba(244,63,94,0.2), rgba(239,68,68,0.2))",
            }}>
            <AlertCircle
              className="w-7 h-7"
              style={{ color: "#f43f5e" }}
            />
          </div>
        </div>
        <h2
          className="text-lg font-semibold mb-2"
          style={{ color: "var(--text-primary)" }}>
          Sign in failed
        </h2>
        <p
          className="text-sm mb-6"
          style={{ color: "var(--text-muted)" }}>
          {errorMessage}
        </p>
        <button
          onClick={() => window.history.back()}
          className="w-full px-4 py-2.5 rounded-lg font-medium transition-all duration-200"
          style={{
            background: "rgba(244,63,94,0.1)",
            border: "1px solid rgba(244,63,94,0.2)",
            color: "#f43f5e",
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.background = "rgba(244,63,94,0.15)";
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.background = "rgba(244,63,94,0.1)";
          }}>
          Go back
        </button>
      </div>
    </div>
  );
};

export default LoginCallback;
