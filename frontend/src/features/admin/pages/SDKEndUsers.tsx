import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  Search,
  Trash2,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Power,
  Users,
} from "lucide-react";
import { applicationService } from "../../application/api/application.api";
import { applicationMemberService } from "../api/applicationMember.api";
import { Spinner, EmptyState } from "../../../components/ui";

interface SDKUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  lastLoginAt?: string;
  lastLoginIp?: string;
  createdAt: string;
}

interface Application {
  id: string;
  name: string;
  description?: string;
}

const UserAvatar = ({ user, size = 36 }: { user: SDKUser; size?: number }) => (
  <div
    className="rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden"
    style={{
      width: size,
      height: size,
      fontSize: size * 0.38,
      background: user.avatar
        ? "transparent"
        : "linear-gradient(135deg, #6366f1, #818cf8)",
      boxShadow: "0 0 0 1px rgba(255,255,255,0.06)",
    }}>
    {user.avatar ? (
      <img
        src={user.avatar}
        alt={user.name}
        className="w-full h-full object-cover"
      />
    ) : (
      user.name.charAt(0).toUpperCase()
    )}
  </div>
);

const StatusBadge = ({
  isActive,
  isVerified,
}: {
  isActive: boolean;
  isVerified: boolean;
}) => (
  <div className="flex gap-1.5">
    <span
      className="badge text-xs"
      style={{
        background: isActive ? "rgba(16,185,129,0.15)" : "rgba(244,63,94,0.15)",
        color: isActive ? "var(--success)" : "var(--danger)",
      }}>
      {isActive ? "Active" : "Inactive"}
    </span>
    {isVerified && (
      <span
        className="badge text-xs"
        style={{
          background: "rgba(99,102,241,0.15)",
          color: "var(--accent)",
        }}>
        Verified
      </span>
    )}
  </div>
);

