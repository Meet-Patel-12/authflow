import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  Users,
  Activity,
  Calendar,
  Download,
  RefreshCw,
  Globe,
  Smartphone,
  AppWindow,
  Code2,
  ChevronDown,
} from "lucide-react";
import { analyticsService } from "../api/analytics.api";
import { Spinner } from "../../../components/ui";

/* ─── Colour palette — dark-friendly ─── */
const C = {
  blue: "#6366f1",
  green: "#10b981",
  purple: "#8b5cf6",
  cyan: "#06b6d4",
  pink: "#ec4899",
  amber: "#f59e0b",
};
const PIE_COLORS = [C.blue, C.green, C.purple, C.cyan, C.pink, C.amber];

/* ─── Shared chart props ─── */
const AXIS_STYLE = {
  stroke: "rgba(255,255,255,0.2)",
  fontSize: 11,
  fontFamily: "Sora, sans-serif",
};
const GRID_PROPS = { strokeDasharray: "3 3", stroke: "rgba(255,255,255,0.06)" };
const TOOLTIP_STYLE = {
  backgroundColor: "#161b27",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 10,
  color: "#f0f2f8",
  fontSize: 12,
  fontFamily: "Sora, sans-serif",
};

/* ─── Types ─── */
interface PlatformSummary {
  totalUsers: number;
  activeUsers: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  totalLogins: number;
  mfaAdoptionRate: number;
}
interface SDKAppStat {
  applicationId: string;
  applicationName: string;
  type: string;
  clientId: string;
  userCount: number;
  activeUserCount: number;
}
interface SDKSummary {
  totalUsers: number;
  activeUsers: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  totalLogins: number;
  totalApplications: number;
  usersByApplication: SDKAppStat[];
}
interface AnalyticsData {
  platformSummary: PlatformSummary;
  sdkSummary: SDKSummary;
  platformUserGrowth: { date: string; total: number; newUsers: number }[];
  sdkUserGrowth: { date: string; total: number; newUsers: number }[];
  loginActivity: { date: string; logins: number; uniqueUsers: number }[];
  sdkLoginActivity: { date: string; logins: number }[];
  deviceStats: { device: string; count: number; percentage: number }[];
  sdkDeviceStats: { device: string; count: number; percentage: number }[];
}
type ViewTab = "platform" | "sdk";

/* ─── Stat card ─── */
const StatCard = ({
  title,
  value,
  sub,
  icon: Icon,
  accent,
  delay = 0,
}: {
  title: string;
  value: number | string;
  sub: string;
  icon: React.ElementType;
  accent: string;
  delay?: number;
}) => (
  <div
    className="stat-card animate-slide-up"
    style={{ animationDelay: `${delay}ms` }}>
    <div className="flex items-start justify-between mb-4">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: `${accent}22` }}>
        <Icon
          className="w-4 h-4"
          style={{ color: accent }}
        />
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
      {title}
    </p>
    <p
      className="text-xs mt-1"
      style={{ color: accent, opacity: 0.85 }}>
      {sub}
    </p>
  </div>
);

/* ─── Chart card wrapper ─── */
const ChartCard = ({
  title,
  icon: Icon,
  iconColor,
  children,
}: {
  title: string;
  icon?: React.ElementType;
  iconColor?: string;
  children: React.ReactNode;
}) => (
  <div
    className="rounded-2xl p-5"
    style={{
      background: "var(--bg-elevated)",
      border: "1px solid var(--border)",
    }}>
    <div className="flex items-center gap-2 mb-5">
      {Icon && (
        <Icon
          className="w-4 h-4"
          style={{ color: iconColor ?? "var(--text-muted)" }}
        />
      )}
      <h3
        className="text-sm font-semibold"
        style={{ color: "var(--text-primary)" }}>
        {title}
      </h3>
    </div>
    {children}
  </div>
);

