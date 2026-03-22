import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  RefreshCw,
  Trash2,
  ArrowLeft,
  AlertTriangle,
  Globe,
  Smartphone,
  Server,
  Monitor,
  Save,
  Check,
} from "lucide-react";
import {
  applicationService,
  type UpdateApplicationData,
} from "../api/application.api";
import type {
  Application,
  ApplicationType,
} from "../../../shared/types/global.types";
import { Spinner, Alert, CopyButton } from "../../../components/ui";

/* ─── App type meta ─── */
const APP_TYPE_META: Record<
  ApplicationType,
  { label: string; icon: React.ElementType; color: string; glow: string }
> = {
  spa: {
    label: "Single Page Application",
    icon: Globe,
    color: "var(--accent-dim)",
    glow: "rgba(99,102,241,0.3)",
  },
  regular_web: {
    label: "Regular Web Application",
    icon: Monitor,
    color: "var(--success-dim)",
    glow: "rgba(16,185,129,0.3)",
  },
  native: {
    label: "Native Application",
    icon: Smartphone,
    color: "var(--cyan-dim)",
    glow: "rgba(6,182,212,0.3)",
  },
  machine_to_machine: {
    label: "Machine to Machine",
    icon: Server,
    color: "var(--warning-dim)",
    glow: "rgba(245,158,11,0.3)",
  },
};

