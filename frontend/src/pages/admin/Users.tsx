import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  UserX,
  UserCheck,
  Shield,
  Mail,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Users,
  X,
  ChevronDown,
} from "lucide-react";
import { adminService } from "../../api/admin.api";
import type { User } from "../../types/global.types";
import { Spinner, EmptyState } from "../../components/ui";

/* ─── Role badge ─── */
const RoleBadge = ({ role }: { role: string }) => {
  const map: Record<string, string> = {
    owner: "badge-warning",
    admin: "badge-accent",
    member: "badge-muted",
    user: "badge-muted",
  };
  return (
    <span className={`badge ${map[role] ?? "badge-muted"} capitalize`}>
      {role}
    </span>
  );
};

/* ─── User avatar ─── */
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

/* ─── Custom dropdown ─── */
interface DropOpt {
  value: string;
  label: string;
}

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
  placeholder = "All",
}: {
  value: string;
  onChange: (v: string) => void;
  options: DropOpt[];
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
          <DropItem
            label={placeholder}
            active={value === ""}
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
          />
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

/* ─── Pagination button ─── */
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
      boxShadow: active ? "0 0 12px var(--accent-glow)" : "none",
      opacity: disabled ? 0.35 : 1,
      cursor: disabled ? "not-allowed" : "pointer",
    }}>
    {children}
  </button>
);

