import { useEffect, useRef, useState } from "react";
import { useAuthFlow } from "./AuthFlowContext";
import { AuthFlowError } from "@authflow/js";

export type CallbackStatus = "loading" | "success" | "error";

export interface UseAuthCallbackResult {
  status: CallbackStatus;
  error: string | null;
}

/**
 * Drop this in your /callback route component.
 * Handles the token exchange and calls onSuccess or onError when done.
 *
 * @example
 *   function CallbackPage() {
 *     const { status, error } = useAuthCallback({
 *       onSuccess: () => navigate("/dashboard"),
 *       onError:   (err) => navigate("/login?error=" + err),
 *     });
 *
 *     if (status === "loading") return <Spinner />;
 *     if (status === "error")   return <div>Login failed: {error}</div>;
 *     return null;
 *   }
 */
export const useAuthCallback = (
  options: {
    onSuccess?: () => void;
    onError?: (error: string) => void;
  } = {},
): UseAuthCallbackResult => {
  const { handleRedirectCallback } = useAuthFlow();
  const [status, setStatus] = useState<CallbackStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  // Guard against double-execution in React 18 StrictMode
  // (effects run twice in dev — we only want one token exchange)
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    handleRedirectCallback()
      .then(() => {
        setStatus("success");
        options.onSuccess?.();
      })
      .catch((err: unknown) => {
        const message =
          err instanceof AuthFlowError
            ? (err.errorDescription ?? err.error)
            : err instanceof Error
              ? err.message
              : "Unknown error during login callback.";

        setStatus("error");
        setError(message);
        options.onError?.(message);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { status, error };
};
