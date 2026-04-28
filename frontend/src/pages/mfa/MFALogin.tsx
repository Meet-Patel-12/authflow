import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Shield, ArrowLeft, Key } from "lucide-react";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { completeMFALogin } from "../../store/authSlice";
import { Spinner, Alert } from "../../components/ui";
import { OtpInput } from "./OtpInput";

const MFALogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();

  const { mfaUserId, mfaOrganizationId } = useAppSelector((s) => s.auth);
  const userId = mfaUserId || (location.state?.userId as string);
  const organizationId =
    mfaOrganizationId || (location.state?.organizationId as string);

  const [code, setCode] = useState("");
  const [useBackup, setUseBackup] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!userId || !organizationId) {
    navigate("/login", { replace: true });
    return null;
  }

  const handleSubmit = async () => {
    if (!useBackup && code.length !== 6) {
      toast.error("Enter all 6 digits");
      return;
    }
    if (useBackup && code.length < 8) {
      toast.error("Enter a valid backup code");
      return;
    }

    setLoading(true);
    try {
      await dispatch(
        completeMFALogin({
          userId,
          organizationId,
          token: code,
          useBackupCode: useBackup,
        }),
      ).unwrap();
      toast.success("Welcome back!");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      toast.error(
        typeof err === "string" ? err : "Invalid code. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setUseBackup(!useBackup);
    setCode("");
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
            "radial-gradient(ellipse 70% 50% at 50% -10%, rgba(99,102,241,0.12), transparent), radial-gradient(ellipse 50% 40% at 80% 90%, rgba(6,182,212,0.06), transparent)",
        }}
      />
      <div className="absolute inset-0 bg-grid opacity-40 pointer-events-none" />

      <div className="w-full max-w-sm relative z-10 animate-slide-up">
        {/* Logo mark */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{
              background: "linear-gradient(135deg, #6366f1, #818cf8)",
              boxShadow: "0 0 32px rgba(99,102,241,0.4)",
            }}>
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h1
            className="text-xl font-bold"
            style={{ color: "var(--text-primary)" }}>
            Two-Factor Authentication
          </h1>
          <p
            className="text-sm mt-1.5"
            style={{ color: "var(--text-muted)" }}>
            {useBackup
              ? "Enter one of your saved backup codes"
              : "Enter the code from your authenticator app"}
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
          {/* TOTP — individual boxes */}
          {!useBackup ? (
            <div className="space-y-3">
              <label className="label-dark text-center block">
                Authentication Code
              </label>
              <OtpInput
                value={code}
                onChange={setCode}
                length={6}
                autoFocus
                onComplete={handleSubmit}
              />
            </div>
          ) : (
            /* Backup code — single text input */
            <div>
              <label className="label-dark">Backup Code</label>
              <div className="relative">
                <Key
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: "var(--text-muted)" }}
                />
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="XXXXXXXX-XXXX"
                  className="input-dark pl-9 font-mono tracking-wider"
                  maxLength={20}
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                />
              </div>
            </div>
          )}

          <Alert variant="warning">
            {useBackup
              ? "Each backup code can only be used once."
              : "Codes rotate every 30 seconds — enter it before the timer resets."}
          </Alert>

          <button
            onClick={handleSubmit}
            disabled={loading || (!useBackup && code.length !== 6)}
            className="btn btn-primary w-full py-2.5 gap-2">
            {loading ? (
              <>
                <Spinner size={14} /> Verifying...
              </>
            ) : (
              "Verify"
            )}
          </button>

          {/* Toggle backup / TOTP */}
          <button
            type="button"
            onClick={switchMode}
            className="w-full text-xs text-center transition-colors py-1"
            style={{ color: "var(--accent)" }}
            onMouseOver={(e) =>
              ((e.currentTarget as HTMLElement).style.opacity = "0.8")
            }
            onMouseOut={(e) =>
              ((e.currentTarget as HTMLElement).style.opacity = "1")
            }>
            {useBackup
              ? "Use authenticator app instead"
              : "Use a backup code instead"}
          </button>
        </div>

        {/* Back to login */}
        <button
          onClick={() => navigate("/login")}
          className="flex items-center justify-center gap-1.5 w-full text-xs mt-5 transition-colors"
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
        </button>
      </div>
    </div>
  );
};

export default MFALogin;
