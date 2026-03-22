import { Link, useLocation } from "react-router-dom";
import { useAppSelector } from "../../app/hooks";
import {
  AppWindow,
  BarChart3,
  Building2,
  ChevronLeft,
  ChevronRight,
  Code,
  FileText,
  Key,
  LayoutDashboard,
  Settings,
  Shield,
  User,
  Users,
  Webhook,
  Zap,
} from "lucide-react";
import { AvatarBubble } from "../ui";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  badge?: string;
  adminOnly?: boolean;
}

const Sidebar = ({ collapsed, onToggle }: SidebarProps) => {
  const location = useLocation();
  const { user } = useAppSelector((state) => state.auth);
  const isAdmin = user?.role === "admin" || user?.role === "owner";

  const navItems: NavItem[] = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Profile", path: "/profile", icon: User },
    {
      name: "Organizations",
      path: "/organizations",
      icon: Building2,
      adminOnly: true,
    },
    {
      name: "Applications",
      path: "/applications",
      icon: AppWindow,
      adminOnly: true,
    },
    { name: "API Keys", path: "/api-keys", icon: Key, adminOnly: true },
    { name: "Webhooks", path: "/webhooks", icon: Webhook },
    { name: "Security", path: "/security", icon: Shield },
    { name: "Audit Logs", path: "/audit-logs", icon: FileText },
    { name: "Settings", path: "/settings", icon: Settings },
    { name: "Members", path: "/organization/members", icon: Users },
    { name: "Developers", path: "/developers", icon: Code },
  ];

  const adminItems: NavItem[] = [
    { name: "Admin", path: "/admin", icon: Zap },
    { name: "Users", path: "/users", icon: Users },
    { name: "Analytics", path: "/analytics", icon: BarChart3 },
  ];

  const visible = navItems.filter((i) => !i.adminOnly || isAdmin);
  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <aside
      className="fixed left-0 top-0 h-screen z-40 flex flex-col transition-all duration-300"
      style={{
        width: collapsed ? "var(--sidebar-collapsed)" : "var(--sidebar-width)",
        background: "var(--bg-surface)",
        borderRight: "1px solid var(--border)",
      }}>
      {/* Logo */}
      <div
        className="flex items-center justify-between px-4 flex-shrink-0"
        style={{
          height: "var(--header-height)",
          borderBottom: "1px solid var(--border)",
        }}>
        {!collapsed && (
          <Link
            to="/dashboard"
            className="flex items-center gap-2.5 text-decoration-none">
            <div
              className="flex items-center justify-center rounded-lg flex-shrink-0"
              style={{
                width: 32,
                height: 32,
                background: "linear-gradient(135deg, #6366f1, #818cf8)",
                boxShadow: "0 0 16px rgba(99,102,241,0.4)",
              }}>
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span
              className="font-bold text-sm tracking-tight"
              style={{ color: "var(--text-primary)" }}>
              AuthFlow
            </span>
          </Link>
        )}
        {collapsed && (
          <div
            className="flex items-center justify-center rounded-lg mx-auto"
            style={{
              width: 32,
              height: 32,
              background: "linear-gradient(135deg, #6366f1, #818cf8)",
              boxShadow: "0 0 16px rgba(99,102,241,0.4)",
            }}>
            <Shield className="w-4 h-4 text-white" />
          </div>
        )}
        {!collapsed && (
          <button
            onClick={onToggle}
            className="flex items-center justify-center rounded-lg w-7 h-7 transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseOver={(e) =>
              (e.currentTarget.style.color = "var(--text-secondary)")
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.color = "var(--text-muted)")
            }>
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {visible.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              title={collapsed ? item.name : undefined}
              className={`nav-link ${active ? "active" : ""}`}
              style={{ justifyContent: collapsed ? "center" : undefined }}>
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span className="flex-1">{item.name}</span>}
              {!collapsed && item.badge && (
                <span className="badge badge-accent text-[10px]">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            {!collapsed && (
              <p
                className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: "var(--text-muted)" }}>
                Admin
              </p>
            )}
            {collapsed && (
              <div
                className="my-2"
                style={{ borderTop: "1px solid var(--border)" }}
              />
            )}
            {adminItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  title={collapsed ? item.name : undefined}
                  className={`nav-link ${active ? "active" : ""}`}
                  style={{ justifyContent: collapsed ? "center" : undefined }}>
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {!collapsed && <span className="flex-1">{item.name}</span>}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* Expand button when collapsed */}
      {collapsed && (
        <div
          className="p-2 flex-shrink-0"
          style={{ borderTop: "1px solid var(--border)" }}>
          <button
            onClick={onToggle}
            className="w-full flex items-center justify-center py-2 rounded-lg transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseOver={(e) =>
              (e.currentTarget.style.background = "rgba(255,255,255,0.04)")
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.background = "transparent")
            }>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* User info at bottom when expanded */}
      {!collapsed && user && (
        <div
          className="px-3 py-3 flex-shrink-0 flex items-center gap-3"
          style={{ borderTop: "1px solid var(--border)" }}>
          <div>
            <AvatarBubble
              user={user}
              size={28}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="text-xs font-medium truncate"
              style={{ color: "var(--text-primary)" }}>
              {user.name}
            </p>
            <p
              className="text-[11px] truncate"
              style={{ color: "var(--text-muted)" }}>
              {user.role}
            </p>
          </div>
          <div
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: "var(--success)" }}
          />
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
