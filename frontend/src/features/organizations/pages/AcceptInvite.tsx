import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import {
  Users,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Building2,
  Shield,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import api from "../../../app/apiClient";
import { useAppSelector, useAppDispatch } from "../../../app/hooks";
import { getCurrentUser } from "../../auth/authSlice";
import { Spinner, Alert } from "../../../components/ui";

interface InviteDetails {
  email: string;
  role: string;
  organization: { id: string; name: string; slug: string };
}

const AcceptInvite = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, user } = useAppSelector((s) => s.auth);
  const hasRun = useRef(false);

  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    if (!token) {
      setError("Invalid invitation link.");
      setLoading(false);
      return;
    }

    api
      .get(`/organizations/invite/${token}`)
      .then((res) => setInvite(res.data.data))
      .catch((e) => {
        const err = e as { response?: { data?: { message?: string } } };
        setError(
          err.response?.data?.message ||
            "This invitation is invalid or has expired.",
        );
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleAccept = async () => {
    if (!isAuthenticated) {
      localStorage.setItem("pendingInviteToken", token!);
      navigate(`/register?invite=${token}`);
      return;
    }
    if (user?.email !== invite?.email) {
      toast.error(
        `This invitation was sent to ${invite?.email}. Please sign in with that account.`,
      );
      return;
    }
    setAccepting(true);
    try {
      const res = await api.post("/organizations/accept-invite", { token });
      const { accessToken, refreshToken } = res.data.data;
      localStorage.setItem("accessToken", accessToken);
      if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("organizationId", res.data.data.organizationId);
      await dispatch(getCurrentUser()).unwrap();
      toast.success(`You joined ${invite?.organization.name}!`);
      navigate("/dashboard", { replace: true });
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(
        err.response?.data?.message || "Failed to accept invitation.",
      );
    } finally {
      setAccepting(false);
    }
  };

  const wrongAccount = isAuthenticated && user?.email !== invite?.email;

  /* ── Loading ── */
  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
        style={{ background: "var(--bg-base)" }}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 50% 50%, rgba(99,102,241,0.10), transparent)",
          }}
        />
        <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
        <div className="relative z-10 text-center animate-fade-in space-y-5">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl"
            style={{
              background: "linear-gradient(135deg, #6366f1, #818cf8)",
              boxShadow: "0 0 32px rgba(99,102,241,0.4)",
            }}>
            <Users className="w-7 h-7 text-white" />
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
          <div>
            <p
              className="text-base font-semibold mb-1"
              style={{ color: "var(--text-primary)" }}>
              Loading invitation…
            </p>
            <p
              className="text-sm"
              style={{ color: "var(--text-muted)" }}>
              Please wait a moment
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ── Error ── */
  if (error) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
        style={{ background: "var(--bg-base)" }}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 50% -10%, rgba(244,63,94,0.08), transparent)",
          }}
        />
        <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
        <div className="w-full max-w-sm relative z-10 animate-slide-up">
          <div
            className="rounded-2xl p-8 text-center space-y-5"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid rgba(244,63,94,0.2)",
              boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
            }}>
            <div
              className="inline-flex items-center justify-center w-14 h-14 rounded-2xl"
              style={{
                background: "var(--danger-dim)",
                boxShadow: "0 0 24px rgba(244,63,94,0.25)",
              }}>
              <AlertCircle
                className="w-7 h-7"
                style={{ color: "var(--danger)" }}
              />
            </div>
            <div>
              <h2
                className="text-lg font-bold mb-1"
                style={{ color: "var(--text-primary)" }}>
                Invalid Invitation
              </h2>
              <p
                className="text-sm"
                style={{ color: "var(--text-muted)" }}>
                {error}
              </p>
            </div>
            <Link
              to="/login"
              className="btn btn-primary w-full gap-2 py-2.5">
              Go to Login <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ── Main ── */
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ background: "var(--bg-base)" }}>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% -10%, rgba(99,102,241,0.12), transparent), radial-gradient(ellipse 50% 40% at 80% 90%, rgba(6,182,212,0.05), transparent)",
        }}
      />
      <div className="absolute inset-0 bg-grid opacity-40 pointer-events-none" />

      <div className="w-full max-w-sm relative z-10 animate-slide-up">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{
              background: "linear-gradient(135deg, #6366f1, #818cf8)",
              boxShadow: "0 0 32px rgba(99,102,241,0.4)",
            }}>
            <Users className="w-7 h-7 text-white" />
          </div>
          <h1
            className="text-xl font-bold mb-1"
            style={{ color: "var(--text-primary)" }}>
            You're invited!
          </h1>
          <p
            className="text-sm"
            style={{ color: "var(--text-muted)" }}>
            You've been invited to join an organization on AuthFlow
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
          {/* Invite details */}
          <div
            className="rounded-xl p-4 space-y-3"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid var(--border)",
            }}>
            {[
              {
                icon: Building2,
                label: "Organization",
                value: invite?.organization.name ?? "—",
              },
              {
                icon: Shield,
                label: "Your role",
                value: invite?.role ?? "—",
                capitalize: true,
              },
              {
                icon: Mail,
                label: "Invited email",
                value: invite?.email ?? "—",
              },
            ].map(({ icon: Icon, label, value, capitalize }) => (
              <div
                key={label}
                className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Icon
                    className="w-3.5 h-3.5"
                    style={{ color: "var(--text-muted)" }}
                  />
                  <span
                    className="text-xs"
                    style={{ color: "var(--text-muted)" }}>
                    {label}
                  </span>
                </div>
                <span
                  className="text-xs font-semibold truncate"
                  style={{
                    color: "var(--text-primary)",
                    textTransform: capitalize ? "capitalize" : undefined,
                  }}>
                  {value}
                </span>
              </div>
            ))}
          </div>

          {/* Wrong account warning */}
          {wrongAccount && (
            <Alert variant="warning">
              You're signed in as <strong>{user?.email}</strong> but this
              invitation was sent to <strong>{invite?.email}</strong>. Please
              sign in with the correct account.
            </Alert>
          )}

          {/* Not logged in info */}
          {!isAuthenticated && (
            <Alert variant="info">
              You'll be asked to create an account or sign in before joining.
            </Alert>
          )}

          {/* Actions */}
          <div className="space-y-2 pt-1">
            <button
              onClick={handleAccept}
              disabled={accepting || wrongAccount}
              className="btn btn-primary w-full gap-2 py-2.5">
              {accepting ? (
                <>
                  <Spinner size={14} /> Joining…
                </>
              ) : isAuthenticated ? (
                <>
                  <CheckCircle className="w-4 h-4" /> Join{" "}
                  {invite?.organization.name}
                </>
              ) : (
                <>
                  Accept Invitation <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <Link
              to="/login"
              className="btn btn-ghost w-full text-sm">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AcceptInvite;