const ActionMenu = ({
  user,
  onToggleStatus,
  onDelete,
}: {
  user: SDKUser;
  onToggleStatus: () => void;
  onDelete: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    if (open) document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, [open]);

  return (
    <div
      ref={ref}
      className="relative inline-block">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="btn btn-ghost p-1.5">
        <MoreVertical className="w-4 h-4" />
      </button>

      {open && (
        <div
          className="absolute right-0 mt-1 w-48 rounded-xl overflow-hidden animate-slide-up z-20"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            boxShadow: "0 16px 40px rgba(0,0,0,0.6)",
          }}>
          <div className="p-1">
            <button
              onClick={() => {
                onToggleStatus();
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-xs transition-colors"
              style={{ color: "var(--warning)" }}
              onMouseOver={(e) =>
                ((e.currentTarget as HTMLElement).style.background =
                  "rgba(245,158,11,0.1)")
              }
              onMouseOut={(e) =>
                ((e.currentTarget as HTMLElement).style.background =
                  "transparent")
              }>
              {user.isActive ? (
                <>
                  <Power className="w-3.5 h-3.5 inline mr-2" />
                  Disable User
                </>
              ) : (
                <>
                  <Power className="w-3.5 h-3.5 inline mr-2" />
                  Enable User
                </>
              )}
            </button>
            <div
              style={{
                borderTop: "1px solid var(--border)",
                margin: "3px 0",
              }}
            />
            <button
              onClick={() => {
                onDelete();
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-xs transition-colors"
              style={{ color: "var(--danger)" }}
              onMouseOver={(e) =>
                ((e.currentTarget as HTMLElement).style.background =
                  "rgba(244,63,94,0.1)")
              }
              onMouseOut={(e) =>
                ((e.currentTarget as HTMLElement).style.background =
                  "transparent")
              }>
              <Trash2 className="w-3.5 h-3.5 inline mr-2" />
              Delete User
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const DarkDropdown = ({
  value,
  onChange,
  options,
  placeholder = "Select",
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

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
        className="input-dark w-full flex items-center justify-between gap-2 cursor-pointer text-sm"
        style={{ background: "rgba(255,255,255,0.04)" }}>
        <span
          style={{
            color: selected ? "var(--text-primary)" : "var(--text-muted)",
          }}>
          {selected ? selected.label : placeholder}
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
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm transition-colors"
              style={{
                background:
                  o.value === value ? "var(--accent-dim)" : "transparent",
                color:
                  o.value === value ? "var(--accent)" : "var(--text-secondary)",
              }}
              onMouseOver={(e) =>
                o.value !== value &&
                ((e.currentTarget as HTMLElement).style.background =
                  "rgba(255,255,255,0.04)")
              }
              onMouseOut={(e) =>
                o.value !== value &&
                ((e.currentTarget as HTMLElement).style.background =
                  "transparent")
              }>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const PageBtn = ({
  onClick,
  disabled,
  active = false,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="w-8 h-8 rounded-lg text-xs font-medium flex items-center justify-center transition-all"
    style={{
      background: active ? "var(--accent)" : "rgba(255,255,255,0.04)",
      color: active ? "white" : "var(--text-secondary)",
      border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
      opacity: disabled ? 0.35 : 1,
      cursor: disabled ? "not-allowed" : "pointer",
    }}>
    {children}
  </button>
);

export default function SDKEndUsers() {
  const [apps, setApps] = useState<Application[]>([]);
  const [selectedAppId, setSelectedAppId] = useState("");
  const [users, setUsers] = useState<SDKUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  // Fetch apps on mount
  useEffect(() => {
    const fetchApps = async () => {
      try {
        const res = await applicationService.getApplications();
        const apps = res?.data?.applications || [];
        setApps(apps);
        if (apps.length > 0) {
          setSelectedAppId(apps[0].id);
        }
      } catch {
        toast.error("Failed to load applications");
      }
    };
    fetchApps();
  }, []);

  // Fetch SDK users when app changes
  useEffect(() => {
    if (!selectedAppId) return;

    const fetchUsers = async () => {
      setLoading(true);
      try {
        const res = searchQuery
          ? await applicationMemberService.searchAppUsers(
              selectedAppId,
              searchQuery,
              pagination.page,
            )
          : await applicationMemberService.getAppUsers(
              selectedAppId,
              pagination.page,
            );
        setUsers(res?.data?.data?.users || []);
        console.log("Fetched users:", res?.data?.data?.users);
        setPagination((p) => ({
          ...p,
          total: res?.data?.data?.pagination?.count || 0,
          totalPages: res?.data?.data?.pagination?.total || 0,
        }));
        console.log("Pagination info:", res?.data?.data?.pagination);
      } catch (error) {
        console.error("Error loading SDK users:", error);
        toast.error("Failed to load users");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [selectedAppId, searchQuery, pagination.page]);

  const handleToggleStatus = async (userId: string, isActive: boolean) => {
    if (!selectedAppId) return;
    try {
      await applicationMemberService.toggleUserStatus(
        selectedAppId,
        userId,
        !isActive,
      );
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isActive: !isActive } : u)),
      );
      toast.success(isActive ? "User disabled" : "User enabled");
    } catch {
      toast.error("Failed to update user status");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!selectedAppId || !confirm("Delete user? This cannot be undone."))
      return;
    try {
      await applicationMemberService.deleteAppUser(selectedAppId, userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      toast.success("User deleted");
    } catch {
      toast.error("Failed to delete user");
    }
  };

  const selectedApp = apps.find((a) => a.id === selectedAppId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold mb-2"
          style={{ color: "var(--text-primary)" }}>
          End Users
        </h1>
        <p
          className="text-sm"
          style={{ color: "var(--text-secondary)" }}>
          View and manage users who signed up for your application
        </p>
      </div>

      {/* App selector */}
      {apps.length > 0 ? (
        <div className="max-w-xs">
          <label className="label-dark">Select Application</label>
          <DarkDropdown
            value={selectedAppId}
            onChange={setSelectedAppId}
            options={apps.map((app) => ({
              value: app.id,
              label: app.name,
            }))}
          />
        </div>
      ) : (
        <div
          className="text-sm"
          style={{ color: "var(--text-muted)" }}>
          Create an application first to view end users
        </div>
      )}

      {selectedAppId && selectedApp && (
        <>
          {/* Search bar */}
          <div
            className="input-dark flex items-center gap-2 px-3"
            style={{ background: "rgba(255,255,255,0.04)" }}>
            <Search
              className="w-4 h-4"
              style={{ color: "var(--text-muted)" }}
            />
            <input
              type="text"
              placeholder="Search by email or name..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="bg-transparent border-0 outline-none flex-1 text-sm"
              style={{
                color: "var(--text-primary)",
              }}
            />
          </div>

          {/* Users list or empty state */}
          {loading ? (
            <div
              className="rounded-xl border p-8 flex justify-center"
              style={{ borderColor: "var(--border)" }}>
              <Spinner />
            </div>
          ) : users.length === 0 ? (
            <div
              className="rounded-xl border p-8"
              style={{ borderColor: "var(--border)" }}>
              <EmptyState
                icon={Users}
                title="No users yet"
                description="Users will appear here when they sign up for your application"
              />
            </div>
          ) : (
            <div
              className="rounded-xl border overflow-hidden"
              style={{ borderColor: "var(--border)" }}>
              <table className="w-full text-sm">
                <thead>
                  <tr
                    style={{
                      borderBottom: "1px solid var(--border)",
                      background: "rgba(255,255,255,0.02)",
                    }}>
                    <th
                      className="px-4 py-3 text-left font-medium"
                      style={{ color: "var(--text-muted)" }}>
                      User
                    </th>
                    <th
                      className="px-4 py-3 text-left font-medium"
                      style={{ color: "var(--text-muted)" }}>
                      Status
                    </th>
                    <th
                      className="px-4 py-3 text-left font-medium"
                      style={{ color: "var(--text-muted)" }}>
                      Last Login
                    </th>
                    <th
                      className="px-4 py-3 text-left font-medium"
                      style={{ color: "var(--text-muted)" }}>
                      Joined
                    </th>
                    <th
                      className="px-4 py-3 text-right font-medium"
                      style={{ color: "var(--text-muted)" }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      style={{
                        borderBottom: "1px solid var(--border)",
                      }}
                      onMouseOver={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(255,255,255,0.02)")
                      }
                      onMouseOut={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            user={user}
                            size={32}
                          />
                          <div>
                            <p
                              className="font-medium text-sm"
                              style={{ color: "var(--text-primary)" }}>
                              {user.name}
                            </p>
                            <p
                              className="text-xs"
                              style={{ color: "var(--text-muted)" }}>
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          isActive={user.isActive}
                          isVerified={user.isEmailVerified}
                        />
                      </td>
                      <td className="px-4 py-3">
                        {user.lastLoginAt ? (
                          <div
                            className="text-xs"
                            style={{ color: "var(--text-secondary)" }}>
                            {new Date(user.lastLoginAt).toLocaleDateString()}
                          </div>
                        ) : (
                          <div
                            className="text-xs"
                            style={{ color: "var(--text-muted)" }}>
                            Never
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div
                          className="text-xs"
                          style={{ color: "var(--text-secondary)" }}>
                          {new Date(user.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ActionMenu
                          user={user}
                          onToggleStatus={() =>
                            handleToggleStatus(user.id, user.isActive)
                          }
                          onDelete={() => handleDeleteUser(user.id)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && users.length > 0 && (
            <div className="flex items-center justify-between">
              <p
                className="text-sm"
                style={{ color: "var(--text-muted)" }}>
                Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
                of {pagination.total}
              </p>
              <div className="flex gap-2">
                <PageBtn
                  onClick={() =>
                    setPagination((p) => ({ ...p, page: p.page - 1 }))
                  }
                  disabled={pagination.page === 1}>
                  <ChevronLeft className="w-4 h-4" />
                </PageBtn>
                {Array.from(
                  { length: pagination.totalPages },
                  (_, i) => i + 1,
                ).map((p) => (
                  <PageBtn
                    key={p}
                    onClick={() =>
                      setPagination((prev) => ({ ...prev, page: p }))
                    }
                    active={p === pagination.page}>
                    {p}
                  </PageBtn>
                ))}
                <PageBtn
                  onClick={() =>
                    setPagination((p) => ({ ...p, page: p.page + 1 }))
                  }
                  disabled={pagination.page === pagination.totalPages}>
                  <ChevronRight className="w-4 h-4" />
                </PageBtn>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
