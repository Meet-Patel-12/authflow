import { useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Shield,
  CheckCircle,
  XCircle,
  ArrowRight,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { useAppSelector } from "../../store/hooks";

const StatCard = ({
  icon: Icon,
  label,
  value,
  color,
  delay = 0,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
  delay?: number;
}) => (
  <div
    className="stat-card animate-slide-up"
    style={{ animationDelay: `${delay}ms` }}>
    <div className="flex items-start justify-between mb-3">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center"
        style={{ background: color, flexShrink: 0 }}>
        <Icon
          className="w-4 h-4"
          style={{ color: "white" }}
        />
      </div>
    </div>
    <p
      className="text-xs mb-1"
      style={{ color: "var(--text-muted)" }}>
      {label}
    </p>
    <p
      className="text-base font-semibold truncate"
      style={{ color: "var(--text-primary)" }}>
      {value}
    </p>
  </div>
);

const DetailRow = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div
    className="flex items-center justify-between py-3"
    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
    <span
      className="text-sm"
      style={{ color: "var(--text-muted)" }}>
      {label}
    </span>
    <div className="flex items-center gap-2">{children}</div>
  </div>
);

const QuickAction = ({
  title,
  desc,
  onClick,
  warn,
}: {
  title: string;
  desc: string;
  onClick: () => void;
  warn?: string;
}) => (
  <button
    onClick={onClick}
    className="group relative p-4 rounded-xl text-left transition-all"
    style={{
      background: "rgba(255,255,255,0.02)",
      border: "1px solid var(--border)",
    }}
    onMouseOver={(e) => {
      (e.currentTarget as HTMLElement).style.borderColor =
        "var(--border-hover)";
      (e.currentTarget as HTMLElement).style.background =
        "rgba(255,255,255,0.04)";
    }}
    onMouseOut={(e) => {
      (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
      (e.currentTarget as HTMLElement).style.background =
        "rgba(255,255,255,0.02)";
    }}>
    <div className="flex items-start justify-between mb-1">
      <p
        className="text-sm font-semibold"
        style={{ color: "var(--text-primary)" }}>
        {title}
      </p>
      <ArrowRight
        className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
        style={{ color: "var(--text-muted)" }}
      />
    </div>
    <p
      className="text-xs"
      style={{ color: "var(--text-muted)" }}>
      {desc}
    </p>
    {warn && (
      <p
        className="flex items-center gap-1 text-xs mt-2"
        style={{ color: "var(--warning)" }}>
        <AlertTriangle className="w-3 h-3" />
        {warn}
      </p>
    )}
  </button>
);

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAppSelector((s) => s.auth);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div
            className="w-10 h-10 rounded-full border-2 border-t-transparent mx-auto mb-3 animate-spin"
            style={{ borderColor: "var(--accent)" }}
          />
          <p
            className="text-sm"
            style={{ color: "var(--text-muted)" }}>
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
            style={{
              background: "linear-gradient(135deg, #6366f1, #818cf8)",
              boxShadow: "0 0 20px rgba(99,102,241,0.3)",
            }}>
            {user.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1
              className="text-2xl font-bold"
              style={{ color: "var(--text-primary)" }}>
              Welcome back, {user.name.split(" ")[0]}
            </h1>
            <p
              className="text-sm"
              style={{ color: "var(--text-muted)" }}>
              Here's your account overview
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          icon={User}
          label="Full Name"
          value={user.name}
          color="rgba(99,102,241,0.8)"
          delay={0}
        />
        <StatCard
          icon={Mail}
          label="Email"
          value={user.email}
          color="rgba(6,182,212,0.8)"
          delay={50}
        />
        <StatCard
          icon={Shield}
          label="Role"
          value={user.role.charAt(0).toUpperCase() + user.role.slice(1)}
          color="rgba(16,185,129,0.8)"
          delay={100}
        />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        {/* Account details */}
        <div
          className="lg:col-span-3 rounded-xl p-6 animate-slide-up"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            animationDelay: "150ms",
          }}>
          <h2
            className="text-sm font-semibold mb-4"
            style={{ color: "var(--text-primary)" }}>
            Account Details
          </h2>
          <DetailRow label="User ID">
            <code
              className="text-xs font-mono"
              style={{ color: "var(--accent)" }}>
              {user.id?.slice(0, 20)}…
            </code>
          </DetailRow>
          <DetailRow label="Email verification">
            {user.isEmailVerified ? (
              <>
                <CheckCircle
                  className="w-4 h-4"
                  style={{ color: "var(--success)" }}
                />
                <span
                  className="text-xs font-medium"
                  style={{ color: "var(--success)" }}>
                  Verified
                </span>
              </>
            ) : (
              <>
                <XCircle
                  className="w-4 h-4"
                  style={{ color: "var(--warning)" }}
                />
                <span
                  className="text-xs font-medium"
                  style={{ color: "var(--warning)" }}>
                  Unverified
                </span>
              </>
            )}
          </DetailRow>
          <DetailRow label="Two-factor auth">
            {user.mfaEnabled ? (
              <>
                <CheckCircle
                  className="w-4 h-4"
                  style={{ color: "var(--success)" }}
                />
                <span
                  className="text-xs font-medium"
                  style={{ color: "var(--success)" }}>
                  Enabled
                </span>
              </>
            ) : (
              <>
                <XCircle
                  className="w-4 h-4"
                  style={{ color: "var(--text-muted)" }}
                />
                <span
                  className="text-xs font-medium"
                  style={{ color: "var(--text-muted)" }}>
                  Disabled
                </span>
              </>
            )}
          </DetailRow>
          {user.lastLoginAt && (
            <DetailRow label="Last login">
              <Clock
                className="w-3.5 h-3.5"
                style={{ color: "var(--text-muted)" }}
              />
              <span
                className="text-xs"
                style={{ color: "var(--text-secondary)" }}>
                {new Date(user.lastLoginAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </DetailRow>
          )}
          <div className="pt-3">
            <span className="badge badge-accent">{user.role}</span>
          </div>
        </div>

        {/* Security status */}
        <div
          className="lg:col-span-2 rounded-xl p-6 animate-slide-up"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            animationDelay: "200ms",
          }}>
          <h2
            className="text-sm font-semibold mb-4"
            style={{ color: "var(--text-primary)" }}>
            Security Score
          </h2>
          <div className="space-y-3">
            {[
              { label: "Email verified", done: user.isEmailVerified },
              { label: "2FA enabled", done: user.mfaEnabled },
              { label: "Profile complete", done: !!user.name },
            ].map(({ label, done }) => (
              <div
                key={label}
                className="flex items-center gap-3">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: done
                      ? "var(--success-dim)"
                      : "rgba(255,255,255,0.05)",
                  }}>
                  <CheckCircle
                    className="w-3 h-3"
                    style={{
                      color: done ? "var(--success)" : "var(--text-muted)",
                    }}
                  />
                </div>
                <span
                  className="text-sm"
                  style={{
                    color: done ? "var(--text-secondary)" : "var(--text-muted)",
                  }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
          <div
            className="mt-5 rounded-lg p-3"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid var(--border)",
            }}>
            <div className="flex items-center justify-between mb-2">
              <span
                className="text-xs"
                style={{ color: "var(--text-muted)" }}>
                Security score
              </span>
              <span
                className="text-xs font-bold"
                style={{
                  color:
                    user.mfaEnabled && user.isEmailVerified
                      ? "var(--success)"
                      : "var(--warning)",
                }}>
                {
                  [user.isEmailVerified, user.mfaEnabled, !!user.name].filter(
                    Boolean,
                  ).length
                }
                /3
              </span>
            </div>
            <div
              className="h-1.5 rounded-full"
              style={{ background: "rgba(255,255,255,0.08)" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${([user.isEmailVerified, user.mfaEnabled, !!user.name].filter(Boolean).length / 3) * 100}%`,
                  background:
                    user.mfaEnabled && user.isEmailVerified
                      ? "var(--success)"
                      : "var(--warning)",
                  boxShadow: `0 0 8px ${user.mfaEnabled && user.isEmailVerified ? "var(--success)" : "var(--warning)"}`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div
        className="rounded-xl p-6 animate-slide-up"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          animationDelay: "250ms",
        }}>
        <h2
          className="text-sm font-semibold mb-4"
          style={{ color: "var(--text-primary)" }}>
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <QuickAction
            title="Update Profile"
            desc="Change name, avatar, preferences"
            onClick={() => navigate("/profile")}
          />
          <QuickAction
            title="Security Settings"
            desc="Manage passwords and 2FA"
            onClick={() => navigate("/security")}
            warn={!user.mfaEnabled ? "2FA not enabled" : undefined}
          />
          <QuickAction
            title="API Keys"
            desc="Create and manage access keys"
            onClick={() => navigate("/api-keys")}
          />
        </div>
      </div>
    </div>
  );
}
