import { useNavigate } from "react-router-dom";
import { useAppDispatch } from "../../../app/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { mfaService } from "../api/mfa.api";
import { getCurrentUser } from "../../auth/authSlice";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Download,
  Shield,
  Smartphone,
  Lock,
  Key,
} from "lucide-react";
import { Spinner, Alert, CopyButton } from "../../../components/ui";
import { OtpInput } from "./OtpInput";

type Step = "intro" | "scan" | "verify" | "backup";

const STEPS: { key: Step; label: string }[] = [
  { key: "intro", label: "Intro" },
  { key: "scan", label: "Scan QR" },
  { key: "verify", label: "Verify" },
  { key: "backup", label: "Backup Codes" },
];

const STEP_INDEX: Record<Step, number> = {
  intro: 0,
  scan: 1,
  verify: 2,
  backup: 3,
};

/* ─── Progress bar ─── */
const StepBar = ({ current }: { current: Step }) => {
  const idx = STEP_INDEX[current];
  return (
    <div className="flex items-center mb-10">
      {STEPS.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <div
            key={s.key}
            className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
                style={{
                  background: done
                    ? "var(--success)"
                    : active
                      ? "var(--accent)"
                      : "rgba(255,255,255,0.06)",
                  color: done || active ? "white" : "var(--text-muted)",
                  boxShadow: active
                    ? "0 0 16px var(--accent-glow)"
                    : done
                      ? "0 0 10px rgba(16,185,129,0.25)"
                      : "none",
                }}>
                {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span
                className="text-[10px] font-medium mt-1.5 whitespace-nowrap"
                style={{
                  color: active
                    ? "var(--accent)"
                    : done
                      ? "var(--success)"
                      : "var(--text-muted)",
                }}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className="flex-1 h-px mx-3 mb-5 transition-all duration-500"
                style={{
                  background: i < idx ? "var(--success)" : "var(--border)",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

/* ═══════════════════════════════════════════
   MAIN
═══════════════════════════════════════════ */
const MFASetup = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [step, setStep] = useState<Step>("intro");
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);

  const startSetup = async () => {
    setLoading(true);
    try {
      const res = await mfaService.setupMFA();
      setQrCode(res.data?.qrCode || "");
      setSecret(res.data?.secret || "");
      setBackupCodes(res.data?.backupCodes || []);
      setStep("scan");
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Failed to setup MFA");
    } finally {
      setLoading(false);
    }
  };

  const verifyAndEnable = async () => {
    if (verificationCode.length !== 6) {
      toast.error("Enter all 6 digits");
      return;
    }
    setLoading(true);
    try {
      await mfaService.verifyMFA(verificationCode);
      toast.success("Code verified!");
      setStep("backup");
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join("\n"));
    setCopiedBackup(true);
    toast.success("Codes copied!");
    setTimeout(() => setCopiedBackup(false), 2000);
  };

  const downloadBackupCodes = () => {
    const blob = new Blob([backupCodes.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "authflow-backup-codes.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Downloaded!");
  };

  const completeSetup = async () => {
    setLoading(true);
    try {
      await mfaService.activateMFA();
      await dispatch(getCurrentUser());
      toast.success("2FA is now active!");
      navigate("/settings");
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Failed to activate MFA");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      {/* Back */}
      <button
        onClick={() => navigate("/settings")}
        className="flex items-center gap-1.5 text-xs mb-6 transition-colors"
        style={{ color: "var(--text-muted)" }}
        onMouseOver={(e) =>
          ((e.currentTarget as HTMLElement).style.color =
            "var(--text-secondary)")
        }
        onMouseOut={(e) =>
          ((e.currentTarget as HTMLElement).style.color = "var(--text-muted)")
        }>
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Settings
      </button>

      <div className="mb-8">
        <h1 className="page-title">Two-Factor Authentication</h1>
        <p className="page-subtitle">
          Secure your account with a second verification step
        </p>
      </div>

      <StepBar current={step} />

      {/* ── STEP CARD ── */}
      <div
        className="rounded-2xl overflow-hidden animate-slide-up"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
        }}>
        {/* ── Intro ── */}
        {step === "intro" && (
          <div className="p-8">
            <div className="text-center mb-8">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                style={{
                  background: "var(--accent-dim)",
                  boxShadow: "0 0 32px var(--accent-glow)",
                }}>
                <Shield
                  className="w-8 h-8"
                  style={{ color: "var(--accent)" }}
                />
              </div>
              <h2
                className="text-base font-bold mb-2"
                style={{ color: "var(--text-primary)" }}>
                Protect your account
              </h2>
              <p
                className="text-sm max-w-sm mx-auto"
                style={{ color: "var(--text-muted)" }}>
                2FA adds a one-time code requirement on every login — even a
                stolen password won't grant access without your phone.
              </p>
            </div>

            <div
              className="rounded-xl p-4 mb-7"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid var(--border)",
              }}>
              <p
                className="text-[10px] font-semibold uppercase tracking-widest mb-3"
                style={{ color: "var(--text-muted)" }}>
                What you'll need
              </p>
              {[
                {
                  icon: Smartphone,
                  text: "An authenticator app — Google Authenticator, Authy, or 1Password",
                },
                { icon: Lock, text: "Your phone nearby and unlocked" },
                { icon: Key, text: "About 2 minutes of your time" },
              ].map(({ icon: Icon, text }) => (
                <div
                  key={text}
                  className="flex items-center gap-3 py-2">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "var(--accent-dim)" }}>
                    <Icon
                      className="w-3.5 h-3.5"
                      style={{ color: "var(--accent)" }}
                    />
                  </div>
                  <p
                    className="text-xs"
                    style={{ color: "var(--text-secondary)" }}>
                    {text}
                  </p>
                </div>
              ))}
            </div>

            <button
              onClick={startSetup}
              disabled={loading}
              className="btn btn-primary w-full gap-2 py-2.5">
              {loading ? (
                <>
                  <Spinner size={14} /> Setting up...
                </>
              ) : (
                <>
                  Get Started <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}

        {/* ── Scan QR ── */}
        {step === "scan" && (
          <div className="p-7">
            <h2
              className="text-sm font-semibold text-center mb-1"
              style={{ color: "var(--text-primary)" }}>
              Scan the QR code
            </h2>
            <p
              className="text-xs text-center mb-6"
              style={{ color: "var(--text-muted)" }}>
              Open your authenticator app → Add account → Scan QR code
            </p>

            {/* QR */}
            <div className="flex justify-center mb-6">
              <div
                className="p-5 rounded-2xl"
                style={{
                  background: "white",
                  boxShadow:
                    "0 0 0 1px rgba(255,255,255,0.1), 0 0 40px rgba(99,102,241,0.2)",
                }}>
                {qrCode ? (
                  <img
                    src={qrCode}
                    alt="2FA QR Code"
                    className="w-48 h-48 block"
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center">
                    <Spinner size={32} />
                  </div>
                )}
              </div>
            </div>

            {/* Manual key */}
            <div
              className="rounded-xl p-4 mb-6"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid var(--border)",
              }}>
              <p
                className="text-xs mb-2 font-medium"
                style={{ color: "var(--text-muted)" }}>
                Can't scan? Enter this key manually:
              </p>
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid var(--border)",
                }}>
                <code
                  className="flex-1 text-xs font-mono tracking-wider break-all"
                  style={{ color: "#a5f3fc" }}>
                  {secret}
                </code>
                <CopyButton
                  text={secret}
                  size={13}
                />
              </div>
            </div>

            <button
              onClick={() => setStep("verify")}
              className="btn btn-primary w-full gap-2">
              I've scanned it <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── Verify ── */}
        {step === "verify" && (
          <div className="p-7">
            <h2
              className="text-sm font-semibold text-center mb-1"
              style={{ color: "var(--text-primary)" }}>
              Enter the verification code
            </h2>
            <p
              className="text-xs text-center mb-8"
              style={{ color: "var(--text-muted)" }}>
              Open your authenticator app and enter the 6-digit code shown
            </p>

            {/* Individual OTP boxes */}
            <div className="mb-6">
              <OtpInput
                value={verificationCode}
                onChange={setVerificationCode}
                length={6}
                autoFocus
                onComplete={verifyAndEnable}
              />
            </div>

            <Alert
              variant="warning"
              className="mb-6">
              Codes refresh every 30 seconds — enter it before the timer resets.
            </Alert>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setStep("scan");
                  setVerificationCode("");
                }}
                className="btn btn-ghost flex-1">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={verifyAndEnable}
                disabled={loading || verificationCode.length !== 6}
                className="btn btn-primary flex-1 gap-2">
                {loading ? (
                  <>
                    <Spinner size={14} /> Verifying...
                  </>
                ) : (
                  "Verify & Continue"
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── Backup Codes ── */}
        {step === "backup" && (
          <div className="p-7">
            <div className="text-center mb-5">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
                style={{
                  background: "var(--success-dim)",
                  boxShadow: "0 0 20px rgba(16,185,129,0.2)",
                }}>
                <Check
                  className="w-6 h-6"
                  style={{ color: "var(--success)" }}
                />
              </div>
              <h2
                className="text-sm font-bold"
                style={{ color: "var(--text-primary)" }}>
                Almost done — save your backup codes
              </h2>
              <p
                className="text-xs mt-1"
                style={{ color: "var(--text-muted)" }}>
                Use these if you ever lose access to your authenticator app
              </p>
            </div>

            <Alert
              variant="danger"
              className="mb-5">
              <p className="font-semibold text-xs">
                These will not be shown again
              </p>
              <p className="text-xs font-normal mt-0.5">
                Each code is single-use. Store them in a password manager or
                safe place.
              </p>
            </Alert>

            {/* Codes */}
            <div
              className="rounded-xl p-4 mb-4"
              style={{
                background: "rgba(0,0,0,0.25)",
                border: "1px solid var(--border)",
              }}>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {backupCodes.map((code, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-3 py-2 rounded-lg gap-2"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid var(--border)",
                    }}>
                    <span
                      className="text-[10px] font-mono"
                      style={{ color: "var(--text-muted)" }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <code
                      className="flex-1 text-xs font-mono text-center"
                      style={{ color: "#a5f3fc" }}>
                      {code}
                    </code>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={copyBackupCodes}
                  className="btn btn-ghost flex-1 gap-2 text-xs">
                  {copiedBackup ? (
                    <>
                      <Check
                        className="w-3.5 h-3.5"
                        style={{ color: "var(--success)" }}
                      />{" "}
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy all
                    </>
                  )}
                </button>
                <button
                  onClick={downloadBackupCodes}
                  className="btn btn-ghost flex-1 gap-2 text-xs">
                  <Download className="w-3.5 h-3.5" /> Download .txt
                </button>
              </div>
            </div>

            <button
              onClick={completeSetup}
              disabled={loading}
              className="btn btn-primary w-full gap-2 py-2.5">
              {loading ? (
                <>
                  <Spinner size={14} /> Activating...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" /> Activate 2FA
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MFASetup;
