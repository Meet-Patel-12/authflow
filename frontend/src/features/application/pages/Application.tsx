import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Plus,
  Globe,
  Smartphone,
  Server,
  Monitor,
  Trash2,
  Settings,
  AlertTriangle,
  Check,
  X,
  AppWindow,
} from "lucide-react";
import {
  applicationService,
  type CreateApplicationData,
} from "../api/application.api";
import type {
  Application,
  ApplicationType,
} from "../../../shared/types/global.types";
import { EmptyState, Spinner, CopyButton, Alert } from "../../../components/ui";

const TYPE_META: Record<
  ApplicationType,
  {
    label: string;
    desc: string;
    icon: React.ElementType;
    color: string;
    glow: string;
  }
> = {
  spa: {
    label: "Single Page App",
    desc: "React, Vue, Angular",
    icon: Globe,
    color: "var(--accent-dim)",
    glow: "rgba(99,102,241,0.3)",
  },
  regular_web: {
    label: "Regular Web App",
    desc: "Next.js, Express, Laravel",
    icon: Monitor,
    color: "var(--success-dim)",
    glow: "rgba(16,185,129,0.3)",
  },
  native: {
    label: "Native App",
    desc: "React Native, Flutter",
    icon: Smartphone,
    color: "var(--cyan-dim)",
    glow: "rgba(6,182,212,0.3)",
  },
  machine_to_machine: {
    label: "Machine to Machine",
    desc: "APIs, cron jobs, backends",
    icon: Server,
    color: "var(--warning-dim)",
    glow: "rgba(245,158,11,0.3)",
  },
};

