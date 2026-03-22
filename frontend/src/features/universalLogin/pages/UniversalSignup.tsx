import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Lock,
  Mail,
  User,
  AlertCircle,
  Eye,
  EyeOff,
  WifiOff,
  RefreshCw,
} from "lucide-react";
import {
  fetchAppInfo,
  completeRegister,
  type AppInfo,
} from "../api/universalLogin.api";

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
      .catch((err: any) => {
        setIsLoadingApp(false);
        const isNetwork =
          err?.code === "ERR_NETWORK" ||
          err?.code === "ECONNABORTED" ||
          err?.code === "ERR_CANCELED" ||
          !err?.response;

        if (isNetwork) {
          setAppErrorType("network");
          setAppError(
            "Unable to reach the authentication server. Please check your connection and try again.",
          );
        } else if (err?.response?.status === 404) {
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
    } catch (err: any) {
      const msg =
        err?.response?.data?.error_description ??
        err?.response?.data?.message ??
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="card max-w-md w-full text-center">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${isNetwork ? "bg-amber-100" : "bg-red-100"}`}>
            {isNetwork ? (
              <WifiOff className="w-6 h-6 text-amber-600" />
            ) : (
              <AlertCircle className="w-6 h-6 text-red-600" />
            )}
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            {isNetwork ? "Connection failed" : "Invalid signup link"}
          </h2>
          <p className="text-sm text-gray-500 mb-5">{appError}</p>
          {isNetwork && (
            <button
              onClick={() => setRetryCount((c) => c + 1)}
              disabled={isLoadingApp}
              className="btn btn-primary gap-2">
              {isLoadingApp ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  // ─── Signup form ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-in">
        {/* App header */}
        <div className="text-center mb-8">
          {appInfo.logo ? (
            <img
              src={appInfo.logo}
              alt={appInfo.name}
              className="w-14 h-14 rounded-xl object-cover mx-auto mb-4 shadow-sm"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-primary-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
              <span className="text-xl font-bold text-white">
                {appInfo.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-900">
            Create your account
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Sign up to continue to {appInfo.name}
          </p>
        </div>

        {/* Form card */}
        <div className="card">
          {serverError && (
            <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700">{serverError}</p>
            </div>
          )}

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-5">
            {/* Name */}
            <div>
              <label className="label">Full name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  {...register("name")}
                  type="text"
                  className="input pl-10"
                  placeholder="John Doe"
                  autoComplete="name"
                  autoFocus
                />
              </div>
              {errors.name && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="label">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  {...register("email")}
                  type="email"
                  className="input pl-10"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  className="input pl-10 pr-10"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label className="label">Confirm password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  {...register("confirmPassword")}
                  type={showConfirm ? "text" : "password"}
                  className="input pl-10 pr-10"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showConfirm ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary w-full py-3">
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  Creating account...
                </span>
              ) : (
                "Create account"
              )}
            </button>
          </form>

          {/* Sign in link */}
          <div className="mt-5 text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link
              to={`/universal/login?${searchParams.toString()}`}
              className="text-primary-600 hover:text-primary-700 font-medium">
              Sign in
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          Secured by{" "}
          <span className="font-semibold text-gray-500">AuthFlow</span>
        </p>
      </div>
    </div>
  );
};

export default UniversalSignup;