/* ─── Section wrapper ─── */
const Section = ({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) => (
  <div
    className="rounded-2xl p-6"
    style={{
      background: "var(--bg-elevated)",
      border: "1px solid var(--border)",
    }}>
    <div className="mb-5">
      <h2
        className="text-sm font-semibold"
        style={{ color: "var(--text-primary)" }}>
        {title}
      </h2>
      {subtitle && (
        <p
          className="text-xs mt-0.5"
          style={{ color: "var(--text-muted)" }}>
          {subtitle}
        </p>
      )}
    </div>
    {children}
  </div>
);

/* ─── Credential row ─── */
const CredRow = ({
  label,
  value,
  masked = false,
  action,
}: {
  label: string;
  value: string;
  masked?: boolean;
  action?: React.ReactNode;
}) => (
  <div>
    <label className="label-dark">{label}</label>
    <div
      className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
      style={{
        background: "rgba(0,0,0,0.3)",
        border: "1px solid var(--border)",
      }}>
      <code
        className="flex-1 text-xs font-mono truncate"
        style={{ color: masked ? "var(--text-muted)" : "#a5f3fc" }}>
        {masked ? "••••••••••••••••••••••••••••••••" : value}
      </code>
      {!masked && (
        <CopyButton
          text={value}
          size={13}
        />
      )}
      {action}
    </div>
  </div>
);

/* ─── URL list editor ─── */
const UrlListEditor = ({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string[];
  onChange: (v: string[]) => void;
}) => {
  const [input, setInput] = useState(value.join("\n"));

  const handleBlur = () => {
    const urls = input
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    onChange(urls);
  };

  return (
    <div>
      <label className="label-dark">{label}</label>
      <p
        className="text-xs mb-2"
        style={{ color: "var(--text-muted)" }}>
        {hint}
      </p>
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onBlur={handleBlur}
        rows={3}
        placeholder="https://example.com/callback"
        className="input-dark font-mono text-xs resize-none"
        style={{ fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)" }}
      />
    </div>
  );
};

/* ─── Rotate secret modal ─── */
const RotateSecretModal = ({
  newSecret,
  onClose,
}: {
  newSecret: string;
  onClose: () => void;
}) => {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div className="modal-backdrop">
      <div
        className="modal-box"
        style={{ maxWidth: 520 }}>
        {/* Warning header */}
        <div
          className="flex items-center gap-3 p-5 rounded-t-2xl"
          style={{
            background: "rgba(245,158,11,0.08)",
            borderBottom: "1px solid rgba(245,158,11,0.2)",
          }}>
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
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
              New Client Secret Generated
            </h2>
            <p
              className="text-xs"
              style={{ color: "var(--warning)" }}>
              Your previous secret is now invalid
            </p>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <p
            className="text-sm"
            style={{ color: "var(--text-secondary)" }}>
            Update your application with the new secret immediately. Any
            integrations using the old secret will stop working.
          </p>

          <div>
            <label className="label-dark">New Client Secret</label>
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
              style={{
                background: "rgba(0,0,0,0.4)",
                border: "1px solid rgba(245,158,11,0.3)",
              }}>
              <code
                className="flex-1 text-xs font-mono break-all"
                style={{ color: "#fcd34d" }}>
                {newSecret}
              </code>
              <CopyButton
                text={newSecret}
                size={13}
              />
            </div>
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 rounded"
            />
            <span
              className="text-sm"
              style={{ color: "var(--text-secondary)" }}>
              I have copied the new secret and updated my application
            </span>
          </label>
        </div>

        <div className="px-5 pb-5">
          <button
            onClick={onClose}
            disabled={!confirmed}
            className="btn btn-primary w-full">
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════ */
const ApplicationDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [app, setApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  /* Editable fields */
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [callbacks, setCallbacks] = useState<string[]>([]);
  const [logoutUrls, setLogoutUrls] = useState<string[]>([]);
  const [origins, setOrigins] = useState<string[]>([]);
  const [webOrigins, setWebOrigins] = useState<string[]>([]);
  const [accessTTL, setAccessTTL] = useState(86400);
  const [refreshTTL, setRefreshTTL] = useState(604800);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await applicationService.getApplication(id!);
        const a = response.data!.application;
        setApp(a);
        setName(a.name);
        setDescription(a.description || "");
        setCallbacks(a.allowedCallbacks);
        setLogoutUrls(a.allowedLogoutUrls);
        setOrigins(a.allowedOrigins);
        setWebOrigins(a.allowedWebOrigins);
        setAccessTTL(a.tokenExpiry.accessTokenTTL);
        setRefreshTTL(a.tokenExpiry.refreshTokenTTL);
      } catch {
        navigate("/applications");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const data: UpdateApplicationData = {
        name,
        description: description || undefined,
        allowedCallbacks: callbacks,
        allowedLogoutUrls: logoutUrls,
        allowedOrigins: origins,
        allowedWebOrigins: webOrigins,
        tokenExpiry: { accessTokenTTL: accessTTL, refreshTokenTTL: refreshTTL },
      };
      await applicationService.updateApplication(id!, data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      toast.success("Changes saved");
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      const msg = err.response?.data?.message || "Failed to save changes";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleRotate = async () => {
    if (
      !confirm(
        "Rotate secret? Your current secret will stop working immediately.",
      )
    )
      return;
    setRotating(true);
    try {
      const response = await applicationService.rotateSecret(id!);

      const secret = response.data?.rawSecret;
      if (!secret) {
        toast.error("Server did not return a new secret — check console");
        return;
      }
      setNewSecret(secret);
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      const msg = err.response?.data?.message || "Failed to rotate secret";
      setError(msg);
      toast.error(msg);
    } finally {
      setRotating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${app?.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await applicationService.deleteApplication(id!);
      toast.success("Application deleted");
      navigate("/applications");
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      const msg = err.response?.data?.message || "Failed to delete";
      setError(msg);
      toast.error(msg);
      setDeleting(false);
    }
  };

  /* Loading */
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 animate-fade-in">
        <div className="skeleton h-10 w-40 rounded-xl mb-6" />
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="skeleton h-36 rounded-2xl"
          />
        ))}
      </div>
    );
  }

  if (!app) return null;

  const meta = APP_TYPE_META[app.type];
  const Icon = meta.icon;

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">
      {/* ── Back + page title ── */}
      <div>
        <button
          onClick={() => navigate("/applications")}
          className="flex items-center gap-1.5 text-xs mb-5 transition-colors"
          style={{ color: "var(--text-muted)" }}
          onMouseOver={(e) =>
            ((e.currentTarget as HTMLElement).style.color =
              "var(--text-secondary)")
          }
          onMouseOut={(e) =>
            ((e.currentTarget as HTMLElement).style.color = "var(--text-muted)")
          }>
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Applications
        </button>

        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{
              background: meta.color,
              boxShadow: `0 0 20px ${meta.glow}`,
            }}>
            <Icon
              className="w-6 h-6"
              style={{ color: "white", opacity: 0.9 }}
            />
          </div>
          <div>
            <h1
              className="text-xl font-bold"
              style={{ color: "var(--text-primary)" }}>
              {app.name}
            </h1>
            <p
              className="text-sm"
              style={{ color: "var(--text-muted)" }}>
              {meta.label}
            </p>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && <Alert variant="danger">{error}</Alert>}

      {/* ── Credentials ── */}
      <Section
        title="Credentials"
        subtitle="Use these to authenticate your application with AuthFlow">
        <div className="space-y-4">
          <CredRow
            label="Domain"
            value={window.location.hostname}
          />
          <CredRow
            label="Client ID"
            value={app.clientId}
          />

          {/* Secret row with rotate button */}
          <div>
            <label className="label-dark">Client Secret</label>
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
              style={{
                background: "rgba(0,0,0,0.3)",
                border: "1px solid var(--border)",
              }}>
              <code
                className="flex-1 text-xs font-mono"
                style={{ color: "var(--text-muted)" }}>
                ••••••••••••••••••••••••••••••••
              </code>
              <button
                onClick={handleRotate}
                disabled={rotating}
                className="btn btn-ghost gap-1.5 text-xs py-1 px-2.5 flex-shrink-0">
                {rotating ? (
                  <>
                    <Spinner size={12} /> Rotating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3 h-3" /> Rotate
                  </>
                )}
              </button>
            </div>
            <p
              className="text-xs mt-1.5"
              style={{ color: "var(--text-muted)" }}>
              Secret is hidden for security. Rotate to generate a new one — the
              old secret will stop working immediately.
            </p>
          </div>
        </div>
      </Section>

      {/* ── Basic settings ── */}
      <Section title="Settings">
        <div className="space-y-4">
          <div>
            <label className="label-dark">Application name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-dark"
            />
          </div>
          <div>
            <label className="label-dark">
              Description{" "}
              <span
                style={{
                  color: "var(--text-muted)",
                  textTransform: "none",
                  fontSize: "0.72rem",
                }}>
                (optional)
              </span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={140}
              className="input-dark"
              placeholder="Short description of this application"
            />
          </div>
        </div>
      </Section>

      {/* ── Application URIs ── */}
      <Section
        title="Application URIs"
        subtitle="Configure where AuthFlow can redirect users after authentication">
        <div className="space-y-5">
          <UrlListEditor
            label="Allowed Callback URLs"
            hint="URLs AuthFlow will redirect to after login. One URL per line."
            value={callbacks}
            onChange={setCallbacks}
          />
          <UrlListEditor
            label="Allowed Logout URLs"
            hint="URLs AuthFlow will redirect to after logout."
            value={logoutUrls}
            onChange={setLogoutUrls}
          />
          <UrlListEditor
            label="Allowed Web Origins"
            hint="Origins allowed to make authentication requests (CORS)."
            value={origins}
            onChange={setOrigins}
          />
          <UrlListEditor
            label="Allowed Origins (Web Message)"
            hint="Origins allowed for cross-origin auth using web message response mode."
            value={webOrigins}
            onChange={setWebOrigins}
          />
        </div>
      </Section>

      {/* ── Token expiry ── */}
      <Section
        title="Token Expiry"
        subtitle="Control how long access and refresh tokens remain valid">
        <div className="grid grid-cols-2 gap-4">
          {[
            {
              label: "Access Token TTL",
              value: accessTTL,
              set: setAccessTTL,
              min: 300,
              max: 2592000,
              hint: `${Math.round(accessTTL / 3600)}h · min 5 min, max 30 days`,
            },
            {
              label: "Refresh Token TTL",
              value: refreshTTL,
              set: setRefreshTTL,
              min: 3600,
              max: 31536000,
              hint: `${Math.round(refreshTTL / 86400)}d · min 1 h, max 1 year`,
            },
          ].map(({ label, value, set, min, max, hint }) => (
            <div key={label}>
              <label className="label-dark">
                {label}{" "}
                <span
                  style={{ color: "var(--text-muted)", textTransform: "none" }}>
                  (seconds)
                </span>
              </label>
              <input
                type="number"
                value={value}
                onChange={(e) => set(Number(e.target.value))}
                min={min}
                max={max}
                className="input-dark"
              />
              <p
                className="text-xs mt-1.5"
                style={{ color: "var(--text-muted)" }}>
                {hint}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Save button ── */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`btn gap-2 ${saved ? "btn-success" : "btn-primary"}`}>
          {saving ? (
            <>
              <Spinner size={14} /> Saving...
            </>
          ) : saved ? (
            <>
              <Check className="w-4 h-4" /> Saved
            </>
          ) : (
            <>
              <Save className="w-4 h-4" /> Save changes
            </>
          )}
        </button>
      </div>

      {/* ── Danger zone ── */}
      <div
        className="rounded-2xl p-6"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid rgba(244,63,94,0.25)",
        }}>
        <h2
          className="text-sm font-semibold mb-4"
          style={{ color: "var(--danger)" }}>
          Danger Zone
        </h2>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p
              className="text-sm font-medium"
              style={{ color: "var(--text-primary)" }}>
              Delete Application
            </p>
            <p
              className="text-xs mt-0.5"
              style={{ color: "var(--text-muted)" }}>
              Permanently remove this application and invalidate all credentials
            </p>
          </div>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="btn btn-danger gap-2 text-sm flex-shrink-0">
            {deleting ? (
              <>
                <Spinner size={14} /> Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" /> Delete
              </>
            )}
          </button>
        </div>
      </div>

      {/* Rotate secret modal */}
      {newSecret && (
        <RotateSecretModal
          newSecret={newSecret}
          onClose={() => setNewSecret(null)}
        />
      )}
    </div>
  );
};

export default ApplicationDetail;
