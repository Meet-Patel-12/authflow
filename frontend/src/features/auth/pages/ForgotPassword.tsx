import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, Send, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { authService } from "../api/auth.api";
import { Spinner } from "../../../components/ui";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email");
      return;
    }

    setLoading(true);
    try {
      await authService.requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || "Failed to send reset link");
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
            "radial-gradient(ellipse 70% 50% at 50% -10%, rgba(99,102,241,0.12), transparent), radial-gradient(ellipse 50% 40% at 90% 90%, rgba(6,182,212,0.06), transparent)",
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

        {!sent ? (
          <>
            {/* Header */}
            <div className="text-center mb-8">
              <div
                className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4"
                style={{
                  background: "linear-gradient(135deg, #6366f1, #818cf8)",
                  boxShadow: "0 0 32px rgba(99,102,241,0.4)",
                }}>
                <Mail className="w-6 h-6 text-white" />
              </div>
              <h1
                className="text-xl font-bold mb-1"
                style={{ color: "var(--text-primary)" }}>
                Forgot your password?
              </h1>
              <p
                className="text-sm"
                style={{ color: "var(--text-muted)" }}>
                Enter your email and we'll send you a reset link
              </p>
            </div>

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
                className="space-y-4">
                <div>
                  <label className="label-dark">Email address</label>
                  <div className="relative">
                    <Mail
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                      style={{ color: "var(--text-muted)" }}
                    />
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-dark pl-9"
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="btn btn-primary w-full gap-2 py-2.5">
                  {loading ? (
                    <>
                      <Spinner size={14} /> Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> Send Reset Link
                    </>
                  )}
                </button>
              </form>
            </div>
          </>
        ) : (
          <>
            {/* Success state */}
            <div className="text-center mb-8">
              <div
                className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4"
                style={{
                  background: "var(--success-dim)",
                  boxShadow: "0 0 32px rgba(16,185,129,0.3)",
                }}>
                <CheckCircle
                  className="w-6 h-6"
                  style={{ color: "var(--success)" }}
                />
              </div>
              <h1
                className="text-xl font-bold mb-1"
                style={{ color: "var(--text-primary)" }}>
                Check your inbox
              </h1>
              <p
                className="text-sm"
                style={{ color: "var(--text-muted)" }}>
                We sent a password reset link to
              </p>
              <p
                className="text-sm font-semibold mt-1"
                style={{ color: "var(--text-primary)" }}>
                {email}
              </p>
            </div>

            <div
              className="rounded-2xl p-7 space-y-5"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
              }}>
              <div
                className="rounded-xl p-4 space-y-2"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid var(--border)",
                }}>
                {[
                  "The link expires in 1 hour",
                  "Check your spam folder if you don't see it",
                  "You can only request one link every few minutes",
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

              <button
                onClick={() => {
                  setSent(false);
                  setEmail("");
                }}
                className="btn btn-ghost w-full text-sm">
                Try a different email
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
