import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Shield,
  Lock,
  KeyRound,
  Download,
  CheckCircle,
  XCircle,
  ArrowRight,
  X,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { getCurrentUser } from "../../store/authSlice";
import { mfaService } from "../../api/mfa.api";
import api from "../../app/apiClient";
import { Spinner, Alert } from "../../components/ui";

const pwSchema = z
  .object({
    currentPassword: z.string().min(1, "Required"),
    newPassword: z
      .string()
      .min(8, "Min 8 characters")
      .regex(/[A-Z]/, "Needs uppercase")
      .regex(/[0-9]/, "Needs number"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
type PwForm = z.infer<typeof pwSchema>;

const MfaModal = ({
  mode,
  onClose,
  onDone,
}: {
  mode: "disable" | "backup";
  onClose: () => void;
  onDone: () => void;
}) => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (code.length !== 6) {
      setError("Enter a 6-digit code");
      return;
    }
    setLoading(true);
    setError("");
    try {
      if (mode === "disable") {
        await mfaService.disableMFA(code);
        toast.success("2FA disabled");
      } else {
        const r = await mfaService.regenerateBackupCodes(code);
        const codes: string[] = r.data?.backupCodes || [];
        const blob = new Blob([codes.join("\n")], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "authflow-backup-codes.txt";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Backup codes downloaded");
      }
      onDone();
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message || "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2
            className="text-base font-semibold"
            style={{ color: "var(--text-primary)" }}>
            {mode === "disable" ? "Disable 2FA" : "Regenerate Backup Codes"}
          </h2>
          <button
            onClick={onClose}
            className="btn btn-ghost p-1.5">
            <X className="w-4 h-4" />
          </button>
        </div>
        {error && <Alert variant="danger">{error}</Alert>}
        <p
          className="text-sm"
          style={{ color: "var(--text-muted)" }}>
          Enter your authenticator code to confirm.
        </p>
        <div>
          <label className="label-dark">Verification code</label>
          <input
            value={code}
            onChange={(e) =>
              setCode(e.target.value.replace(/\D/, "").slice(0, 6))
            }
            placeholder="000000"
            className="input-dark text-center text-lg tracking-widest font-mono"
            maxLength={6}
          />
        </div>
        <div className="flex justify-end gap-3">
          <button
            className="btn btn-ghost"
            onClick={onClose}
            disabled={loading}>
            Cancel
          </button>
          <button
            className={`btn ${mode === "disable" ? "btn-danger" : "btn-primary"}`}
            onClick={handleSubmit}
            disabled={loading || code.length !== 6}>
            {loading ? (
              <Spinner size={14} />
            ) : mode === "disable" ? (
              "Disable 2FA"
            ) : (
              "Download codes"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function Security() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const [mfaModal, setMfaModal] = useState<"disable" | "backup" | null>(null);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PwForm>({
    resolver: zodResolver(pwSchema),
  });

  const onChangePw = async (data: PwForm) => {
    setPwLoading(true);
    setPwSuccess(false);
    try {
      await api.post("/auth/change-password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      setPwSuccess(true);
      reset();
      toast.success("Password changed");
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Failed to change password");
    } finally {
      setPwLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="page-title">Security</h1>
        <p className="page-subtitle">
          Manage your authentication and account security
        </p>
      </div>

      {/* 2FA section */}
      <div
        className="rounded-2xl p-6 mb-5 animate-slide-up"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
        }}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: user.mfaEnabled
                  ? "var(--success-dim)"
                  : "rgba(255,255,255,0.04)",
              }}>
              <Shield
                className="w-4 h-4"
                style={{
                  color: user.mfaEnabled
                    ? "var(--success)"
                    : "var(--text-muted)",
                }}
              />
            </div>
            <div>
              <p
                className="text-sm font-semibold"
                style={{ color: "var(--text-primary)" }}>
                Two-Factor Authentication
              </p>
              <p
                className="text-xs"
                style={{ color: "var(--text-muted)" }}>
                TOTP-based 2FA via authenticator app
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user.mfaEnabled ? (
              <CheckCircle
                className="w-4 h-4"
                style={{ color: "var(--success)" }}
              />
            ) : (
              <XCircle
                className="w-4 h-4"
                style={{ color: "var(--text-muted)" }}
              />
            )}
            <span
              className={`badge ${user.mfaEnabled ? "badge-success" : "badge-muted"}`}>
              {user.mfaEnabled ? "Enabled" : "Disabled"}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {!user.mfaEnabled ? (
            <button
              onClick={() => navigate("/mfa-setup")}
              className="btn btn-primary gap-2 text-sm">
              <Shield className="w-4 h-4" /> Enable 2FA
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <>
              <button
                onClick={() => setMfaModal("disable")}
                className="btn btn-danger text-sm gap-2">
                <XCircle className="w-4 h-4" /> Disable 2FA
              </button>
              <button
                onClick={() => setMfaModal("backup")}
                className="btn btn-ghost text-sm gap-2">
                <Download className="w-4 h-4" /> Backup codes
              </button>
            </>
          )}
        </div>

        {!user.mfaEnabled && (
          <Alert
            variant="warning"
            className="mt-4">
            Enabling 2FA significantly improves your account security.
          </Alert>
        )}
      </div>

      {/* Change password */}
      <div
        className="rounded-2xl p-6 animate-slide-up"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          animationDelay: "50ms",
        }}>
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "var(--accent-dim)" }}>
            <Lock
              className="w-4 h-4"
              style={{ color: "var(--accent)" }}
            />
          </div>
          <div>
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}>
              Change Password
            </p>
            <p
              className="text-xs"
              style={{ color: "var(--text-muted)" }}>
              Update your account password
            </p>
          </div>
        </div>

        {pwSuccess && (
          <Alert
            variant="success"
            className="mb-4">
            Password changed successfully.
          </Alert>
        )}

        <form
          onSubmit={handleSubmit(onChangePw)}
          className="space-y-4">
          {[
            {
              name: "currentPassword" as const,
              label: "Current password",
              placeholder: "••••••••",
            },
            {
              name: "newPassword" as const,
              label: "New password",
              placeholder: "••••••••",
            },
            {
              name: "confirmPassword" as const,
              label: "Confirm new password",
              placeholder: "••••••••",
            },
          ].map(({ name, label, placeholder }) => (
            <div key={name}>
              <label className="label-dark">{label}</label>
              <div className="relative">
                <KeyRound
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: "var(--text-muted)" }}
                />
                <input
                  {...register(name)}
                  type="password"
                  placeholder={placeholder}
                  className="input-dark pl-9"
                />
              </div>
              {errors[name] && (
                <p
                  className="mt-1 text-xs"
                  style={{ color: "var(--danger)" }}>
                  {errors[name]?.message}
                </p>
              )}
            </div>
          ))}
          <button
            type="submit"
            disabled={pwLoading}
            className="btn btn-primary gap-2">
            {pwLoading ? <Spinner size={14} /> : <Lock className="w-4 h-4" />}
            Update password
          </button>
        </form>
      </div>

      {mfaModal && (
        <MfaModal
          mode={mfaModal}
          onClose={() => setMfaModal(null)}
          onDone={() => {
            setMfaModal(null);
            dispatch(getCurrentUser());
          }}
        />
      )}
    </div>
  );
}
