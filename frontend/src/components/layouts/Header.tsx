import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, ChevronDown, LogOut, Settings, User } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { logout } from "../../features/auth/authSlice";
import OrganizationSwitcher from "../ui/OrganizationSwitcher";
import { toast } from "sonner";
import { AvatarBubble } from "../ui";

/* ─────────────────────────────────────────────────────────────────────────────
   Header
───────────────────────────────────────────────────────────────────────────── */
const Header = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setShowUserMenu(false);
    };
    window.addEventListener("mousedown", h);
    return () => window.removeEventListener("mousedown", h);
  }, []);

  const handleLogout = async () => {
    try {
      setShowUserMenu(false);
      await dispatch(logout()).unwrap();
      toast.success("Signed out");
      navigate("/");
    } catch {
      toast.error("Failed to sign out");
    }
  };

  if (!user) return null;

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between px-6"
      style={{
        height: "var(--header-height)",
        background: "rgba(13, 17, 23, 0.85)",
        borderBottom: "1px solid var(--border)",
        backdropFilter: "blur(12px)",
      }}>
      {/* Left */}
      <div className="flex items-center gap-4">
        <OrganizationSwitcher />
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <button
          className="relative flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
          style={{ color: "var(--text-muted)" }}
          onMouseOver={(e) => {
            (e.currentTarget as HTMLElement).style.background =
              "rgba(255,255,255,0.05)";
            (e.currentTarget as HTMLElement).style.color =
              "var(--text-secondary)";
          }}
          onMouseOut={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
          }}>
          <Bell className="w-4 h-4" />
          <span
            className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
            style={{ background: "var(--accent)" }}
          />
        </button>

        {/* User menu */}
        <div
          className="relative"
          ref={menuRef}>
          {/* Trigger button */}
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all"
            onMouseOver={(e) =>
              ((e.currentTarget as HTMLElement).style.background =
                "rgba(255,255,255,0.05)")
            }
            onMouseOut={(e) =>
              ((e.currentTarget as HTMLElement).style.background =
                "transparent")
            }>
            {/* 28px avatar in header bar */}
            <AvatarBubble
              user={user}
              size={28}
            />

            <span
              className="hidden md:block text-xs font-semibold"
              style={{ color: "var(--text-primary)" }}>
              {user.name.split(" ")[0]}
            </span>

            <ChevronDown
              className="w-3 h-3"
              style={{ color: "var(--text-muted)" }}
            />
          </button>

          {/* Dropdown */}
          {showUserMenu && (
            <div
              className="absolute right-0 mt-2 w-56 rounded-xl overflow-hidden animate-slide-up"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
              }}>
              {/* User info row */}
              <div
                className="flex items-center gap-3 px-4 py-3"
                style={{ borderBottom: "1px solid var(--border)" }}>
                {/* 36px avatar in dropdown */}
                <AvatarBubble
                  user={user}
                  size={36}
                />

                <div className="min-w-0 flex-1">
                  <p
                    className="text-sm font-semibold truncate"
                    style={{ color: "var(--text-primary)" }}>
                    {user.name}
                  </p>
                  <p
                    className="text-xs truncate mt-0.5"
                    style={{ color: "var(--text-muted)" }}>
                    {user.email}
                  </p>
                  <span className="badge badge-accent mt-1">{user.role}</span>
                </div>
              </div>

              {/* Nav items */}
              <div className="p-1">
                {[
                  { label: "Profile", icon: User, path: "/profile" },
                  { label: "Settings", icon: Settings, path: "/settings" },
                ].map(({ label, icon: Icon, path }) => (
                  <button
                    key={path}
                    onClick={() => {
                      navigate(path);
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left"
                    style={{ color: "var(--text-secondary)" }}
                    onMouseOver={(e) =>
                      ((e.currentTarget as HTMLElement).style.background =
                        "rgba(255,255,255,0.04)")
                    }
                    onMouseOut={(e) =>
                      ((e.currentTarget as HTMLElement).style.background =
                        "transparent")
                    }>
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}

                <div
                  style={{
                    borderTop: "1px solid var(--border)",
                    margin: "4px 0",
                  }}
                />

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left"
                  style={{ color: "var(--danger)" }}
                  onMouseOver={(e) =>
                    ((e.currentTarget as HTMLElement).style.background =
                      "var(--danger-dim)")
                  }
                  onMouseOut={(e) =>
                    ((e.currentTarget as HTMLElement).style.background =
                      "transparent")
                  }>
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
