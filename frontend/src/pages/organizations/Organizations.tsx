import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Users,
  Settings,
  Trash2,
  Crown,
  Shield,
  User,
  Key,
  Activity,
  X,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import { organizationService } from "../../api/organization.api";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  fetchOrganizations,
  setCurrentOrganization,
} from "../../store/organizationSlice";
import type { Organization } from "../../types/global.types";
import api from "../../app/apiClient";
import { Spinner, EmptyState, Alert } from "../../components/ui";

/* ── Plan badge colours ── */
const planStyle: Record<string, { bg: string; color: string; border: string }> =
  {
    free: {
      bg: "rgba(255,255,255,0.05)",
      color: "var(--text-secondary)",
      border: "var(--border)",
    },
    pro: {
      bg: "var(--accent-dim)",
      color: "var(--accent)",
      border: "rgba(99,102,241,0.25)",
    },
    enterprise: {
      bg: "var(--cyan-dim)",
      color: "var(--cyan)",
      border: "rgba(6,182,212,0.25)",
    },
  };

const RoleBadge = ({ role }: { role: string }) => {
  if (role === "owner")
    return (
      <div className="flex items-center gap-1.5">
        <Crown
          className="w-3.5 h-3.5"
          style={{ color: "var(--warning)" }}
        />
        <span
          className="text-xs font-medium"
          style={{ color: "var(--warning)" }}>
          Owner
        </span>
      </div>
    );
  if (role === "admin")
    return (
      <div className="flex items-center gap-1.5">
        <Shield
          className="w-3.5 h-3.5"
          style={{ color: "var(--accent)" }}
        />
        <span
          className="text-xs font-medium"
          style={{ color: "var(--accent)" }}>
          Admin
        </span>
      </div>
    );
  return (
    <div className="flex items-center gap-1.5">
      <User
        className="w-3.5 h-3.5"
        style={{ color: "var(--text-muted)" }}
      />
      <span
        className="text-xs font-medium"
        style={{ color: "var(--text-muted)" }}>
        Member
      </span>
    </div>
  );
};