/* ─── Metrics table row ─── */
const MetricRow = ({
  label,
  value,
  last = false,
}: {
  label: string;
  value: number | string;
  last?: boolean;
}) => (
  <div
    className="flex items-center justify-between py-3"
    style={{
      borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.04)",
    }}>
    <span
      className="text-sm"
      style={{ color: "var(--text-muted)" }}>
      {label}
    </span>
    <span
      className="text-sm font-semibold font-mono"
      style={{ color: "var(--text-primary)" }}>
      {typeof value === "number" ? value.toLocaleString() : value}
    </span>
  </div>
);

/* ─── Period selector (custom dropdown) ─── */
const PERIODS = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "1y", label: "Last year" },
];

const PeriodSelect = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const sel = PERIODS.find((p) => p.value === value);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div
      ref={ref}
      className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input-dark flex items-center gap-2 cursor-pointer text-sm"
        style={{ background: "rgba(255,255,255,0.04)", minWidth: 148 }}>
        <span style={{ color: "var(--text-primary)", flex: 1 }}>
          {sel?.label}
        </span>
        <ChevronDown
          className="w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200"
          style={{
            color: "var(--text-muted)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>
      {open && (
        <div
          className="absolute z-50 left-0 right-0 mt-1 rounded-xl overflow-hidden animate-slide-up"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            boxShadow: "0 16px 40px rgba(0,0,0,0.6)",
          }}>
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => {
                onChange(p.value);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2.5 text-sm transition-colors"
              style={{
                background:
                  p.value === value ? "var(--accent-dim)" : "transparent",
                color:
                  p.value === value ? "var(--accent)" : "var(--text-secondary)",
              }}
              onMouseOver={(e) =>
                p.value !== value &&
                ((e.currentTarget as HTMLElement).style.background =
                  "rgba(255,255,255,0.04)")
              }
              onMouseOut={(e) =>
                p.value !== value &&
                ((e.currentTarget as HTMLElement).style.background =
                  "transparent")
              }>
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── Export dropdown ─── */
const ExportMenu = ({
  onExport,
}: {
  onExport: (fmt: "csv" | "json") => void;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div
      ref={ref}
      className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="btn btn-ghost gap-2 text-sm">
        <Download className="w-4 h-4" /> Export
      </button>
      {open && (
        <div
          className="absolute right-0 mt-1 w-36 rounded-xl overflow-hidden animate-slide-up z-20"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            boxShadow: "0 16px 40px rgba(0,0,0,0.6)",
          }}>
          {(["csv", "json"] as const).map((fmt) => (
            <button
              key={fmt}
              type="button"
              onClick={() => {
                onExport(fmt);
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors"
              style={{ color: "var(--text-secondary)" }}
              onMouseOver={(e) =>
                ((e.currentTarget as HTMLElement).style.background =
                  "rgba(255,255,255,0.04)")
              }
              onMouseOut={(e) =>
                ((e.currentTarget as HTMLElement).style.background =
                  "transparent")
              }>
              <Download
                className="w-3.5 h-3.5"
                style={{ color: "var(--text-muted)" }}
              />
              Export {fmt.toUpperCase()}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════
   MAIN
═══════════════════════════════════════════ */
const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30d");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [activeTab, setActiveTab] = useState<ViewTab>("platform");

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await analyticsService.getAnalytics(period);
      setData(res.data as unknown as AnalyticsData);
    } catch {
      toast.error("Failed to fetch analytics");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleExport = async (format: "csv" | "json") => {
    try {
      const blob = await analyticsService.exportData(period, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analytics-${period}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch {
      toast.error("Failed to export");
    }
  };

  const p = data?.platformSummary;
  const s = data?.sdkSummary;

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">
            Platform and SDK application performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PeriodSelect
            value={period}
            onChange={setPeriod}
          />
          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="btn btn-ghost gap-2 text-sm">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />{" "}
            Refresh
          </button>
          <ExportMenu onExport={handleExport} />
        </div>
      </div>

      {/* Tab toggle */}
      <div
        className="flex items-center gap-1 p-1 rounded-xl mb-7 w-fit"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
        }}>
        {[
          { id: "platform" as ViewTab, label: "Platform Users", icon: Users },
          {
            id: "sdk" as ViewTab,
            label: "SDK Users",
            icon: Code2,
            badge: s?.totalApplications
              ? `${s.totalApplications} apps`
              : undefined,
          },
        ].map(({ id, label, icon: Icon, badge }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: activeTab === id ? "var(--accent)" : "transparent",
              color: activeTab === id ? "white" : "var(--text-secondary)",
              boxShadow:
                activeTab === id ? "0 0 16px var(--accent-glow)" : "none",
            }}>
            <Icon className="w-4 h-4" />
            {label}
            {badge && (
              <span
                className="px-1.5 py-0.5 text-[10px] font-bold rounded-full"
                style={{
                  background:
                    activeTab === id
                      ? "rgba(255,255,255,0.2)"
                      : "var(--accent-dim)",
                  color: activeTab === id ? "white" : "var(--accent)",
                }}>
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Spinner size={28} />
          <p
            className="text-sm"
            style={{ color: "var(--text-muted)" }}>
            Loading analytics…
          </p>
        </div>
      )}

      {/* ── PLATFORM TAB ── */}
      {!loading && activeTab === "platform" && (
        <div className="space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Members"
              value={p?.totalUsers || 0}
              sub={`+${p?.newUsersThisWeek || 0} this week`}
              icon={Users}
              accent={C.blue}
              delay={0}
            />
            <StatCard
              title="Active Members"
              value={p?.activeUsers || 0}
              sub={`${p?.mfaAdoptionRate || 0}% MFA enabled`}
              icon={Activity}
              accent={C.green}
              delay={50}
            />
            <StatCard
              title="Total Logins"
              value={p?.totalLogins || 0}
              sub="Platform sign-ins"
              icon={TrendingUp}
              accent={C.purple}
              delay={100}
            />
            <StatCard
              title="New This Month"
              value={p?.newUsersThisMonth || 0}
              sub="Member growth"
              icon={Calendar}
              accent={C.amber}
              delay={150}
            />
          </div>

          {/* Charts row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ChartCard
              title="Member Growth"
              icon={TrendingUp}
              iconColor={C.blue}>
              <ResponsiveContainer
                width="100%"
                height={260}>
                <AreaChart data={data?.platformUserGrowth ?? []}>
                  <defs>
                    <linearGradient
                      id="gBlue"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1">
                      <stop
                        offset="5%"
                        stopColor={C.blue}
                        stopOpacity={0.25}
                      />
                      <stop
                        offset="95%"
                        stopColor={C.blue}
                        stopOpacity={0}
                      />
                    </linearGradient>
                    <linearGradient
                      id="gGreen"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1">
                      <stop
                        offset="5%"
                        stopColor={C.green}
                        stopOpacity={0.2}
                      />
                      <stop
                        offset="95%"
                        stopColor={C.green}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis
                    dataKey="date"
                    {...AXIS_STYLE}
                  />
                  <YAxis {...AXIS_STYLE} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend
                    wrapperStyle={{ fontSize: 12, color: "var(--text-muted)" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke={C.blue}
                    strokeWidth={2}
                    fill="url(#gBlue)"
                    name="Total"
                  />
                  <Area
                    type="monotone"
                    dataKey="newUsers"
                    stroke={C.green}
                    strokeWidth={2}
                    fill="url(#gGreen)"
                    name="New"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Login Activity"
              icon={Activity}
              iconColor={C.purple}>
              <ResponsiveContainer
                width="100%"
                height={260}>
                <LineChart data={data?.loginActivity ?? []}>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis
                    dataKey="date"
                    {...AXIS_STYLE}
                  />
                  <YAxis {...AXIS_STYLE} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend
                    wrapperStyle={{ fontSize: 12, color: "var(--text-muted)" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="logins"
                    stroke={C.purple}
                    strokeWidth={2}
                    dot={false}
                    name="Total Logins"
                  />
                  <Line
                    type="monotone"
                    dataKey="uniqueUsers"
                    stroke={C.pink}
                    strokeWidth={2}
                    dot={false}
                    name="Unique Users"
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Charts row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <ChartCard
              title="Device Breakdown"
              icon={Smartphone}
              iconColor={C.cyan}>
              <ResponsiveContainer
                width="100%"
                height={230}>
                <PieChart>
                  <Pie
                    data={data?.deviceStats ?? []}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="count"
                    nameKey="device"
                    label={({ name, percent }) =>
                      `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                    labelLine={{ stroke: "rgba(255,255,255,0.2)" }}>
                    {(data?.deviceStats ?? []).map((_, i) => (
                      <Cell
                        key={i}
                        fill={PIE_COLORS[i % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <div className="lg:col-span-2">
              <ChartCard
                title="Geographic Distribution"
                icon={Globe}
                iconColor={C.amber}>
                <div className="flex items-center gap-1.5 mb-3 -mt-3">
                  <span
                    className="text-xs italic"
                    style={{ color: "var(--text-muted)" }}>
                    Requires IP geolocation — placeholder data
                  </span>
                </div>
                <ResponsiveContainer
                  width="100%"
                  height={200}>
                  <BarChart
                    data={[
                      { country: "India", users: 0 },
                      { country: "USA", users: 0 },
                      { country: "UK", users: 0 },
                      { country: "Canada", users: 0 },
                      { country: "Germany", users: 0 },
                    ]}>
                    <CartesianGrid {...GRID_PROPS} />
                    <XAxis
                      dataKey="country"
                      {...AXIS_STYLE}
                    />
                    <YAxis {...AXIS_STYLE} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar
                      dataKey="users"
                      fill={C.blue}
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </div>

          {/* Metrics table */}
          <ChartCard title="Platform Metrics Summary">
            {[
              { label: "Total Members", value: p?.totalUsers ?? 0 },
              { label: "Active Members", value: p?.activeUsers ?? 0 },
              { label: "New This Week", value: p?.newUsersThisWeek ?? 0 },
              { label: "New This Month", value: p?.newUsersThisMonth ?? 0 },
              { label: "MFA Adoption", value: `${p?.mfaAdoptionRate ?? 0}%` },
              { label: "Total Logins", value: p?.totalLogins ?? 0 },
            ].map((row, i, arr) => (
              <MetricRow
                key={row.label}
                label={row.label}
                value={row.value}
                last={i === arr.length - 1}
              />
            ))}
          </ChartCard>
        </div>
      )}

      {/* ── SDK TAB ── */}
      {!loading && activeTab === "sdk" && (
        <div className="space-y-6">
          {/* SDK stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total SDK Users"
              value={s?.totalUsers ?? 0}
              sub={`+${s?.newUsersThisWeek ?? 0} this week`}
              icon={Users}
              accent={C.blue}
              delay={0}
            />
            <StatCard
              title="Active SDK Users"
              value={s?.activeUsers ?? 0}
              sub={`${s?.newUsersThisMonth ?? 0} new this month`}
              icon={Activity}
              accent={C.green}
              delay={50}
            />
            <StatCard
              title="SDK Logins"
              value={s?.totalLogins ?? 0}
              sub="End-user sign-ins"
              icon={TrendingUp}
              accent={C.purple}
              delay={100}
            />
            <StatCard
              title="Applications"
              value={s?.totalApplications ?? 0}
              sub="Active apps"
              icon={AppWindow}
              accent={C.amber}
              delay={150}
            />
          </div>

          {/* SDK charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ChartCard
              title="SDK User Growth"
              icon={TrendingUp}
              iconColor={C.green}>
              <ResponsiveContainer
                width="100%"
                height={260}>
                <AreaChart data={data?.sdkUserGrowth ?? []}>
                  <defs>
                    <linearGradient
                      id="gSdkGreen"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1">
                      <stop
                        offset="5%"
                        stopColor={C.green}
                        stopOpacity={0.25}
                      />
                      <stop
                        offset="95%"
                        stopColor={C.green}
                        stopOpacity={0}
                      />
                    </linearGradient>
                    <linearGradient
                      id="gSdkBlue"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1">
                      <stop
                        offset="5%"
                        stopColor={C.blue}
                        stopOpacity={0.2}
                      />
                      <stop
                        offset="95%"
                        stopColor={C.blue}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis
                    dataKey="date"
                    {...AXIS_STYLE}
                  />
                  <YAxis {...AXIS_STYLE} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend
                    wrapperStyle={{ fontSize: 12, color: "var(--text-muted)" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke={C.green}
                    strokeWidth={2}
                    fill="url(#gSdkGreen)"
                    name="Total"
                  />
                  <Area
                    type="monotone"
                    dataKey="newUsers"
                    stroke={C.blue}
                    strokeWidth={2}
                    fill="url(#gSdkBlue)"
                    name="New"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="SDK Login Activity"
              icon={Activity}
              iconColor={C.green}>
              <ResponsiveContainer
                width="100%"
                height={260}>
                <LineChart data={data?.sdkLoginActivity ?? []}>
                  <CartesianGrid {...GRID_PROPS} />
                  <XAxis
                    dataKey="date"
                    {...AXIS_STYLE}
                  />
                  <YAxis {...AXIS_STYLE} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Line
                    type="monotone"
                    dataKey="logins"
                    stroke={C.green}
                    strokeWidth={2}
                    dot={false}
                    name="SDK Logins"
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Users by application */}
          {(s?.usersByApplication ?? []).length > 0 && (
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
              }}>
              <div
                className="flex items-center gap-2 px-5 py-4"
                style={{ borderBottom: "1px solid var(--border)" }}>
                <AppWindow
                  className="w-4 h-4"
                  style={{ color: "var(--accent)" }}
                />
                <h3
                  className="text-sm font-semibold"
                  style={{ color: "var(--text-primary)" }}>
                  Users by Application
                </h3>
              </div>
              <table className="table-dark">
                <thead>
                  <tr>
                    <th>Application</th>
                    <th>Type</th>
                    <th style={{ textAlign: "right" }}>Total Users</th>
                    <th style={{ textAlign: "right" }}>Active Users</th>
                  </tr>
                </thead>
                <tbody>
                  {(s?.usersByApplication ?? []).map((app) => (
                    <tr key={app.applicationId}>
                      <td>
                        <p
                          className="text-sm font-semibold"
                          style={{ color: "var(--text-primary)" }}>
                          {app.applicationName}
                        </p>
                        <code
                          className="text-xs font-mono"
                          style={{ color: "var(--text-muted)" }}>
                          {app.clientId}
                        </code>
                      </td>
                      <td>
                        <span className="badge badge-accent text-[10px] capitalize">
                          {app.type.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <span
                          className="text-sm font-mono"
                          style={{ color: "var(--text-primary)" }}>
                          {app.userCount.toLocaleString()}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <span
                          className="text-sm font-mono font-semibold"
                          style={{ color: "var(--success)" }}>
                          {app.activeUserCount.toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* SDK device breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <ChartCard
              title="SDK Device Breakdown"
              icon={Smartphone}
              iconColor={C.cyan}>
              <ResponsiveContainer
                width="100%"
                height={230}>
                <PieChart>
                  <Pie
                    data={data?.sdkDeviceStats ?? []}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="count"
                    nameKey="device"
                    label={({ name, percent }) =>
                      `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                    labelLine={{ stroke: "rgba(255,255,255,0.2)" }}>
                    {(data?.sdkDeviceStats ?? []).map((_, i) => (
                      <Cell
                        key={i}
                        fill={PIE_COLORS[i % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <div className="lg:col-span-2">
              <ChartCard title="SDK Metrics Summary">
                {[
                  { label: "Total SDK Users", value: s?.totalUsers ?? 0 },
                  { label: "Active SDK Users", value: s?.activeUsers ?? 0 },
                  { label: "New This Week", value: s?.newUsersThisWeek ?? 0 },
                  { label: "New This Month", value: s?.newUsersThisMonth ?? 0 },
                  { label: "Total SDK Logins", value: s?.totalLogins ?? 0 },
                  {
                    label: "Total Applications",
                    value: s?.totalApplications ?? 0,
                  },
                ].map((row, i, arr) => (
                  <MetricRow
                    key={row.label}
                    label={row.label}
                    value={row.value}
                    last={i === arr.length - 1}
                  />
                ))}
              </ChartCard>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
