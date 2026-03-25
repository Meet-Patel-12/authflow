import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  Search,
  Plus,
  Trash2,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  X,
  ChevronDown,
  Edit,
  Users,
} from "lucide-react";
import { applicationService } from "../../application/api/application.api";
import { applicationMemberService } from "../api/applicationMember.api";
import type { User } from "../../../shared/types/global.types";
import { Spinner, EmptyState } from "../../../components/ui";

interface AppUser {
  _id: string;
  userId: User;
  role: "viewer" | "editor" | "admin";
  assignedAt: string;
}

interface Application {
  id: string;
  name: string;
  description?: string;
}

const RoleBadge = ({ role }: { role: string }) => {
  const map: Record<string, string> = {
    admin: "badge-accent",
    editor: "badge-warning",
    viewer: "badge-muted",
  };
  return (
    <span className={`badge ${map[role] ?? "badge-muted"} capitalize`}>
      {role}
    </span>
  );
};

const UserAvatar = ({ user, size = 36 }: { user: User; size?: number }) => (
  <div
    className="rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden"
    style={{
      width: size,
      height: size,
      fontSize: size * 0.38,
      background: (user as { avatar?: string }).avatar
        ? "transparent"
        : "linear-gradient(135deg, #6366f1, #818cf8)",
      boxShadow: "0 0 0 1px rgba(255,255,255,0.06)",
    }}>
    {(user as { avatar?: string }).avatar ? (
      <img
        src={(user as { avatar?: string }).avatar}
        alt={user.name}
        className="w-full h-full object-cover"
      />
    ) : (
      user.name.charAt(0).toUpperCase()
    )}
  </div>
);