/* ── Create Modal ── */
const CreateOrganizationModal = ({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({ name: "", slug: "" });

  const handleNameChange = (name: string) => {
    setFormData({
      name,
      slug: name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, ""),
    });
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setError("Organization name is required");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await organizationService.createOrganization({
        name: formData.name.trim(),
        slug: formData.slug.trim() || undefined,
      });
      toast.success("Organization created!");
      onCreated();
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message || "Failed to create organization");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2
            className="text-base font-semibold"
            style={{ color: "var(--text-primary)" }}>
            Create Organization
          </h2>
          <button
            onClick={onClose}
            className="btn btn-ghost p-1.5">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && <Alert variant="danger">{error}</Alert>}

        {/* Name */}
        <div>
          <label className="label-dark">Organization name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="input-dark"
            placeholder="Acme Corporation"
            autoFocus
          />
        </div>

        {/* Slug */}
        <div>
          <label className="label-dark">URL slug</label>
          <div className="flex items-center gap-2">
            <span
              className="text-xs whitespace-nowrap px-3 py-2 rounded-lg flex-shrink-0"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid var(--border)",
                color: "var(--text-muted)",
              }}>
              authflow.com/
            </span>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) =>
                setFormData({ ...formData, slug: e.target.value })
              }
              className="input-dark flex-1"
              placeholder="acme-corp"
            />
          </div>
          <p
            className="text-xs mt-1.5"
            style={{ color: "var(--text-muted)" }}>
            Lowercase letters, numbers and hyphens only. Auto-generated if
            empty.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            disabled={loading}
            className="btn btn-ghost flex-1">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="btn btn-primary flex-1">
            {loading ? (
              <>
                <Spinner size={14} /> Creating...
              </>
            ) : (
              "Create"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Main Page ── */
const Organizations = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { organizations, loading } = useAppSelector((s) => s.organizations);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchOrganizations());
  }, [dispatch]);

  const handleSwitchAndNavigate = async (org: Organization, path: string) => {
    try {
      const res = await api.post("/organizations/switch", {
        organizationId: org.id,
      });
      const { accessToken, refreshToken } = res.data.data;
      localStorage.setItem("accessToken", accessToken);
      if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("organizationId", org.id);
      dispatch(setCurrentOrganization(org));
      navigate(path);
    } catch {
      toast.error("Failed to switch organization");
    }
  };

  const handleDelete = async (org: Organization) => {
    if (!confirm(`Delete "${org.name}"? This cannot be undone.`)) return;
    setDeletingId(org.id);
    let fallbackOrg: Organization | null = null;
    let fallbackToken: string | null = null;

    try {
      const remaining = organizations.filter((o) => o.id !== org.id);
      fallbackOrg = remaining.length > 0 ? remaining[0] : null;

      if (fallbackOrg) {
        const fallbackRes = await api.post("/organizations/switch", {
          organizationId: fallbackOrg.id,
        });
        fallbackToken = fallbackRes.data.data.accessToken;
      }

      const deleteRes = await api.post("/organizations/switch", {
        organizationId: org.id,
      });
      if (!deleteRes.data?.data?.accessToken)
        throw new Error("Failed to get delete token");
      localStorage.setItem("accessToken", deleteRes.data.data.accessToken);
      localStorage.setItem("organizationId", org.id);
      await new Promise((r) => setTimeout(r, 100));

      await organizationService.deleteOrganization();

      if (fallbackOrg && fallbackToken) {
        localStorage.setItem("accessToken", fallbackToken);
        localStorage.setItem("organizationId", fallbackOrg.id);
        dispatch(setCurrentOrganization(fallbackOrg));
      } else {
        localStorage.removeItem("organizationId");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
      }

      await new Promise((r) => setTimeout(r, 100));
      toast.success(`"${org.name}" deleted`);
      await dispatch(fetchOrganizations()).unwrap();
    } catch (e) {
      const err = e as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      toast.error(
        err.response?.data?.message || "Failed to delete organization",
      );
      try {
        if (fallbackOrg && fallbackToken) {
          localStorage.setItem("accessToken", fallbackToken);
          localStorage.setItem("organizationId", fallbackOrg.id);
          dispatch(setCurrentOrganization(fallbackOrg));
          await dispatch(fetchOrganizations()).unwrap();
        } else {
          localStorage.removeItem("organizationId");
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
        }
      } catch {
        /* recovery failed silently */
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      {/* Page header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="page-title">Organizations</h1>
          <p className="page-subtitle">Manage your organizations and teams</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary gap-2">
          <Plus className="w-4 h-4" /> Create Organization
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center min-h-64">
          <Spinner size={28} />
        </div>
      )}

      {/* Empty state */}
      {!loading && organizations.length === 0 && (
        <div
          className="rounded-2xl py-20"
          style={{
            background: "var(--bg-elevated)",
            border: "1px dashed var(--border)",
          }}>
          <EmptyState
            icon={Building2}
            title="No organizations yet"
            description="Create your first organization to start managing teams and access"
            action={
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn btn-primary gap-2">
                <Plus className="w-4 h-4" /> Create Organization
              </button>
            }
          />
        </div>
      )}

      {/* Organization grid */}
      {!loading && organizations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {organizations.map((org, i) => {
            const plan = planStyle[org.plan] ?? planStyle.free;
            return (
              <div
                key={org.id}
                className="glass-hover p-5 animate-slide-up"
                style={{ animationDelay: `${i * 50}ms` }}>
                {/* Org header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-base flex-shrink-0"
                      style={{
                        background: "linear-gradient(135deg, #6366f1, #818cf8)",
                        boxShadow: "0 0 16px rgba(99,102,241,0.25)",
                      }}>
                      {org.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3
                        className="text-sm font-semibold truncate"
                        style={{ color: "var(--text-primary)" }}>
                        {org.name}
                      </h3>
                      <p
                        className="text-xs font-mono"
                        style={{ color: "var(--text-muted)" }}>
                        /{org.slug}
                      </p>
                    </div>
                  </div>
                  <span
                    className="badge capitalize flex-shrink-0"
                    style={{
                      background: plan.bg,
                      color: plan.color,
                      border: `1px solid ${plan.border}`,
                    }}>
                    {org.plan}
                  </span>
                </div>

                {/* Meta row */}
                <div
                  className="flex items-center justify-between py-3 mb-4"
                  style={{
                    borderTop: "1px solid var(--border)",
                    borderBottom: "1px solid var(--border)",
                  }}>
                  <div
                    className="flex items-center gap-1.5 text-xs"
                    style={{ color: "var(--text-muted)" }}>
                    <Users className="w-3.5 h-3.5" />
                    {org.memberCount} member{org.memberCount !== 1 ? "s" : ""}
                  </div>
                  <RoleBadge role={org.role} />
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      handleSwitchAndNavigate(org, "/organization/members")
                    }
                    className="btn btn-ghost flex-1 gap-1.5 text-xs">
                    <Users className="w-3.5 h-3.5" /> Members
                  </button>

                  {(org.role === "owner" || org.role === "admin") && (
                    <button
                      onClick={() => handleSwitchAndNavigate(org, "/settings")}
                      className="btn btn-ghost flex-1 gap-1.5 text-xs">
                      <Settings className="w-3.5 h-3.5" /> Settings
                    </button>
                  )}

                  {org.role === "owner" && (
                    <button
                      onClick={() => handleDelete(org)}
                      disabled={deletingId === org.id}
                      className="btn btn-danger p-2">
                      {deletingId === org.id ? (
                        <Spinner size={14} />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Plan limits info */}
      {!loading && organizations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            {
              icon: Users,
              label: "Free Plan",
              value: "Up to 5 members",
              color: "var(--text-muted)",
              dim: "rgba(255,255,255,0.04)",
            },
            {
              icon: Key,
              label: "Free Plan",
              value: "Up to 2 API keys",
              color: "var(--accent)",
              dim: "var(--accent-dim)",
            },
            {
              icon: Activity,
              label: "Free Plan",
              value: "10,000 API calls / mo",
              color: "var(--cyan)",
              dim: "var(--cyan-dim)",
            },
          ].map(({ icon: Icon, label, value, color, dim }) => (
            <div
              key={value}
              className="flex items-center gap-3 p-4 rounded-xl"
              style={{ background: dim, border: "1px solid var(--border)" }}>
              <Icon
                className="w-4 h-4 flex-shrink-0"
                style={{ color }}
              />
              <div>
                <p
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color }}>
                  {label}
                </p>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: "var(--text-secondary)" }}>
                  {value}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreateModal && (
        <CreateOrganizationModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            dispatch(fetchOrganizations());
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
};

export default Organizations;
