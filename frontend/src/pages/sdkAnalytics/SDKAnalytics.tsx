import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Users,
  UserCheck,
  Mail,
  LogIn,
  MessageSquare,
  Smartphone,
  Globe,
  Download,
  BarChart3,
  ChevronDown,
} from "lucide-react";
import {
  sdkAnalyticsService,
  type ApplicationUserData,
  type Application,
} from "../../api/sdkAnalytics.api";
import { PageSkeleton } from "../../components/ui";

const StatCard = ({
  icon: Icon,
  label,
  value,
  sub,
  color,
  delay = 0,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  sub?: string;
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
    {sub && (
      <p
        className="text-xs mt-2"
        style={{ color: "var(--text-muted)" }}>
        {sub}
      </p>
    )}
  </div>
);

const COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#14b8a6",
];

export default function SDKAnalytics() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string>("");
  const [analyticsData, setAnalyticsData] =
    useState<ApplicationUserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Load applications on mount
  useEffect(() => {
    const loadApplications = async () => {
      try {
        setLoading(true);
        const response = await sdkAnalyticsService.getApplicationsList();
        setApplications(response.data || []);
        if (response.data && response.data.length > 0) {
          setSelectedAppId(response.data[0]._id);
          setLoading(false);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error("Failed to load applications:", error);
        toast.error("Failed to load applications");
        setApplications([]);
        setLoading(false);
      }
    };

    loadApplications();
  }, []);

  // Load analytics data when selectedAppId changes
  useEffect(() => {
    const loadAnalyticsData = async () => {
      if (!selectedAppId) return;

      try {
        setLoading(true);
        const response =
          await sdkAnalyticsService.getApplicationAnalytics(selectedAppId);
        setAnalyticsData(response.data || null);
      } catch (error) {
        console.error("Failed to load analytics:", error);
        toast.error("Failed to load analytics data");
        setAnalyticsData(null);
      } finally {
        setLoading(false);
      }
    };

    loadAnalyticsData();
  }, [selectedAppId]);

  const handleExport = useCallback(
    async (format: "csv" | "json") => {
      if (!selectedAppId) return;

      try {
        setExporting(true);
        const data = await sdkAnalyticsService.exportApplicationAnalytics(
          selectedAppId,
          format,
        );

        // Create download link
        const blob =
          format === "csv"
            ? new Blob([data], { type: "text/csv" })
            : new Blob([JSON.stringify(data, null, 2)], {
                type: "application/json",
              });

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `sdk-analytics-${new Date().toISOString()}.${format}`;
        link.click();
        window.URL.revokeObjectURL(url);

        toast.success(`Analytics exported as ${format.toUpperCase()}`);
      } catch (error) {
        console.error("Export failed:", error);
        toast.error("Failed to export analytics");
      } finally {
        setExporting(false);
      }
    },
    [selectedAppId],
  );

  if (loading) return <PageSkeleton rows={8} />;
  if (applications.length === 0) {
    return (
      <div className="max-w-6xl mx-auto animate-fade-in">
        <div className="mb-8 flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #6366f1, #818cf8)",
              boxShadow: "0 0 20px rgba(99,102,241,0.3)",
            }}>
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="page-title">SDK User Analytics</h1>
            <p className="page-subtitle">
              Track and analyze your application users
            </p>
          </div>
        </div>
        <div
          className="rounded-xl p-8 text-center"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
          }}>
          <p style={{ color: "var(--text-muted)" }}>
            No applications available. Create an application to start tracking
            analytics.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #6366f1, #818cf8)",
              boxShadow: "0 0 20px rgba(99,102,241,0.3)",
            }}>
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="page-title">SDK User Analytics</h1>
            <p className="page-subtitle">Real-time application user metrics</p>
          </div>
        </div>

        {/* Application Switcher */}
        {applications.length > 1 && (
          <div className="relative">
            <select
              value={selectedAppId}
              onChange={(e) => setSelectedAppId(e.target.value)}
              className="appearance-none px-4 py-2 pr-10 rounded-lg"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}>
              {applications.map((app) => (
                <option
                  key={app._id}
                  value={app._id}>
                  {app.name}
                </option>
              ))}
            </select>
            <ChevronDown
              className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none"
              style={{ color: "var(--text-muted)" }}
            />
          </div>
        )}
      </div>

      {!analyticsData ? (
        <PageSkeleton rows={6} />
      ) : (
        <>
          {/* Primary Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon={Users}
              label="Total SDK Users"
              value={analyticsData.metrics.totalUsers}
              sub={`+${analyticsData.metrics.newUsersToday} today`}
              color="rgba(99,102,241,0.7)"
              delay={0}
            />
            <StatCard
              icon={UserCheck}
              label="Active Users"
              value={analyticsData.metrics.activeUsers}
              color="rgba(16,185,129,0.7)"
              delay={50}
            />
            <StatCard
              icon={Mail}
              label="Email Verified"
              value={`${analyticsData.metrics.emailVerificationRate}%`}
              sub={`${analyticsData.metrics.emailVerifiedUsers} users`}
              color="rgba(6,182,212,0.7)"
              delay={100}
            />
            <StatCard
              icon={LogIn}
              label="Total Logins"
              value={analyticsData.loginMetrics.totalLogins}
              sub={`${analyticsData.loginMetrics.loginsToday} today`}
              color="rgba(245,158,11,0.7)"
              delay={150}
            />
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <StatCard
              icon={Users}
              label="New This Month"
              value={analyticsData.metrics.newUsersThisMonth}
              color="rgba(244,63,94,0.7)"
              delay={200}
            />
            <StatCard
              icon={LogIn}
              label="Logins This Month"
              value={analyticsData.loginMetrics.loginsThisMonth}
              color="rgba(139,92,246,0.7)"
              delay={250}
            />
            <StatCard
              icon={MessageSquare}
              label="Unique Users Logged In"
              value={analyticsData.loginMetrics.uniqueUsersLoggedIn}
              color="rgba(236,72,153,0.7)"
              delay={300}
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Registration Trend */}
            <div
              className="rounded-xl p-6 animate-slide-up"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
              }}>
              <h2
                className="text-sm font-semibold mb-4"
                style={{ color: "var(--text-primary)" }}>
                User Registration Trend
              </h2>
              <ResponsiveContainer
                width="100%"
                height={300}>
                <AreaChart data={analyticsData.registrationTrend}>
                  <defs>
                    <linearGradient
                      id="colorReg"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1">
                      <stop
                        offset="5%"
                        stopColor="#6366f1"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="#6366f1"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    style={{ stroke: "rgba(255,255,255,0.1)" }}
                  />
                  <XAxis
                    dataKey="date"
                    style={{ color: "var(--text-muted)" }}
                  />
                  <YAxis style={{ color: "var(--text-muted)" }} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#6366f1"
                    fillOpacity={1}
                    fill="url(#colorReg)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Login Trend */}
            <div
              className="rounded-xl p-6 animate-slide-up"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                animationDelay: "50ms",
              }}>
              <h2
                className="text-sm font-semibold mb-4"
                style={{ color: "var(--text-primary)" }}>
                Login Activity Trend
              </h2>
              <ResponsiveContainer
                width="100%"
                height={300}>
                <LineChart data={analyticsData.loginTrend}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    style={{ stroke: "rgba(255,255,255,0.1)" }}
                  />
                  <XAxis
                    dataKey="date"
                    style={{ color: "var(--text-muted)" }}
                  />
                  <YAxis style={{ color: "var(--text-muted)" }} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Device & Country Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Device Breakdown */}
            <div
              className="rounded-xl p-6 animate-slide-up"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                animationDelay: "100ms",
              }}>
              <h2
                className="text-sm font-semibold mb-4 flex items-center gap-2"
                style={{ color: "var(--text-primary)" }}>
                <Smartphone className="w-4 h-4" />
                Device Breakdown
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <ResponsiveContainer
                  width="100%"
                  height={250}>
                  <PieChart>
                    <Pie
                      data={analyticsData.devices}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count">
                      {analyticsData.devices.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col justify-center gap-3">
                  {analyticsData.devices.slice(0, 5).map((device, index) => (
                    <div
                      key={device.device}
                      className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          background: COLORS[index % COLORS.length],
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-xs truncate"
                          style={{ color: "var(--text-primary)" }}>
                          {device.device}
                        </p>
                        <p
                          className="text-xs"
                          style={{ color: "var(--text-muted)" }}>
                          {device.count} ({device.percentage}%)
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Country Distribution */}
            <div
              className="rounded-xl p-6 animate-slide-up"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                animationDelay: "150ms",
              }}>
              <h2
                className="text-sm font-semibold mb-4 flex items-center gap-2"
                style={{ color: "var(--text-primary)" }}>
                <Globe className="w-4 h-4" />
                User Location (Top 10)
              </h2>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {analyticsData.countries.slice(0, 10).map((country, index) => (
                  <div
                    key={country.country}
                    className="flex items-center gap-3">
                    <span
                      className="text-xs font-semibold min-w-6"
                      style={{ color: COLORS[index % COLORS.length] }}>
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p
                          className="text-sm truncate"
                          style={{ color: "var(--text-primary)" }}>
                          {country.country}
                        </p>
                        <p
                          className="text-xs"
                          style={{ color: "var(--text-muted)" }}>
                          {country.count}
                        </p>
                      </div>
                      <div
                        className="h-1.5 rounded-full"
                        style={{ background: "rgba(255,255,255,0.06)" }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${country.percentage}%`,
                            background: COLORS[index % COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Export Section */}
          <div
            className="rounded-xl p-6 animate-slide-up"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              animationDelay: "200ms",
            }}>
            <h2
              className="text-sm font-semibold mb-4 flex items-center gap-2"
              style={{ color: "var(--text-primary)" }}>
              <Download className="w-4 h-4" />
              Export Analytics
            </h2>
            <div className="flex gap-3">
              <button
                onClick={() => handleExport("csv")}
                disabled={exporting}
                className="px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                style={{
                  background: "rgba(99,102,241,0.2)",
                  border: "1px solid rgba(99,102,241,0.3)",
                  color: "var(--text-primary)",
                }}>
                {exporting ? "Exporting..." : "Export as CSV"}
              </button>
              <button
                onClick={() => handleExport("json")}
                disabled={exporting}
                className="px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                style={{
                  background: "rgba(16,185,129,0.2)",
                  border: "1px solid rgba(16,185,129,0.3)",
                  color: "var(--text-primary)",
                }}>
                {exporting ? "Exporting..." : "Export as JSON"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