/* ─── Create Modal ─── */
const CreateModal = ({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (app: Application, secret: string) => void;
}) => {
  const [name, setName] = useState("");
  const [type, setType] = useState<ApplicationType>("spa");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Application name is required");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data: CreateApplicationData = {
        name: name.trim(),
        type,
        description: description.trim() || undefined,
      };
      const res = await applicationService.createApplication(data);
      const app = res.data!.application;
      onCreated(app as Application, app.clientSecret!);
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      const msg = err.response?.data?.message || "Failed to create application";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="modal-box"
        style={{ maxWidth: 540 }}>
        <div
          className="flex items-center justify-between p-5"
          style={{ borderBottom: "1px solid var(--border)" }}>
          <div>
            <h2
              className="text-base font-semibold"
              style={{ color: "var(--text-primary)" }}>
              Create Application
            </h2>
            <p
              className="text-xs mt-0.5"
              style={{ color: "var(--text-muted)" }}>
              Choose the type that matches your integration
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseOver={(e) =>
              (e.currentTarget.style.background = "rgba(255,255,255,0.05)")
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.background = "transparent")
            }>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {error && <Alert variant="danger">{error}</Alert>}

          <div>
            <label className="label-dark">Application name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Production App"
              className="input-dark"
            />
          </div>

          <div>
            <label className="label-dark">Type</label>
            <div className="grid grid-cols-1 gap-2">
              {(
                Object.entries(TYPE_META) as [
                  ApplicationType,
                  (typeof TYPE_META)[ApplicationType],
                ][]
              ).map(([val, meta]) => {
                const Icon = meta.icon;
                const sel = type === val;
                return (
                  <button
                    key={val}
                    onClick={() => setType(val)}
                    className="flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                    style={{
                      background: sel ? meta.color : "rgba(255,255,255,0.02)",
                      border: `1px solid ${sel ? meta.glow : "var(--border)"}`,
                      boxShadow: sel ? `0 0 16px ${meta.glow}` : "none",
                    }}>
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: meta.color }}>
                      <Icon
                        className="w-4 h-4"
                        style={{ color: "white", opacity: 0.9 }}
                      />
                    </div>
                    <div className="flex-1">
                      <p
                        className="text-sm font-medium"
                        style={{ color: "var(--text-primary)" }}>
                        {meta.label}
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: "var(--text-muted)" }}>
                        {meta.desc}
                      </p>
                    </div>
                    {sel && (
                      <Check
                        className="w-4 h-4 flex-shrink-0"
                        style={{ color: "var(--accent)" }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="label-dark">
              Description{" "}
              <span
                style={{
                  color: "var(--text-muted)",
                  textTransform: "none",
                  fontSize: "0.75rem",
                }}>
                (optional)
              </span>
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description"
              maxLength={140}
              className="input-dark"
            />
          </div>
        </div>

        <div
          className="flex justify-end gap-3 p-5"
          style={{ borderTop: "1px solid var(--border)" }}>
          <button
            className="btn btn-ghost"
            onClick={onClose}
            disabled={loading}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleCreate}
            disabled={loading}>
            {loading ? (
              <>
                <Spinner size={14} /> Creating...
              </>
            ) : (
              "Create Application"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Secret Reveal Modal ─── */
const SecretModal = ({
  clientId,
  clientSecret,
  onClose,
}: {
  clientId: string;
  clientSecret: string;
  onClose: () => void;
}) => {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div className="modal-backdrop">
      <div
        className="modal-box"
        style={{ maxWidth: 520 }}>
        <div
          className="p-5 rounded-t-xl"
          style={{
            background: "rgba(245,158,11,0.08)",
            borderBottom: "1px solid rgba(245,158,11,0.2)",
          }}>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: "var(--warning-dim)" }}>
              <AlertTriangle
                className="w-4 h-4"
                style={{ color: "var(--warning)" }}
              />
            </div>
            <div>
              <h2
                className="text-sm font-semibold"
                style={{ color: "var(--text-primary)" }}>
                Copy your credentials now
              </h2>
              <p
                className="text-xs"
                style={{ color: "var(--warning)" }}>
                Client secret will NOT be shown again
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="label-dark">Client ID</label>
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{
                background: "rgba(0,0,0,0.3)",
                border: "1px solid var(--border)",
              }}>
              <code
                className="flex-1 text-xs font-mono truncate"
                style={{ color: "#a5f3fc" }}>
                {clientId}
              </code>
              <CopyButton
                text={clientId}
                size={13}
              />
            </div>
          </div>
          <div>
            <label className="label-dark">Client Secret</label>
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{
                background: "rgba(0,0,0,0.3)",
                border: "1px solid rgba(245,158,11,0.3)",
              }}>
              <code
                className="flex-1 text-xs font-mono truncate"
                style={{ color: "#fcd34d" }}>
                {clientSecret}
              </code>
              <CopyButton
                text={clientSecret}
                size={13}
              />
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="rounded"
            />
            <span
              className="text-sm"
              style={{ color: "var(--text-secondary)" }}>
              I've saved these credentials and understand I cannot view the
              secret again
            </span>
          </label>
        </div>

        <div
          className="p-5"
          style={{ borderTop: "1px solid var(--border)" }}>
          <button
            className="btn btn-primary w-full"
            onClick={onClose}
            disabled={!confirmed}>
            Done, I've saved them
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Main Page ─── */
export default function Applications() {
  const navigate = useNavigate();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [secretModal, setSecretModal] = useState<{
    clientId: string;
    clientSecret: string;
  } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    applicationService
      .getApplications()
      .then((r) => setApps(r.data?.applications || []))
      .catch(() => toast.error("Failed to load applications"))
      .finally(() => setLoading(false));
  }, []);

  const handleCreated = (app: Application, secret: string) => {
    setShowCreate(false);
    setApps((prev) => [app, ...prev]);
    setSecretModal({ clientId: app.clientId, clientSecret: secret });
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await applicationService.deleteApplication(id);
      setApps((prev) => prev.filter((a) => a.id !== id));
      toast.success("Application deleted");
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="page-title">Applications</h1>
          <p className="page-subtitle">
            Manage OAuth applications and client credentials
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="btn btn-primary gap-2">
          <Plus className="w-4 h-4" />
          New Application
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="skeleton h-20 rounded-xl"
            />
          ))}
        </div>
      ) : apps.length === 0 ? (
        <div
          className="rounded-2xl py-20"
          style={{
            background: "var(--bg-elevated)",
            border: "1px dashed var(--border)",
          }}>
          <EmptyState
            icon={AppWindow}
            title="No applications yet"
            description="Create your first app to get a client_id and client_secret for OAuth integration"
            action={
              <button
                onClick={() => setShowCreate(true)}
                className="btn btn-primary gap-2">
                <Plus className="w-4 h-4" /> Create Application
              </button>
            }
          />
        </div>
      ) : (
        <div className="space-y-3">
          {apps.map((app, i) => {
            const meta = TYPE_META[app.type];
            const Icon = meta.icon;
            return (
              <div
                key={app.id}
                className="glass-hover flex items-center gap-4 p-5 animate-slide-up"
                style={{ animationDelay: `${i * 40}ms` }}>
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: meta.color }}>
                  <Icon
                    className="w-5 h-5"
                    style={{ color: "white", opacity: 0.9 }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3
                      className="text-sm font-semibold truncate"
                      style={{ color: "var(--text-primary)" }}>
                      {app.name}
                    </h3>
                    <span className="badge badge-muted">{meta.label}</span>
                  </div>
                  <p
                    className="text-xs font-mono truncate"
                    style={{ color: "var(--text-muted)" }}>
                    {app.clientId}
                  </p>
                  {app.description && (
                    <p
                      className="text-xs truncate mt-0.5"
                      style={{ color: "var(--text-muted)" }}>
                      {app.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => navigate(`/applications/${app.id}`)}
                    className="btn btn-ghost gap-1.5 text-xs py-1.5 px-3">
                    <Settings className="w-3.5 h-3.5" />
                    Settings
                  </button>
                  <button
                    onClick={() => handleDelete(app.id, app.name)}
                    disabled={deletingId === app.id}
                    className="btn btn-danger p-2 rounded-lg">
                    {deletingId === app.id ? (
                      <Spinner size={14} />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
      {secretModal && (
        <SecretModal
          clientId={secretModal.clientId}
          clientSecret={secretModal.clientSecret}
          onClose={() => setSecretModal(null)}
        />
      )}
    </div>
  );
}
