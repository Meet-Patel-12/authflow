import { useEffect, useRef, useState } from "react";
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
  Activity,
  ChevronDown,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { fetchAuditLogs } from "../../store/auditLogsSlice";
import type { AuditLogFilters } from "../../api/auditLogs.api";
import { Spinner, EmptyState } from "../../components/ui";

/* ─── Types ─── */
interface AuditLog {
  id: string;
  action: string;
  userId: unknown;
  path?: string;
  resource?: string;
  method: string;
  statusCode?: number;
  ipAddress?: string;
  createdAt: string;
}

/* ─── Method badge styles ─── */
const METHOD_STYLE: Record<
  string,
  { bg: string; color: string; border: string }
> = {
  GET: {
    bg: "var(--accent-dim)",
    color: "var(--accent)",
    border: "rgba(99,102,241,0.25)",
  },
  POST: {
    bg: "var(--success-dim)",
    color: "var(--success)",
    border: "rgba(16,185,129,0.25)",
  },
  PUT: {
    bg: "var(--warning-dim)",
    color: "var(--warning)",
    border: "rgba(245,158,11,0.25)",
  },
  PATCH: {
    bg: "var(--cyan-dim)",
    color: "var(--cyan)",
    border: "rgba(6,182,212,0.25)",
  },
  DELETE: {
    bg: "var(--danger-dim)",
    color: "var(--danger)",
    border: "rgba(244,63,94,0.25)",
  },
};

const statusColor = (code: number): string => {
  if (code >= 500) return "var(--danger)";
  if (code >= 400) return "var(--warning)";
  if (code >= 300) return "var(--cyan)";
  return "var(--success)";
};

const ACTION_OPTIONS = [
  "user.login",
  "user.logout",
  "user.register",
  "user.password_reset",
  "user.email_verified",
  "mfa.enabled",
  "mfa.disabled",
  "org.created",
  "org.updated",
  "org.deleted",
  "member.invited",
  "member.removed",
  "apikey.created",
  "apikey.deleted",
];

const STATUS_OPTIONS = [
  { value: "200", label: "200 — OK" },
  { value: "201", label: "201 — Created" },
  { value: "400", label: "400 — Bad Request" },
  { value: "401", label: "401 — Unauthorized" },
  { value: "403", label: "403 — Forbidden" },
  { value: "404", label: "404 — Not Found" },
  { value: "500", label: "500 — Server Error" },
];

/* ─── Filter chip ─── */
const Chip = ({ label, onRemove }: { label: string; onRemove: () => void }) => (
  <span
    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
    style={{
      background: "var(--accent-dim)",
      color: "var(--accent)",
      border: "1px solid rgba(99,102,241,0.2)",
    }}>
    {label}
    <button
      onClick={onRemove}
      style={{ color: "var(--accent)", opacity: 0.7 }}
      onMouseOver={(e) =>
        ((e.currentTarget as HTMLElement).style.opacity = "1")
      }
      onMouseOut={(e) =>
        ((e.currentTarget as HTMLElement).style.opacity = "0.7")
      }>
      <X className="w-3 h-3" />
    </button>
  </span>
);

/* ─── Custom dropdown — native <select> options always render with OS white bg ─── */
interface SelectOption {
  value: string;
  label: string;
}

