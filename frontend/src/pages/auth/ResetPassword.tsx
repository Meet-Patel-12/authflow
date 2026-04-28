import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  CheckCircle,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { authService } from "../../api/auth.api";
import { Spinner, Alert } from "../../components/ui";

const PwRequirement = ({ met, label }: { met: boolean; label: string }) => (
  <div className="flex items-center gap-1.5">
    <CheckCircle
      className="w-3 h-3 flex-shrink-0"
      style={{ color: met ? "var(--success)" : "var(--text-muted)" }}
    />
    <span
      className="text-xs"
      style={{ color: met ? "var(--text-secondary)" : "var(--text-muted)" }}>
      {label}
    </span>
  </div>
);

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const requirements = [
    { met: password.length >= 8, label: "At least 8 characters" },
    { met: /[A-Z]/.test(password), label: "One uppercase letter" },
    { met: /[a-z]/.test(password), label: "One lowercase letter" },
    { met: /[0-9]/.test(password), label: "One number" },
  ];
  const allMet = requirements.every((r) => r.met);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast.error("Invalid or expired reset link");
      return;
    }
    if (!allMet) {
      toast.error("Password doesn't meet all requirements");
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword(token, password);
      toast.success("Password updated successfully");
      navigate("/login");
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ background: "var(--bg-base)" }}>
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% -10%, rgba(99,102,241,0.12), transparent), radial-gradient(ellipse 50% 40% at 10% 90%, rgba(16,185,129,0.05), transparent)",
        }}
      />
      <div className="absolute inset-0 bg-grid opacity-40 pointer-events-none" />

      <div className="w-full max-w-sm relative z-10 animate-slide-up">
        {/* Back link */}
        <Link
          to="/login"
          className="flex items-center gap-1.5 text-xs mb-6 transition-colors w-fit"
          style={{ color: "var(--text-muted)" }}
          onMouseOver={(e) =>
            ((e.currentTarget as HTMLElement).style.color =
              "var(--text-secondary)")
          }
          onMouseOut={(e) =>
            ((e.currentTarget as HTMLElement).style.color = "var(--text-muted)")
          }>
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to login
        </Link>

        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4"
            style={{
              background: "linear-gradient(135deg, #6366f1, #818cf8)",
              boxShadow: "0 0 32px rgba(99,102,241,0.4)",
            }}>
            <KeyRound className="w-6 h-6 text-white" />
          </div>
          <h1
            className="text-xl font-bold mb-1"
            style={{ color: "var(--text-primary)" }}>
            Set new password
          </h1>
          <p
            className="text-sm"
            style={{ color: "var(--text-muted)" }}>
            Choose a strong password for your account
          </p>
        </div>

        {/* Invalid token warning */}
        {!token && (
          <Alert
            variant="danger"
            className="mb-5">
            This reset link is invalid or has expired.{" "}
            <Link
              to="/forgot-password"
              style={{ color: "var(--danger)", textDecoration: "underline" }}>
              Request a new one
            </Link>
          </Alert>
        )}

        {/* Card */}
        <div
          className="rounded-2xl p-7 space-y-5"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
          }}>
          <form
            onSubmit={handleSubmit}
            className="space-y-5">
            {/* Password input */}
            <div>
              <label className="label-dark">New password</label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: "var(--text-muted)" }}
                />
                <input
                  type={showPw ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-dark pl-9 pr-9"
                  autoFocus
                  disabled={!token}
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
            </div>

            {/* Requirements checklist */}
            {password.length > 0 && (
              <div
                className="rounded-xl p-3 grid grid-cols-2 gap-1.5"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid var(--border)",
                }}>
                {requirements.map((r) => (
                  <PwRequirement
                    key={r.label}
                    met={r.met}
                    label={r.label}
                  />
                ))}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !token || !allMet}
              className="btn btn-primary w-full gap-2 py-2.5">
              {loading ? (
                <>
                  <Spinner size={14} /> Updating...
                </>
              ) : (
                "Update password"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