/* ─── Edit User Modal ─── */
const EditUserModal = ({
  user,
  onClose,
  onUpdate,
}: {
  user: User;
  onClose: () => void;
  onUpdate: () => void;
}) => {
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState(user.role);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || name.trim().length < 2) {
      toast.error("Name must be at least 2 characters");
      return;
    }
    setLoading(true);
    try {
      await adminService.updateUser(user.id, {
        name: name.trim(),
        role: role as never,
      });
      toast.success("User updated");
      onUpdate();
    } catch {
      toast.error("Failed to update user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && !loading && onClose()}>
      <div className="modal-box p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2
            className="text-base font-semibold"
            style={{ color: "var(--text-primary)" }}>
            Edit User
          </h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="btn btn-ghost p-1.5">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User info */}
        <div
          className="flex items-center gap-3 p-3 rounded-xl"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid var(--border)",
          }}>
          <UserAvatar
            user={user}
            size={40}
          />
          <div>
            <p
              className="text-sm font-semibold"
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

        {/* Name */}
        <div>
          <label className="label-dark">Full name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-dark"
            placeholder="Full name"
          />
        </div>

        {/* Role */}
        <div>
          <label className="label-dark">Role</label>
          <DarkDropdown
            value={role}
            onChange={(v) => setRole(v as User["role"])}
            options={[
              { value: "member", label: "Member" },
              { value: "admin", label: "Admin" },
              { value: "owner", label: "Owner" },
            ]}
            placeholder="Select role"
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button
            className="btn btn-ghost flex-1"
            onClick={onClose}
            disabled={loading}>
            Cancel
          </button>
          <button
            className="btn btn-primary flex-1 gap-2"
            onClick={handleSubmit}
            disabled={loading}>
            {loading ? (
              <>
                <Spinner size={14} /> Updating...
              </>
            ) : (
              "Save changes"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Action menu ─── */
const ActionMenu = ({
  user,
  onEdit,
  onSuspend,
  onActivate,
  onDelete,
}: {
  user: User;
  onEdit: () => void;
  onSuspend: () => void;
  onActivate: () => void;
  onDelete: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const suspended =
    (user as { isSuspended?: boolean; isActive?: boolean }).isSuspended ===
      true ||
    (user as { isSuspended?: boolean; isActive?: boolean }).isActive === false;

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    if (open) document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, [open]);

  const item = (
    label: string,
    icon: React.ElementType,
    onClick: () => void,
    color?: string,
  ) => {
    const Icon = icon;
    return (
      <button
        onClick={() => {
          onClick();
          setOpen(false);
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors text-left"
        style={{ color: color ?? "var(--text-secondary)" }}
        onMouseOver={(e) =>
          ((e.currentTarget as HTMLElement).style.background = color
            ? `${color}18`
            : "rgba(255,255,255,0.04)")
        }
        onMouseOut={(e) =>
          ((e.currentTarget as HTMLElement).style.background = "transparent")
        }>
        <Icon className="w-3.5 h-3.5" /> {label}
      </button>
    );
  };

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
          className="absolute right-0 mt-1 w-44 rounded-xl overflow-hidden animate-slide-up z-20"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            boxShadow: "0 16px 40px rgba(0,0,0,0.6)",
          }}>
          <div className="p-1">
            {item("Edit user", Edit, onEdit)}
            {user.role !== "owner" && (
              <>
                <div
                  style={{
                    borderTop: "1px solid var(--border)",
                    margin: "3px 0",
                  }}
                />
                {suspended
                  ? item("Activate", UserCheck, onActivate, "var(--success)")
                  : item("Suspend", UserX, onSuspend, "var(--warning)")}
                {item("Delete user", Trash2, onDelete, "var(--danger)")}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════
   MAIN
═══════════════════════════════════════════ */
const AdminUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [mfaFilter, setMfaFilter] = useState("");
  const [verifiedFilter, setVerifiedFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminService.getUsers({
        search: searchQuery || undefined,
        role: roleFilter || undefined,
        mfaEnabled: mfaFilter ? mfaFilter === "true" : undefined,
        isEmailVerified: verifiedFilter ? verifiedFilter === "true" : undefined,
        page: pagination.page,
        limit: pagination.limit,
      });
      setUsers(res.data.items);
      setPagination((p) => ({
        ...p,
        total: res.data.pagination.total,
        totalPages: res.data.pagination.totalPages,
      }));
    } catch {
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }, [
    searchQuery,
    roleFilter,
    mfaFilter,
    verifiedFilter,
    pagination.page,
    pagination.limit,
  ]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSuspend = async (id: string) => {
    if (!confirm("Suspend this user?")) return;
    try {
      await adminService.suspendUser(id);
      toast.success("User suspended");
      fetchUsers();
    } catch {
      toast.error("Failed to suspend user");
    }
  };

  const handleActivate = async (id: string) => {
    if (!confirm("Activate this user?")) return;
    try {
      await adminService.activateUser(id);
      toast.success("User activated");
      fetchUsers();
    } catch {
      toast.error("Failed to activate user");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this user permanently? This cannot be undone."))
      return;
    try {
      await adminService.deleteUser(id);
      toast.success("User deleted");
      fetchUsers();
    } catch {
      toast.error("Failed to delete user");
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setRoleFilter("");
    setMfaFilter("");
    setVerifiedFilter("");
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const activeFilters = [roleFilter, mfaFilter, verifiedFilter].filter(
    Boolean,
  ).length;

  /* Page numbers */
  const pageNums = (() => {
    const count = Math.min(pagination.totalPages, 5);
    const start =
      pagination.totalPages <= 5
        ? 1
        : pagination.page <= 3
          ? 1
          : pagination.page >= pagination.totalPages - 2
            ? pagination.totalPages - 4
            : pagination.page - 2;
    return Array.from({ length: count }, (_, i) => start + i);
  })();

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">
            Manage platform users, roles and access
            {pagination.total > 0 && (
              <span
                className="ml-2 font-semibold"
                style={{ color: "var(--accent)" }}>
                · {pagination.total.toLocaleString()} users
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`btn gap-2 ${showFilters || activeFilters > 0 ? "btn-primary" : "btn-ghost"}`}>
          <Filter className="w-4 h-4" />
          Filters
          {activeFilters > 0 && (
            <span
              className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold"
              style={{ background: "white", color: "var(--accent)" }}>
              {activeFilters}
            </span>
          )}
        </button>
      </div>

      {/* Search + filter panel */}
      <div
        className="rounded-2xl p-4 mb-5 space-y-4"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
        }}>
        {/* Search */}
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: "var(--text-muted)" }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or email…"
            className="input-dark pl-9"
          />
        </div>

        {/* Expandable filters */}
        {showFilters && (
          <>
            <div
              className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4"
              style={{ borderTop: "1px solid var(--border)" }}>
              <div>
                <label className="label-dark">Role</label>
                <DarkDropdown
                  value={roleFilter}
                  onChange={setRoleFilter}
                  placeholder="All roles"
                  options={[
                    { value: "member", label: "Member" },
                    { value: "admin", label: "Admin" },
                    { value: "owner", label: "Owner" },
                  ]}
                />
              </div>
              <div>
                <label className="label-dark">MFA Status</label>
                <DarkDropdown
                  value={mfaFilter}
                  onChange={setMfaFilter}
                  placeholder="All"
                  options={[
                    { value: "true", label: "Enabled" },
                    { value: "false", label: "Disabled" },
                  ]}
                />
              </div>
              <div>
                <label className="label-dark">Email Status</label>
                <DarkDropdown
                  value={verifiedFilter}
                  onChange={setVerifiedFilter}
                  placeholder="All"
                  options={[
                    { value: "true", label: "Verified" },
                    { value: "false", label: "Not verified" },
                  ]}
                />
              </div>
            </div>
            {activeFilters > 0 && (
              <div className="flex justify-end">
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1.5 text-xs transition-colors"
                  style={{ color: "var(--text-muted)" }}
                  onMouseOver={(e) =>
                    ((e.currentTarget as HTMLElement).style.color =
                      "var(--text-secondary)")
                  }
                  onMouseOut={(e) =>
                    ((e.currentTarget as HTMLElement).style.color =
                      "var(--text-muted)")
                  }>
                  <X className="w-3.5 h-3.5" /> Clear all filters
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
        }}>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Spinner size={28} />
            <p
              className="text-sm"
              style={{ color: "var(--text-muted)" }}>
              Loading users…
            </p>
          </div>
        ) : users.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No users found"
            description={
              activeFilters > 0
                ? "Try adjusting your filters"
                : "No users have been created yet"
            }
            action={
              activeFilters > 0 ? (
                <button
                  onClick={clearFilters}
                  className="btn btn-ghost text-sm">
                  Clear filters
                </button>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table-dark">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Verification</th>
                    <th>Joined</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, i) => {
                    const suspended =
                      (user as { isSuspended?: boolean; isActive?: boolean })
                        .isSuspended === true ||
                      (user as { isSuspended?: boolean; isActive?: boolean })
                        .isActive === false;
                    return (
                      <tr
                        key={user.id}
                        className="animate-slide-up"
                        style={{ animationDelay: `${i * 25}ms` }}>
                        {/* User */}
                        <td>
                          <div className="flex items-center gap-3">
                            <UserAvatar
                              user={user}
                              size={36}
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p
                                  className="text-sm font-semibold truncate"
                                  style={{ color: "var(--text-primary)" }}>
                                  {user.name}
                                </p>
                                {suspended && (
                                  <span className="badge badge-warning text-[10px]">
                                    Suspended
                                  </span>
                                )}
                              </div>
                              <p
                                className="text-xs truncate max-w-[200px]"
                                style={{ color: "var(--text-muted)" }}>
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td>
                          <RoleBadge role={user.role} />
                        </td>

                        {/* Verification */}
                        <td>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5">
                              <Mail
                                className="w-3 h-3 flex-shrink-0"
                                style={{
                                  color: user.isEmailVerified
                                    ? "var(--success)"
                                    : "var(--text-muted)",
                                }}
                              />
                              <span
                                className="text-xs"
                                style={{
                                  color: user.isEmailVerified
                                    ? "var(--success)"
                                    : "var(--text-muted)",
                                }}>
                                {user.isEmailVerified
                                  ? "Verified"
                                  : "Unverified"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Shield
                                className="w-3 h-3 flex-shrink-0"
                                style={{
                                  color: user.mfaEnabled
                                    ? "var(--success)"
                                    : "var(--text-muted)",
                                }}
                              />
                              <span
                                className="text-xs"
                                style={{
                                  color: user.mfaEnabled
                                    ? "var(--success)"
                                    : "var(--text-muted)",
                                }}>
                                {user.mfaEnabled ? "2FA on" : "No 2FA"}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Joined */}
                        <td>
                          <div
                            className="flex items-center gap-1.5 text-xs"
                            style={{ color: "var(--text-muted)" }}>
                            <Calendar className="w-3 h-3" />
                            {new Date(user.createdAt).toLocaleDateString(
                              undefined,
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              },
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td style={{ textAlign: "right" }}>
                          <ActionMenu
                            user={user}
                            onEdit={() => {
                              setSelectedUser(user);
                              setShowEditModal(true);
                            }}
                            onSuspend={() => handleSuspend(user.id)}
                            onActivate={() => handleActivate(user.id)}
                            onDelete={() => handleDelete(user.id)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderTop: "1px solid var(--border)" }}>
              <p
                className="text-xs"
                style={{ color: "var(--text-muted)" }}>
                {(pagination.page - 1) * pagination.limit + 1}–
                {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
                of {pagination.total.toLocaleString()} users
              </p>
              <div className="flex items-center gap-1.5">
                <PageBtn
                  onClick={() =>
                    setPagination((p) => ({ ...p, page: p.page - 1 }))
                  }
                  disabled={pagination.page <= 1 || loading}>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </PageBtn>
                {pageNums.map((n) => (
                  <PageBtn
                    key={n}
                    onClick={() => setPagination((p) => ({ ...p, page: n }))}
                    active={n === pagination.page}
                    disabled={loading}>
                    {n}
                  </PageBtn>
                ))}
                <PageBtn
                  onClick={() =>
                    setPagination((p) => ({ ...p, page: p.page + 1 }))
                  }
                  disabled={
                    pagination.page >= pagination.totalPages || loading
                  }>
                  <ChevronRight className="w-3.5 h-3.5" />
                </PageBtn>
              </div>
            </div>
          </>
        )}
      </div>

      {showEditModal && selectedUser && (
        <EditUserModal
          user={selectedUser}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUser(null);
          }}
          onUpdate={() => {
            fetchUsers();
            setShowEditModal(false);
            setSelectedUser(null);
          }}
        />
      )}
    </div>
  );
};

export default AdminUsers;