const DarkDropdown = ({
  value,
  onChange,
  options,
  placeholder = "All",
}: {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
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
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input-dark w-full flex items-center justify-between gap-2 cursor-pointer text-sm text-left"
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

      {/* Options panel */}
      {open && (
        <div
          className="absolute z-50 left-0 right-0 mt-1 rounded-xl overflow-hidden animate-slide-up"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            boxShadow: "0 16px 40px rgba(0,0,0,0.6)",
            maxHeight: 224,
            overflowY: "auto",
          }}>
          {/* Placeholder / "All" option */}
          <DropItem
            label={placeholder}
            active={value === ""}
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            muted
          />
          {options.map((opt) => (
            <DropItem
              key={opt.value}
              label={opt.label}
              active={opt.value === value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/* DropItem declared at module level — never inside render */
const DropItem = ({
  label,
  active,
  onClick,
  muted = false,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  muted?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full text-left px-3 py-2 text-xs transition-colors font-mono"
    style={{
      background: active ? "var(--accent-dim)" : "transparent",
      color: active
        ? "var(--accent)"
        : muted
          ? "var(--text-muted)"
          : "var(--text-secondary)",
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
    className="w-8 h-8 rounded-lg text-xs font-medium transition-all flex items-center justify-center"
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

/* ═══════════════════════════════════════════
   MAIN
═══════════════════════════════════════════ */
const AuditLogs = () => {
  const dispatch = useAppDispatch();
  const { logs, loading, page, totalPages, total } = useAppSelector(
    (s) => s.auditLogs,
  ) as {
    logs: AuditLog[];
    loading: boolean;
    page: number;
    totalPages: number;
    total: number;
  };

  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [pendingFilters, setPendingFilters] = useState<AuditLogFilters>({});

  useEffect(() => {
    dispatch(fetchAuditLogs({ page: 1 }));
  }, [dispatch]);

  const applyFilters = () => {
    const merged = { ...pendingFilters, page: 1 };
    setFilters(merged);
    dispatch(fetchAuditLogs(merged));
    setShowFilters(false);
  };

  const clearFilters = () => {
    setPendingFilters({});
    setFilters({});
    dispatch(fetchAuditLogs({ page: 1 }));
    setShowFilters(false);
  };

  const removeFilter = (key: keyof AuditLogFilters) => {
    const f = { ...filters, [key]: undefined, page: 1 };
    setFilters(f);
    setPendingFilters((p) => ({ ...p, [key]: undefined }));
    dispatch(fetchAuditLogs(f));
  };

  const goToPage = (p: number) => {
    const merged = { ...filters, page: p };
    setFilters(merged);
    dispatch(fetchAuditLogs(merged));
  };

  const activeCount = Object.entries(filters).filter(
    ([k, v]) => k !== "page" && v !== undefined && v !== "",
  ).length;

  const getUserLabel = (userId: unknown): string => {
    if (!userId) return "—";
    if (typeof userId === "object" && userId !== null) {
      const u = userId as { email?: string; name?: string };
      return u.email || u.name || "—";
    }
    return String(userId).slice(0, 16) + "…";
  };

  const pageNums = (() => {
    const count = Math.min(totalPages, 5);
    const start =
      totalPages <= 5
        ? 1
        : page <= 3
          ? 1
          : page >= totalPages - 2
            ? totalPages - 4
            : page - 2;
    return Array.from({ length: count }, (_, i) => start + i);
  })();

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="page-title">Audit Logs</h1>
          <p className="page-subtitle">
            Full activity trail across your platform
            {total > 0 && (
              <span
                className="ml-2 font-semibold"
                style={{ color: "var(--accent)" }}>
                · {total.toLocaleString()} events
              </span>
            )}
          </p>
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`btn gap-2 ${showFilters || activeCount > 0 ? "btn-primary" : "btn-ghost"}`}>
          <Filter className="w-4 h-4" />
          Filters
          {activeCount > 0 && (
            <span
              className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold"
              style={{ background: "white", color: "var(--accent)" }}>
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div
          className="rounded-2xl p-5 mb-5 animate-slide-up"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
          }}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
            {/* Action */}
            <div>
              <label className="label-dark">Action</label>
              <DarkDropdown
                value={pendingFilters.action || ""}
                onChange={(v) =>
                  setPendingFilters((p) => ({ ...p, action: v || undefined }))
                }
                options={ACTION_OPTIONS.map((a) => ({ value: a, label: a }))}
                placeholder="All actions"
              />
            </div>

            {/* Resource */}
            <div>
              <label className="label-dark">Resource / Path</label>
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: "var(--text-muted)" }}
                />
                <input
                  type="text"
                  value={pendingFilters.resource || ""}
                  onChange={(e) =>
                    setPendingFilters((p) => ({
                      ...p,
                      resource: e.target.value || undefined,
                    }))
                  }
                  placeholder="/api/auth/login"
                  className="input-dark pl-9"
                />
              </div>
            </div>

            {/* Status code */}
            <div>
              <label className="label-dark">Status Code</label>
              <DarkDropdown
                value={pendingFilters.statusCode || ""}
                onChange={(v) =>
                  setPendingFilters((p) => ({
                    ...p,
                    statusCode: v || undefined,
                  }))
                }
                options={STATUS_OPTIONS}
                placeholder="All statuses"
              />
            </div>

            {/* From date */}
            <div>
              <label className="label-dark">From date</label>
              <input
                type="date"
                value={pendingFilters.startDate || ""}
                onChange={(e) =>
                  setPendingFilters((p) => ({
                    ...p,
                    startDate: e.target.value || undefined,
                  }))
                }
                className="input-dark"
                style={{ colorScheme: "dark" }}
              />
            </div>

            {/* To date */}
            <div>
              <label className="label-dark">To date</label>
              <input
                type="date"
                value={pendingFilters.endDate || ""}
                onChange={(e) =>
                  setPendingFilters((p) => ({
                    ...p,
                    endDate: e.target.value || undefined,
                  }))
                }
                className="input-dark"
                style={{ colorScheme: "dark" }}
              />
            </div>
          </div>

          <div
            className="flex items-center justify-between pt-4"
            style={{ borderTop: "1px solid var(--border)" }}>
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
              <X className="w-3.5 h-3.5" /> Clear all
            </button>
            <button
              onClick={applyFilters}
              className="btn btn-primary text-sm">
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Active chips */}
      {activeCount > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {filters.action && (
            <Chip
              label={`Action: ${filters.action}`}
              onRemove={() => removeFilter("action")}
            />
          )}
          {filters.resource && (
            <Chip
              label={`Path: ${filters.resource}`}
              onRemove={() => removeFilter("resource")}
            />
          )}
          {filters.statusCode && (
            <Chip
              label={`Status: ${filters.statusCode}`}
              onRemove={() => removeFilter("statusCode")}
            />
          )}
          {filters.startDate && (
            <Chip
              label={`From: ${filters.startDate}`}
              onRemove={() => removeFilter("startDate")}
            />
          )}
          {filters.endDate && (
            <Chip
              label={`To: ${filters.endDate}`}
              onRemove={() => removeFilter("endDate")}
            />
          )}
        </div>
      )}

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
              Loading logs...
            </p>
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No audit logs found"
            description={
              activeCount > 0
                ? "Try adjusting your filters"
                : "Activity will appear here once events occur"
            }
            action={
              activeCount > 0 ? (
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
                    <th>Action</th>
                    <th>User</th>
                    <th>Path</th>
                    <th>Method</th>
                    <th>Status</th>
                    <th>IP</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log: AuditLog, i: number) => {
                    const ms = METHOD_STYLE[log.method] ?? {
                      bg: "rgba(255,255,255,0.05)",
                      color: "var(--text-muted)",
                      border: "var(--border)",
                    };
                    return (
                      <tr
                        key={log.id}
                        className="animate-slide-up"
                        style={{ animationDelay: `${i * 25}ms` }}>
                        <td>
                          <span
                            className="text-xs font-mono font-medium"
                            style={{ color: "var(--text-primary)" }}>
                            {log.action}
                          </span>
                        </td>
                        <td>
                          <span
                            className="text-xs truncate block max-w-[140px]"
                            style={{ color: "var(--text-secondary)" }}>
                            {getUserLabel(log.userId)}
                          </span>
                        </td>
                        <td>
                          <code
                            className="text-xs font-mono truncate block max-w-[180px]"
                            style={{ color: "var(--text-muted)" }}>
                            {log.path || log.resource || "—"}
                          </code>
                        </td>
                        <td>
                          {log.method && (
                            <span
                              className="badge text-[10px] font-bold"
                              style={{
                                background: ms.bg,
                                color: ms.color,
                                border: `1px solid ${ms.border}`,
                              }}>
                              {log.method}
                            </span>
                          )}
                        </td>
                        <td>
                          {log.statusCode ? (
                            <span
                              className="text-xs font-mono font-semibold"
                              style={{ color: statusColor(log.statusCode) }}>
                              {log.statusCode}
                            </span>
                          ) : (
                            <span style={{ color: "var(--text-muted)" }}>
                              —
                            </span>
                          )}
                        </td>
                        <td>
                          <code
                            className="text-xs font-mono"
                            style={{ color: "var(--text-muted)" }}>
                            {log.ipAddress || "—"}
                          </code>
                        </td>
                        <td>
                          <span
                            className="text-xs whitespace-nowrap"
                            style={{ color: "var(--text-muted)" }}>
                            {new Date(log.createdAt).toLocaleString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
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
                Page {page} of {totalPages}
                {total > 0 && (
                  <span className="ml-1.5">
                    · {total.toLocaleString()} total
                  </span>
                )}
              </p>
              <div className="flex items-center gap-1.5">
                <PageBtn
                  onClick={() => goToPage(page - 1)}
                  disabled={page <= 1 || loading}>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </PageBtn>
                {pageNums.map((n) => (
                  <PageBtn
                    key={n}
                    onClick={() => goToPage(n)}
                    active={n === page}
                    disabled={loading}>
                    {n}
                  </PageBtn>
                ))}
                <PageBtn
                  onClick={() => goToPage(page + 1)}
                  disabled={page >= totalPages || loading}>
                  <ChevronRight className="w-3.5 h-3.5" />
                </PageBtn>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