const DropItem = ({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full text-left px-3 py-2 text-sm transition-colors"
    style={{
      background: active ? "var(--accent-dim)" : "transparent",
      color: active ? "var(--accent)" : "var(--text-secondary)",
    }}
    onMouseOver={(e) =>
      !active &&
      ((e.currentTarget as HTMLElement).style.background =
        "rgba(255,255,255,0.04)")
    }
    onMouseOut={(e) =>
      !active &&
      ((e.currentTarget as HTMLElement).style.background = "transparent")
    }>
    {label}
  </button>
);

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
            <DropItem
              key={o.value}
              label={o.label}
              active={o.value === value}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
            />
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

// Add user modal
const AddUserModal = ({
  appId,
  onClose,
  onAdded,
}: {
  appId: string;
  onClose: () => void;
  onAdded: () => void;
}) => {
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [role, setRole] = useState("viewer");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchAvailable = async () => {
      try {
        const res = await applicationMemberService.getAvailableUsers(appId);
        setAvailableUsers(res?.data?.users || []);
      } catch (error) {
        console.error("Error fetching available users:", error);
        toast.error("Failed to fetch available users");
      } finally {
        setLoading(false);
      }
    };
    fetchAvailable();
  }, [appId]);

  const handleAdd = async () => {
    if (!selectedUserId) {
      toast.error("Select a user");
      return;
    }
    setSaving(true);
    try {
      await applicationMemberService.addUserToApp(appId, selectedUserId, role);
      toast.success("User added to app");
      onAdded();
    } catch (e) {
      const error = e as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to add user");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && !saving && onClose()}>
      <div className="modal-box p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2
            className="text-base font-semibold"
            style={{ color: "var(--text-primary)" }}>
            Add user to application
          </h2>
          <button
            onClick={onClose}
            disabled={saving}
            className="btn btn-ghost p-1.5">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : availableUsers.length === 0 ? (
          <div
            style={{ color: "var(--text-muted)" }}
            className="text-sm">
            All organization members are already in this application
          </div>
        ) : (
          <>
            <div>
              <label className="label-dark">Select user</label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="input-dark"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  color: selectedUserId
                    ? "var(--text-primary)"
                    : "var(--text-muted)",
                }}>
                <option value="">Choose a user...</option>
                {availableUsers.map((user) => (
                  <option
                    key={user.id}
                    value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label-dark">Role</label>
              <DarkDropdown
                value={role}
                onChange={setRole}
                options={[
                  { value: "viewer", label: "Viewer" },
                  { value: "editor", label: "Editor" },
                  { value: "admin", label: "Admin" },
                ]}
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                className="btn btn-ghost flex-1"
                onClick={onClose}
                disabled={saving}>
                Cancel
              </button>
              <button
                className="btn btn-primary flex-1 gap-2"
                onClick={handleAdd}
                disabled={saving || !selectedUserId}>
                {saving ? (
                  <>
                    <Spinner size={14} /> Adding...
                  </>
                ) : (
                  "Add user"
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Action menu
const ActionMenu = ({
  appUser,
  onUpdateRole,
  onRemove,
}: {
  appUser: AppUser;
  onUpdateRole: (role: string) => void;
  onRemove: () => void;
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
            {["viewer", "editor", "admin"].map((r) => (
              <button
                key={r}
                onClick={() => {
                  onUpdateRole(r);
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-xs transition-colors"
                style={{
                  background:
                    appUser.role === r ? "var(--accent-dim)" : "transparent",
                  color:
                    appUser.role === r
                      ? "var(--accent)"
                      : "var(--text-secondary)",
                }}
                onMouseOver={(e) =>
                  appUser.role !== r &&
                  ((e.currentTarget as HTMLElement).style.background =
                    "rgba(255,255,255,0.04)")
                }
                onMouseOut={(e) =>
                  appUser.role !== r &&
                  ((e.currentTarget as HTMLElement).style.background =
                    "transparent")
                }>
                <Edit className="w-3.5 h-3.5 inline mr-2" />
                Change to {r}
              </button>
            ))}
            <div
              style={{
                borderTop: "1px solid var(--border)",
                margin: "3px 0",
              }}
            />
            <button
              onClick={() => {
                onRemove();
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
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Main component
const ApplicationUsers = () => {
  const [apps, setApps] = useState<Application[]>([]);
  const [selectedAppId, setSelectedAppId] = useState("");
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [updating, setUpdating] = useState<string | null>(null);

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

  // Fetch app users when app changes
  useEffect(() => {
    if (!selectedAppId) return;

    const fetchAppUsers = async () => {
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
        setAppUsers(res?.data?.users || []);
        setPagination((p) => ({
          ...p,
          total: res?.data?.pagination?.count || 0,
          totalPages: res?.data?.pagination?.total || 0,
        }));
      } catch (error) {
        console.error("Error loading app users:", error);
        toast.error("Failed to load app users");
      } finally {
        setLoading(false);
      }
    };

    fetchAppUsers();
  }, [selectedAppId, searchQuery, pagination.page]);

  const handleUpdateRole = async (userId: string, newRole: string) => {
    if (!selectedAppId) return;
    setUpdating(userId);
    try {
      await applicationMemberService.updateUserRole(
        selectedAppId,
        userId,
        newRole,
      );
      setAppUsers((prev) =>
        prev.map((u) =>
          u.userId.id === userId
            ? { ...u, role: newRole as "viewer" | "editor" | "admin" }
            : u,
        ),
      );
      toast.success("Role updated");
    } catch {
      toast.error("Failed to update role");
    } finally {
      setUpdating(null);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!selectedAppId || !confirm("Remove user from app?")) return;
    setUpdating(userId);
    try {
      await applicationMemberService.removeUserFromApp(selectedAppId, userId);
      setAppUsers((prev) => prev.filter((u) => u.userId.id !== userId));
      toast.success("User removed");
    } catch {
      toast.error("Failed to remove user");
    } finally {
      setUpdating(null);
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
          Application Users
        </h1>
        <p
          className="text-sm"
          style={{ color: "var(--text-secondary)" }}>
          Manage users assigned to your applications
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
            placeholder="Choose app..."
          />
        </div>
      ) : (
        <div
          className="p-6 rounded-xl text-center"
          style={{
            background: "rgba(99,102,241,0.1)",
            border: "1px solid var(--accent-dim)",
          }}>
          <p
            style={{ color: "var(--text-secondary)" }}
            className="text-sm">
            No applications found. Create one first.
          </p>
        </div>
      )}

      {selectedApp && (
        <>
          {/* Toolbar */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-72">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: "var(--text-muted)" }}
                />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPagination((p) => ({ ...p, page: 1 }));
                  }}
                  className="input-dark pl-9"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                />
              </div>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn btn-primary gap-2">
              <Plus className="w-4 h-4" /> Add user
            </button>
          </div>

          {/* Users table */}
          <div
            className="rounded-xl overflow-hidden border"
            style={{ borderColor: "var(--border)" }}>
            {loading ? (
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            ) : appUsers.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No users yet"
                description="Add users to this application to get started"
              />
            ) : (
              <>
                <div
                  className="overflow-x-auto"
                  style={{ background: "var(--bg-surface)" }}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr
                        style={{
                          borderBottom: "1px solid var(--border)",
                          background: "rgba(255,255,255,0.02)",
                        }}>
                        <th
                          className="px-4 py-3 text-left font-semibold"
                          style={{ color: "var(--text-secondary)" }}>
                          User
                        </th>
                        <th
                          className="px-4 py-3 text-left font-semibold"
                          style={{ color: "var(--text-secondary)" }}>
                          Email
                        </th>
                        <th
                          className="px-4 py-3 text-left font-semibold"
                          style={{ color: "var(--text-secondary)" }}>
                          Role
                        </th>
                        <th
                          className="px-4 py-3 text-right font-semibold"
                          style={{ color: "var(--text-secondary)" }}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {appUsers.map((appUser) => (
                        <tr
                          key={appUser._id}
                          style={{
                            borderBottom: "1px solid var(--border)",
                            opacity: updating === appUser.userId.id ? 0.5 : 1,
                          }}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <UserAvatar
                                user={appUser.userId}
                                size={32}
                              />
                              <span
                                className="font-medium"
                                style={{ color: "var(--text-primary)" }}>
                                {appUser.userId.name}
                              </span>
                            </div>
                          </td>
                          <td
                            className="px-4 py-3"
                            style={{ color: "var(--text-secondary)" }}>
                            {appUser.userId.email}
                          </td>
                          <td className="px-4 py-3">
                            <RoleBadge role={appUser.role} />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <ActionMenu
                              appUser={appUser}
                              onUpdateRole={(role) =>
                                handleUpdateRole(appUser.userId.id, role)
                              }
                              onRemove={() =>
                                handleRemoveUser(appUser.userId.id)
                              }
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div
                    className="px-4 py-3 flex items-center justify-between"
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      borderTop: "1px solid var(--border)",
                    }}>
                    <p
                      className="text-xs"
                      style={{ color: "var(--text-muted)" }}>
                      Page {pagination.page} of {pagination.totalPages}
                    </p>
                    <div className="flex gap-1">
                      <PageBtn
                        onClick={() =>
                          setPagination((p) => ({ ...p, page: p.page - 1 }))
                        }
                        disabled={pagination.page === 1}>
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </PageBtn>
                      {Array.from({ length: pagination.totalPages }, (_, i) => (
                        <PageBtn
                          key={i + 1}
                          onClick={() =>
                            setPagination((p) => ({ ...p, page: i + 1 }))
                          }
                          active={pagination.page === i + 1}>
                          {i + 1}
                        </PageBtn>
                      ))}
                      <PageBtn
                        onClick={() =>
                          setPagination((p) => ({ ...p, page: p.page + 1 }))
                        }
                        disabled={pagination.page === pagination.totalPages}>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </PageBtn>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Add user modal */}
      {showAddModal && selectedAppId && (
        <AddUserModal
          appId={selectedAppId}
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            setShowAddModal(false);
            setPagination((p) => ({ ...p, page: 1 }));
            // Refresh app users
            if (selectedAppId) {
              applicationMemberService
                .getAppUsers(selectedAppId, 1)
                .then((res) => {
                  const users = res?.data?.users || [];
                  const paginationData = res?.data?.pagination;
                  setAppUsers(users);
                  if (paginationData) {
                    setPagination((p) => ({
                      ...p,
                      total: paginationData.count || 0,
                      totalPages: paginationData.total || 0,
                    }));
                  }
                })
                .catch((err) => {
                  console.error("Error refreshing app users:", err);
                  toast.error("Failed to refresh user list");
                });
            }
          }}
        />
      )}
    </div>
  );
};

export default ApplicationUsers;
