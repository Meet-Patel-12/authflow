import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Users,
  UserCheck,
  Shield,
  Key,
  Building2,
  Activity,
  TrendingUp,
  TrendingDown,
  AppWindow,
  BarChart3,
  FileText,
  ArrowRight,
  Zap,
} from "lucide-react";
import { adminService } from "../api/admin.api";
import { applicationService } from "../../application/api/application.api";
import { PageSkeleton } from "../../../components/ui";

interface Stats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  mfaEnabled: number;
  totalSessions: number;
  totalApiKeys: number;
  totalOrganizations: number;
}

const StatCard = ({
  icon: Icon,
  label,
  value,
  sub,
  subUp,
  color,
  delay = 0,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  sub?: string;
  subUp?: boolean;
  color: string;
  delay?: number;
}) => (
  <div
    className="stat-card animate-slide-up"
    style={{ animationDelay: `${delay}ms` }}>
    <div className="flex items-start justify-between mb-4">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: color }}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      {sub && (
        <div className="flex items-center gap-1 text-xs">
          {subUp ? (
            <TrendingUp
              className="w-3 h-3"
              style={{ color: "var(--success)" }}
            />
          ) : (
            <TrendingDown
              className="w-3 h-3"
              style={{ color: "var(--text-muted)" }}
            />
          )}
          <span
            style={{ color: subUp ? "var(--success)" : "var(--text-muted)" }}>
            {sub}
          </span>
        </div>
      )}
    </div>
    <p
      className="text-2xl font-bold mb-1"
      style={{ color: "var(--text-primary)" }}>
      {typeof value === "number" ? value.toLocaleString() : value}
    </p>
    <p
      className="text-xs"
      style={{ color: "var(--text-muted)" }}>
      {label}
    </p>
  </div>
);

const QuickNav = ({
  icon: Icon,
  label,
  desc,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  desc: string;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="group glass-hover flex items-center gap-4 p-4 animate-slide-up">
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ background: "var(--accent-dim)" }}>
      <Icon
        className="w-5 h-5"
        style={{ color: "var(--accent)" }}
      />
    </div>
    <div className="flex-1 text-left">
      <p
        className="text-sm font-semibold"
        style={{ color: "var(--text-primary)" }}>
        {label}
      </p>
      <p
        className="text-xs"
        style={{ color: "var(--text-muted)" }}>
        {desc}
      </p>
    </div>
    <ArrowRight
      className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
      style={{ color: "var(--text-muted)" }}
    />
  </button>
);

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [appCount, setAppCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([adminService.getStats(), applicationService.getApplications()])
      .then(([s, a]) => {
        setStats(s.data || null);
        setAppCount(a.data?.applications?.length ?? 0);
      })
      .catch(() => toast.error("Failed to load stats"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageSkeleton rows={6} />;

  const mfaPct = stats
    ? Math.round((stats.mfaEnabled / (stats.totalUsers || 1)) * 100)
    : 0;

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #6366f1, #818cf8)",
            boxShadow: "0 0 20px rgba(99,102,241,0.3)",
          }}>
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">Platform overview and management</p>
        </div>
      </div>

      {/* Primary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Users}
          label="Total Users"
          value={stats?.totalUsers || 0}
          sub={`+${stats?.newUsersToday || 0} today`}
          subUp
          color="rgba(99,102,241,0.7)"
          delay={0}
        />
        <StatCard
          icon={UserCheck}
          label="Active Users"
          value={stats?.activeUsers || 0}
          color="rgba(16,185,129,0.7)"
          delay={50}
        />
        <StatCard
          icon={Shield}
          label="MFA Enabled"
          value={`${mfaPct}%`}
          sub={`${stats?.mfaEnabled || 0} users`}
          subUp={mfaPct > 50}
          color="rgba(6,182,212,0.7)"
          delay={100}
        />
        <StatCard
          icon={AppWindow}
          label="Applications"
          value={appCount}
          color="rgba(245,158,11,0.7)"
          delay={150}
        />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard
          icon={Key}
          label="API Keys"
          value={stats?.totalApiKeys || 0}
          color="rgba(244,63,94,0.7)"
          delay={200}
        />
        <StatCard
          icon={Activity}
          label="Active Sessions"
          value={stats?.totalSessions || 0}
          color="rgba(139,92,246,0.7)"
          delay={250}
        />
        <StatCard
          icon={Building2}
          label="Organizations"
          value={stats?.totalOrganizations || 0}
          color="rgba(236,72,153,0.7)"
          delay={300}
        />
      </div>

      {/* MFA adoption bar */}
      <div
        className="rounded-xl p-5 mb-8 animate-slide-up"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          animationDelay: "350ms",
        }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}>
              MFA Adoption
            </p>
            <p
              className="text-xs"
              style={{ color: "var(--text-muted)" }}>
              {stats?.mfaEnabled || 0} of {stats?.totalUsers || 0} users have
              enabled 2FA
            </p>
          </div>
          <span
            className="text-2xl font-bold"
            style={{
              color: mfaPct > 50 ? "var(--success)" : "var(--warning)",
            }}>
            {mfaPct}%
          </span>
        </div>
        <div
          className="h-2 rounded-full"
          style={{ background: "rgba(255,255,255,0.06)" }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${mfaPct}%`,
              background:
                mfaPct > 50
                  ? "linear-gradient(90deg, #10b981, #34d399)"
                  : "linear-gradient(90deg, #f59e0b, #fbbf24)",
              boxShadow: `0 0 8px ${mfaPct > 50 ? "rgba(16,185,129,0.4)" : "rgba(245,158,11,0.4)"}`,
            }}
          />
        </div>
      </div>

      {/* Quick navigation */}
      <div
        className="rounded-xl p-5 animate-slide-up"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          animationDelay: "400ms",
        }}>
        <h2
          className="text-sm font-semibold mb-4"
          style={{ color: "var(--text-primary)" }}>
          Admin Tools
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <QuickNav
            icon={Users}
            label="Manage Users"
            desc="View, suspend, update roles"
            onClick={() => navigate("/users")}
          />
          <QuickNav
            icon={BarChart3}
            label="Analytics"
            desc="Growth charts and exports"
            onClick={() => navigate("/analytics")}
          />
          <QuickNav
            icon={FileText}
            label="Audit Logs"
            desc="Full activity trail"
            onClick={() => navigate("/audit-logs")}
          />
        </div>
      </div>
    </div>
  );
}
