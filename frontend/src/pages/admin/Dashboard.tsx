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
  LogIn,
  Globe,
} from "lucide-react";
import { adminService } from "../../api/admin.api";
import { applicationService } from "../../api/application.api";
import { sdkAnalyticsService } from "../../api/sdkAnalytics.api";
import { PageSkeleton } from "../../components/ui";

interface Stats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  mfaEnabled: number;
  totalSessions: number;
  totalApiKeys: number;
  totalOrganizations: number;
}

interface SDKStats {
  totalSDKUsers: number;
  activeSDKUsers: number;
  totalLogins: number;
  newUsersToday: number;
  newUsersThisMonth: number;
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
  const [sdkStats, setSDKStats] = useState<SDKStats | null>(null);
  const [appCount, setAppCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminService.getStats(),
      applicationService.getApplications(),
      sdkAnalyticsService.getAllApplicationsAnalytics(),
    ])
      .then(([platformStats, apps, allSDKAnalytics]) => {
        setStats(platformStats.data || null);
        setAppCount(apps.data?.applications?.length ?? 0);

        // Aggregate SDK analytics from all applications
        if (allSDKAnalytics.data && Array.isArray(allSDKAnalytics.data)) {
          const aggregated = allSDKAnalytics.data.reduce(
            (acc, app) => ({
              totalSDKUsers: acc.totalSDKUsers + app.metrics.totalUsers,
              activeSDKUsers: acc.activeSDKUsers + app.metrics.activeUsers,
              totalLogins: acc.totalLogins + app.loginMetrics.totalLogins,
              newUsersToday: acc.newUsersToday + app.metrics.newUsersToday,
              newUsersThisMonth:
                acc.newUsersThisMonth + app.metrics.newUsersThisMonth,
            }),
            {
              totalSDKUsers: 0,
              activeSDKUsers: 0,
              totalLogins: 0,
              newUsersToday: 0,
              newUsersThisMonth: 0,
            },
          );
          setSDKStats(aggregated);
        }
      })
      .catch((err) => {
        console.error("Failed to load stats:", err);
        toast.error("Failed to load dashboard data");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageSkeleton rows={8} />;

  const mfaPct = stats
    ? Math.round((stats.mfaEnabled / (stats.totalUsers || 1)) * 100)
    : 0;

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
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
          <p className="page-subtitle">Platform overview and SDK analytics</p>
        </div>
      </div>

      {/* Platform Stats */}
      <div className="mb-8">
        <h2
          className="text-sm font-semibold mb-4"
          style={{ color: "var(--text-primary)" }}>
          Platform Overview
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            label="Platform Users"
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
      </div>

      {/* SDK Analytics Stats */}
      <div className="mb-8">
        <h2
          className="text-sm font-semibold mb-4"
          style={{ color: "var(--text-primary)" }}>
          SDK User Analytics
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            label="Total SDK Users"
            value={sdkStats?.totalSDKUsers || 0}
            sub={`+${sdkStats?.newUsersToday || 0} today`}
            subUp
            color="rgba(139,92,246,0.7)"
            delay={0}
          />
          <StatCard
            icon={UserCheck}
            label="Active SDK Users"
            value={sdkStats?.activeSDKUsers || 0}
            color="rgba(34,197,94,0.7)"
            delay={50}
          />
          <StatCard
            icon={LogIn}
            label="Total Logins"
            value={sdkStats?.totalLogins || 0}
            color="rgba(59,130,246,0.7)"
            delay={100}
          />
          <StatCard
            icon={TrendingUp}
            label="New This Month"
            value={sdkStats?.newUsersThisMonth || 0}
            color="rgba(236,72,153,0.7)"
            delay={150}
          />
        </div>
      </div>

      {/* System Resources */}
      <div className="mb-8">
        <h2
          className="text-sm font-semibold mb-4"
          style={{ color: "var(--text-primary)" }}>
          System Resources
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            icon={Key}
            label="API Keys"
            value={stats?.totalApiKeys || 0}
            color="rgba(244,63,94,0.7)"
            delay={0}
          />
          <StatCard
            icon={Activity}
            label="Active Sessions"
            value={stats?.totalSessions || 0}
            color="rgba(139,92,246,0.7)"
            delay={50}
          />
          <StatCard
            icon={Building2}
            label="Organizations"
            value={stats?.totalOrganizations || 0}
            color="rgba(236,72,153,0.7)"
            delay={100}
          />
        </div>
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
              MFA Adoption Rate
            </p>
            <p
              className="text-xs"
              style={{ color: "var(--text-muted)" }}>
              {stats?.mfaEnabled || 0} of {stats?.totalUsers || 0} platform
              users have enabled 2FA
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
            icon={BarChart3}
            label="SDK Analytics"
            desc="User metrics and insights"
            onClick={() => navigate("/sdk-analytics")}
          />
          <QuickNav
            icon={Globe}
            label="Applications"
            desc="Manage developer apps"
            onClick={() => navigate("/applications")}
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
