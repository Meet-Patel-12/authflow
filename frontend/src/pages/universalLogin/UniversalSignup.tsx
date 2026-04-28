import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { AxiosError } from "axios";
import {
  Lock,
  Mail,
  User,
  AlertCircle,
  Eye,
  EyeOff,
  WifiOff,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import {
  fetchAppInfo,
  completeRegister,
  type AppInfo,
} from "../../api/universalLogin.api";

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Please enter a valid email"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Must contain uppercase, lowercase, and a number",
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

// ─── Component ────────────────────────────────────────────────────────────────

const UniversalSignup = () => {
  const [searchParams] = useSearchParams();
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [appError, setAppError] = useState<string | null>(null);
  const [appErrorType, setAppErrorType] = useState<
    "network" | "notfound" | "invalid" | null
  >(null);
  const [isLoadingApp, setIsLoadingApp] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clientId = searchParams.get("client_id") ?? "";
  const redirectUri = searchParams.get("redirect_uri") ?? "";
  const scope = searchParams.get("scope") ?? "openid";
  const state = searchParams.get("state") ?? undefined;
  const codeChallenge = searchParams.get("code_challenge") ?? undefined;
  const codeChallengeMethod =
    searchParams.get("code_challenge_method") ?? undefined;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!clientId) {
      setAppError("Missing client_id. This signup link is invalid.");
      setAppErrorType("invalid");
      return;
    }

    setIsLoadingApp(true);
    setAppError(null);
    setAppErrorType(null);

    fetchAppInfo(clientId)
      .then((info) => {
        setAppInfo(info);
        setIsLoadingApp(false);
      })
      .catch((err: AxiosError | unknown) => {
        setIsLoadingApp(false);
        const axiosErr = err as AxiosError & { code?: string };
        const isNetwork =
          axiosErr?.code === "ERR_NETWORK" ||
          axiosErr?.code === "ECONNABORTED" ||
          axiosErr?.code === "ERR_CANCELED" ||
          !axiosErr?.response;

        if (isNetwork) {
          setAppErrorType("network");
          setAppError(
            "Unable to reach the authentication server. Please check your connection and try again.",
          );
        } else if (axiosErr?.response?.status === 404) {
          setAppErrorType("notfound");
          setAppError(
            "Application not found. This signup link may be invalid or expired.",
          );
        } else {
          setAppErrorType("notfound");
          setAppError(
            "Application not found. This signup link may be invalid.",
          );
        }
      });
  }, [clientId, retryCount]);

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    setIsSubmitting(true);

    try {
      const result = await completeRegister({
        name: data.name,
        email: data.email,
        password: data.password,
        client_id: clientId,
        redirect_uri: redirectUri,
        scope,
        state,
        code_challenge: codeChallenge,
        code_challenge_method: codeChallengeMethod,
      });

      window.location.href = result.redirectUrl;
    } catch (err: AxiosError | unknown) {
      const axiosErr = err as AxiosError<{
        error_description?: string;
        message?: string;
      }>;
      const msg =
        axiosErr?.response?.data?.error_description ??
        axiosErr?.response?.data?.message ??
        "Registration failed. Please try again.";
      setServerError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Error state (network unreachable or app not found) ─────────────────────

  if (appError) {
    const isNetwork = appErrorType === "network";
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4 animate-fade-in"
        style={{
          background: `linear-gradient(135deg, var(--bg-base) 0%, ${
            isNetwork ? "rgba(245,158,11,0.05)" : "rgba(244,63,94,0.05)"
          } 100%)`,
        }}>
        <div
          className="rounded-2xl p-8 max-w-md w-full text-center animate-slide-up"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          }}>
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{
              background: isNetwork
                ? "linear-gradient(135deg, rgba(245,158,11,0.2), rgba(251,191,36,0.2))"
                : "linear-gradient(135deg, rgba(244,63,94,0.2), rgba(239,68,68,0.2))",
            }}>
            {isNetwork ? (
              <WifiOff
                className="w-6 h-6"
                style={{ color: "#f59e0b" }}
              />
            ) : (
              <AlertCircle
                className="w-6 h-6"
                style={{ color: "#ef4444" }}
              />
            )}
          </div>
          <h2
            className="text-lg font-semibold mb-2"
            style={{ color: "var(--text-primary)" }}>
            {isNetwork ? "Connection failed" : "Invalid signup link"}
          </h2>
          <p
            className="text-sm mb-5"
            style={{ color: "var(--text-muted)" }}>
            {appError}
          </p>
          {isNetwork && (
            <button
              onClick={() => setRetryCount((c) => c + 1)}
              disabled={isLoadingApp}
              className="w-full px-4 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2"
              style={{
                background: isLoadingApp
                  ? "rgba(245,158,11,0.15)"
                  : "rgba(245,158,11,0.1)",
                border: "1px solid rgba(245,158,11,0.2)",
                color: "#f59e0b",
              }}
              onMouseEnter={(e) => {
                if (!isLoadingApp) {
                  (e.target as HTMLElement).style.background =
                    "rgba(245,158,11,0.15)";
                }
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.background =
                  "rgba(245,158,11,0.1)";
              }}>
              {isLoadingApp ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {isLoadingApp ? "Retrying..." : "Try again"}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── Loading ─────────────────────────────────────────────────────────────────

  if (!appInfo) {
    return (
      <div
        className="min-h-screen flex items-center justify-center animate-fade-in"
        style={{
          background:
            "linear-gradient(135deg, var(--bg-base) 0%, rgba(99,102,241,0.05) 100%)",
        }}>
        <div
          className="animate-spin rounded-full h-8 w-8 border-b-2"
          style={{ borderBottomColor: "#6366f1" }}
        />
      </div>
    );
  }

  // ─── Signup form ─────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 animate-fade-in"
      style={{
        background:
          "linear-gradient(135deg, var(--bg-base) 0%, rgba(99,102,241,0.05) 100%)",
      }}>
      <div className="w-full max-w-md animate-slide-up">
        {/* App header */}
        <div className="text-center mb-8">
          {appInfo.logo ? (
            <img
              src={appInfo.logo}
              alt={appInfo.name}
              className="w-14 h-14 rounded-xl object-cover mx-auto mb-4 shadow-lg"
            />
          ) : (
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg"
              style={{
                background: "linear-gradient(135deg, #6366f1, #818cf8)",
              }}>
              <span className="text-xl font-bold text-white">
                {appInfo.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--text-primary)" }}>
            Create your account
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--text-muted)" }}>
            Sign up to continue to {appInfo.name}
          </p>
        </div>

        {/* Form card */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          }}>
          {serverError && (
            <div
              className="mb-5 p-3 rounded-lg flex items-start gap-2 animate-fade-in"
              style={{
                background: "rgba(244,63,94,0.1)",
                border: "1px solid rgba(244,63,94,0.2)",
              }}>
              <AlertCircle
                className="w-4 h-4 mt-0.5 shrink-0"
                style={{ color: "#f43f5e" }}
              />
              <p
                className="text-sm"
                style={{ color: "#f43f5e" }}>
                {serverError}
              </p>
            </div>
          )}

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-5">
            {/* Name */}
            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: "var(--text-primary)" }}>
                Full name
              </label>
              <div className="relative">
                <User
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5"
                  style={{ color: "var(--text-muted)" }}
                />
                <input
                  {...register("name")}
                  type="text"
                  placeholder="John Doe"
                  autoComplete="name"
                  autoFocus
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg transition-colors"
                  style={{
                    background: "var(--bg-base)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>
              {errors.name && (
                <p
                  className="mt-1 text-sm flex items-center gap-1"
                  style={{ color: "#f43f5e" }}>
                  <AlertCircle className="w-4 h-4" />
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: "var(--text-primary)" }}>
                Email address
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5"
                  style={{ color: "var(--text-muted)" }}
                />
                <input
                  {...register("email")}
                  type="email"
                  placeholder="john@example.com"
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg transition-colors"
                  style={{
                    background: "var(--bg-base)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>
              {errors.email && (
                <p
                  className="mt-1 text-sm flex items-center gap-1"
                  style={{ color: "#f43f5e" }}>
                  <AlertCircle className="w-4 h-4" />
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: "var(--text-primary)" }}>
                Password
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5"
                  style={{ color: "var(--text-muted)" }}
                />
                <input
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg transition-colors"
                  style={{
                    background: "var(--bg-base)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "var(--text-muted)" }}>
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p
                  className="mt-1 text-sm flex items-center gap-1"
                  style={{ color: "#f43f5e" }}>
                  <AlertCircle className="w-4 h-4" />
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: "var(--text-primary)" }}>
                Confirm password
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5"
                  style={{ color: "var(--text-muted)" }}
                />
                <input
                  {...register("confirmPassword")}
                  type={showConfirm ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg transition-colors"
                  style={{
                    background: "var(--bg-base)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "var(--text-muted)" }}>
                  {showConfirm ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p
                  className="mt-1 text-sm flex items-center gap-1"
                  style={{ color: "#f43f5e" }}>
                  <AlertCircle className="w-4 h-4" />
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2"
              style={{
                background: isSubmitting
                  ? "rgba(99,102,241,0.6)"
                  : "linear-gradient(135deg, #6366f1, #818cf8)",
                color: "white",
                boxShadow: !isSubmitting
                  ? "0 8px 16px rgba(99,102,241,0.3)"
                  : "none",
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting) {
                  (e.target as HTMLElement).style.boxShadow =
                    "0 12px 24px rgba(99,102,241,0.4)";
                }
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.boxShadow =
                  "0 8px 16px rgba(99,102,241,0.3)";
              }}>
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  Creating account...
                </>
              ) : (
                <>
                  <ArrowRight className="w-4 h-4" />
                  Create account
                </>
              )}
            </button>
          </form>

          {/* Sign in link */}
          <div
            className="mt-5 text-center text-sm"
            style={{ color: "var(--text-muted)" }}>
            Already have an account?{" "}
            <Link
              to={`/universal/login?${searchParams.toString()}`}
              className="font-medium transition-colors"
              style={{ color: "#6366f1" }}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.color = "#818cf8";
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.color = "#6366f1";
              }}>
              Sign in
            </Link>
          </div>
        </div>

        {/* AuthFlow branding */}
        <p
          className="mt-6 text-center text-xs"
          style={{ color: "var(--text-muted)" }}>
          Secured by{" "}
          <span
            className="font-semibold"
            style={{ color: "var(--text-primary)" }}>
            AuthFlow
          </span>
        </p>
      </div>
    </div>
  );
};

export default UniversalSignup;
