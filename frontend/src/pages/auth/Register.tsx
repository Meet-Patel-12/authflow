import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Lock,
  Mail,
  User,
  Building2,
  Eye,
  EyeOff,
  Github,
  Shield,
  CheckCircle,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { register as registerAction, clearError } from "../../store/authSlice";
import { Spinner, Alert } from "../../components/ui";

const schema = z.object({
  name: z.string().min(2, "At least 2 characters"),
  organizationName: z.string().optional().or(z.literal("")),
  email: z.string().email("Valid email required"),
  password: z
    .string()
    .min(8, "Min 8 characters")
    .regex(/[A-Z]/, "Needs uppercase")
    .regex(/[a-z]/, "Needs lowercase")
    .regex(/[0-9]/, "Needs a number"),
});
type FormData = z.infer<typeof schema>;

const PwRequirement = ({ met, label }: { met: boolean; label: string }) => (
  <div className="flex items-center gap-1.5 text-xs">
    <CheckCircle
      className="w-3 h-3"
      style={{ color: met ? "var(--success)" : "var(--text-muted)" }}
    />
    <span
      style={{ color: met ? "var(--text-secondary)" : "var(--text-muted)" }}>
      {label}
    </span>
  </div>
);

export default function Register() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const { loading, error, isAuthenticated } = useAppSelector((s) => s.auth);
  const [showPw, setShowPw] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });
  const pw = watch("password") || "";

  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard");
  }, [isAuthenticated]);
  useEffect(() => {
    dispatch(clearError());
  }, []);

  const onSubmit = async (data: FormData) => {
    try {
      await dispatch(
        registerAction({ ...data, inviteToken: inviteToken || undefined }),
      ).unwrap();
      toast.success("Account created!");
      navigate(inviteToken ? `/invite?token=${inviteToken}` : "/dashboard");
    } catch {
      /* handled */
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ background: "var(--bg-base)" }}>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% -20%, rgba(99,102,241,0.10), transparent), radial-gradient(ellipse 60% 40% at 0% 100%, rgba(16,185,129,0.05), transparent)",
        }}
      />
      <div className="absolute inset-0 bg-grid pointer-events-none opacity-50" />

      <div className="w-full max-w-md relative z-10 animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4"
            style={{
              background: "linear-gradient(135deg, #6366f1, #818cf8)",
              boxShadow: "0 0 32px rgba(99,102,241,0.4)",
            }}>
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h1
            className="text-2xl font-bold mb-1"
            style={{ color: "var(--text-primary)" }}>
            Start building
          </h1>
          <p
            className="text-sm"
            style={{ color: "var(--text-muted)" }}>
            Create your free AuthFlow account
          </p>
        </div>

        <div
          className="rounded-2xl p-7 space-y-5"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
          }}>
          {error && <Alert variant="danger">{error}</Alert>}
          {inviteToken && (
            <Alert variant="info">
              You're joining an organization via invite link.
            </Alert>
          )}

          {/* OAuth */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                window.location.href = `${import.meta.env.VITE_API_URL}/auth/google`;
              }}
              className="btn btn-ghost py-2.5 gap-2 text-sm">
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.href = `${import.meta.env.VITE_API_URL}/auth/github`;
              }}
              className="btn btn-ghost py-2.5 gap-2 text-sm">
              <Github className="w-4 h-4" />
              GitHub
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div
              className="flex-1"
              style={{ height: 1, background: "var(--border)" }}
            />
            <span
              className="text-xs"
              style={{ color: "var(--text-muted)" }}>
              or with email
            </span>
            <div
              className="flex-1"
              style={{ height: 1, background: "var(--border)" }}
            />
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4">
            <div>
              <label className="label-dark">Full name</label>
              <div className="relative">
                <User
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: "var(--text-muted)" }}
                />
                <input
                  {...register("name")}
                  placeholder="Jane Smith"
                  className="input-dark pl-9"
                />
              </div>
              {errors.name && (
                <p
                  className="mt-1 text-xs"
                  style={{ color: "var(--danger)" }}>
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label className="label-dark">
                Organization name{" "}
                <span style={{ color: "var(--text-muted)" }}>(optional)</span>
              </label>
              <div className="relative">
                <Building2
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: "var(--text-muted)" }}
                />
                <input
                  {...register("organizationName")}
                  placeholder="Acme Inc."
                  className="input-dark pl-9"
                />
              </div>
            </div>

            <div>
              <label className="label-dark">Email</label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: "var(--text-muted)" }}
                />
                <input
                  {...register("email")}
                  type="email"
                  placeholder="you@company.com"
                  className="input-dark pl-9"
                />
              </div>
              {errors.email && (
                <p
                  className="mt-1 text-xs"
                  style={{ color: "var(--danger)" }}>
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label className="label-dark">Password</label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: "var(--text-muted)" }}
                />
                <input
                  {...register("password")}
                  type={showPw ? "text" : "password"}
                  placeholder="••••••••"
                  className="input-dark pl-9 pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--text-muted)" }}>
                  {showPw ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {pw && (
                <div className="grid grid-cols-2 gap-1 mt-2">
                  <PwRequirement
                    met={pw.length >= 8}
                    label="8+ characters"
                  />
                  <PwRequirement
                    met={/[A-Z]/.test(pw)}
                    label="Uppercase"
                  />
                  <PwRequirement
                    met={/[a-z]/.test(pw)}
                    label="Lowercase"
                  />
                  <PwRequirement
                    met={/[0-9]/.test(pw)}
                    label="Number"
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full py-2.5">
              {loading ? (
                <>
                  <Spinner size={14} /> Creating account...
                </>
              ) : (
                "Create free account"
              )}
            </button>
          </form>
        </div>

        <p
          className="text-center text-sm mt-5"
          style={{ color: "var(--text-muted)" }}>
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-medium"
            style={{ color: "var(--accent)" }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
