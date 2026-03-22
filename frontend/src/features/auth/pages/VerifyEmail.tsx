import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  CheckCircle,
  AlertCircle,
  Mail,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { authService } from "../api/auth.api";

const VerifyEmail = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        await authService.verifyEmail(token);
        setVerified(true);
        toast.success("Email verified successfully");
      } catch (err) {
        const e = err as { response?: { data?: { message?: string } } };
        toast.error(e?.response?.data?.message || "Email verification failed");
      } finally {
        setLoading(false);
      }
    };
    verify();
  }, [token]);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ background: "var(--bg-base)" }}>
      {/* Background glow — colour shifts with state */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-700"
        style={{
          background: loading
            ? "radial-gradient(ellipse 70% 50% at 50% -10%, rgba(99,102,241,0.10), transparent)"
            : verified
              ? "radial-gradient(ellipse 70% 50% at 50% -10%, rgba(16,185,129,0.10), transparent)"
              : "radial-gradient(ellipse 70% 50% at 50% -10%, rgba(244,63,94,0.08), transparent)",
        }}
      />
      <div className="absolute inset-0 bg-grid opacity-40 pointer-events-none" />

      <div className="w-full max-w-sm relative z-10 animate-slide-up">
        <div
          className="rounded-2xl p-8 text-center"
          style={{
            background: "var(--bg-elevated)",
            border: `1px solid ${
              loading
                ? "var(--border)"
                : verified
                  ? "rgba(16,185,129,0.2)"
                  : "rgba(244,63,94,0.2)"
            }`,
            boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
            transition: "border-color 0.4s",
          }}>
          {/* ── Loading ── */}
          {loading && (
            <div className="space-y-5">
              <div
                className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mx-auto"
                style={{
                  background: "linear-gradient(135deg, #6366f1, #818cf8)",
                  boxShadow: "0 0 32px rgba(99,102,241,0.4)",
                }}>
                <Mail className="w-7 h-7 text-white" />
              </div>

              <div>
                <h1
                  className="text-lg font-bold mb-1"
                  style={{ color: "var(--text-primary)" }}>
                  Verifying your email…
                </h1>
                <p
                  className="text-sm"
                  style={{ color: "var(--text-muted)" }}>
                  Please wait a moment
                </p>
              </div>

              <div className="flex justify-center">
                <div
                  className="w-10 h-10 rounded-full border-2 animate-spin"
                  style={{
                    borderColor: "rgba(99,102,241,0.3)",
                    borderTopColor: "var(--accent)",
                  }}
                />
              </div>

              <div className="flex justify-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full animate-bounce"
                    style={{
                      background: "var(--accent)",
                      opacity: 0.6,
                      animationDelay: `${i * 0.15}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Success ── */}
          {!loading && verified && (
            <div className="space-y-5 animate-slide-up">
              <div
                className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mx-auto"
                style={{
                  background: "var(--success-dim)",
                  boxShadow: "0 0 32px rgba(16,185,129,0.3)",
                }}>
                <CheckCircle
                  className="w-7 h-7"
                  style={{ color: "var(--success)" }}
                />
              </div>

              <div>
                <h1
                  className="text-lg font-bold mb-1"
                  style={{ color: "var(--text-primary)" }}>
                  Email verified!
                </h1>
                <p
                  className="text-sm"
                  style={{ color: "var(--text-muted)" }}>
                  Your email has been confirmed. You can now sign in to your
                  account.
                </p>
              </div>

              {/* Confirmed item */}
              <div
                className="rounded-xl p-3 flex items-center gap-3 text-left"
                style={{
                  background: "var(--success-dim)",
                  border: "1px solid rgba(16,185,129,0.2)",
                }}>
                <CheckCircle
                  className="w-4 h-4 flex-shrink-0"
                  style={{ color: "var(--success)" }}
                />
                <p
                  className="text-xs"
                  style={{ color: "var(--success)" }}>
                  Your account is now fully active
                </p>
              </div>

              <button
                onClick={() => navigate("/login")}
                className="btn btn-primary w-full gap-2 py-2.5">
                Go to Login <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── Failed ── */}
          {!loading && !verified && (
            <div className="space-y-5 animate-slide-up">
              <div
                className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mx-auto"
                style={{
                  background: "var(--danger-dim)",
                  boxShadow: "0 0 32px rgba(244,63,94,0.25)",
                }}>
                <AlertCircle
                  className="w-7 h-7"
                  style={{ color: "var(--danger)" }}
                />
              </div>

              <div>
                <h1
                  className="text-lg font-bold mb-1"
                  style={{ color: "var(--text-primary)" }}>
                  Verification failed
                </h1>
                <p
                  className="text-sm"
                  style={{ color: "var(--text-muted)" }}>
                  This link is invalid or has expired. Links are valid for 24
                  hours.
                </p>
              </div>

              {/* Tip */}
              <div
                className="rounded-xl p-3 space-y-1.5 text-left"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid var(--border)",
                }}>
                {[
                  "Make sure you used the latest link from your inbox",
                  "Check your spam or junk folder",
                  "Request a new verification email from your account settings",
                ].map((tip) => (
                  <div
                    key={tip}
                    className="flex items-start gap-2">
                    <div
                      className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0"
                      style={{ background: "var(--text-muted)" }}
                    />
                    <p
                      className="text-xs"
                      style={{ color: "var(--text-muted)" }}>
                      {tip}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => navigate("/login")}
                  className="btn btn-primary w-full gap-2 py-2.5">
                  Back to Login <ArrowRight className="w-4 h-4" />
                </button>
                <Link
                  to="/login"
                  className="btn btn-ghost w-full gap-2 text-sm">
                  <RefreshCw className="w-3.5 h-3.5" />
                  Request new verification email
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
