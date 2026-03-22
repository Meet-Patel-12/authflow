import { useState, useEffect, type JSX } from "react";
import { toast } from "sonner";
import {
  Shield,
  Bell,
  Globe,
  Trash2,
  Save,
  Building2,
  AlertTriangle,
  X,
  Download,
  UserX,
  Link2,
  CheckCircle,
} from "lucide-react";
import { organizationService } from "../../organizations/api/organization.api";
import { useAppSelector, useAppDispatch } from "../../../app/hooks";
import { logout } from "../../auth/authSlice";
import api from "../../../app/apiClient";
import { Spinner, Alert } from "../../../components/ui";

type Tab = "security" | "notifications" | "privacy" | "danger" | "organization";

const TABS: { id: Tab; name: string; icon: React.ElementType }[] = [
  { id: "security", name: "Security", icon: Shield },
  { id: "organization", name: "Organization", icon: Building2 },
  { id: "notifications", name: "Notifications", icon: Bell },
  { id: "privacy", name: "Privacy", icon: Globe },
  { id: "danger", name: "Danger Zone", icon: Trash2 },
];

/* ─── Toggle ─── */
const Toggle = ({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className="relative inline-flex h-5 w-9 items-center rounded-full flex-shrink-0 transition-all"
    style={{
      background: checked ? "var(--accent)" : "rgba(255,255,255,0.12)",
    }}>
    <span
      className="inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform"
      style={{ transform: checked ? "translateX(18px)" : "translateX(3px)" }}
    />
  </button>
);

/* ─── Section card ─── */
const SectionCard = ({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
}) => (
  <div
    className="rounded-2xl p-6"
    style={{
      background: "var(--bg-elevated)",
      border: "1px solid var(--border)",
    }}>
    <h3
      className="text-sm font-semibold mb-1"
      style={{ color: "var(--text-primary)" }}>
      {title}
    </h3>
    {desc && (
      <p
        className="text-xs mb-5"
        style={{ color: "var(--text-muted)" }}>
        {desc}
      </p>
    )}
    {!desc && <div className="mb-4" />}
    {children}
  </div>
);

/* ─── Setting row ─── */
const SettingRow = ({
  label,
  desc,
  children,
  last = false,
}: {
  label: string;
  desc?: string;
  children: React.ReactNode;
  last?: boolean;
}) => (
  <div
    className="flex items-center justify-between gap-4 py-3"
    style={{
      borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.04)",
    }}>
    <div className="min-w-0">
      <p
        className="text-sm font-medium"
        style={{ color: "var(--text-primary)" }}>
        {label}
      </p>
      {desc && (
        <p
          className="text-xs mt-0.5"
          style={{ color: "var(--text-muted)" }}>
          {desc}
        </p>
      )}
    </div>
    <div className="flex-shrink-0">{children}</div>
  </div>
);

/* ═══════════════════════════════════════════  MAIN  ═══════════════════════════════════════════ */
const Settings = () => {
  const [activeTab, setActiveTab] = useState<Tab>("security");
  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">
          Manage your account and organization preferences
        </p>
      </div>
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-56 flex-shrink-0">
          <div
            className="rounded-2xl p-2"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
            }}>
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              const isDanger = tab.id === "danger";
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all text-sm font-medium mb-0.5"
                  style={{
                    background: active
                      ? isDanger
                        ? "var(--danger-dim)"
                        : "var(--accent-dim)"
                      : "transparent",
                    color: active
                      ? isDanger
                        ? "var(--danger)"
                        : "var(--accent)"
                      : isDanger
                        ? "var(--danger)"
                        : "var(--text-secondary)",
                    opacity: !active && isDanger ? 0.75 : 1,
                  }}
                  onMouseOver={(e) =>
                    !active &&
                    ((e.currentTarget as HTMLElement).style.background =
                      "rgba(255,255,255,0.04)")
                  }
                  onMouseOut={(e) =>
                    !active &&
                    ((e.currentTarget as HTMLElement).style.background =
                      "transparent")
                  }>
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {tab.name}
                </button>
              );
            })}
          </div>
        </div>
        {/* Content */}
        <div className="flex-1 min-w-0 space-y-5">
          {activeTab === "security" && <SecuritySettings />}
          {activeTab === "organization" && <OrganizationSettings />}
          {activeTab === "notifications" && <NotificationSettings />}
          {activeTab === "privacy" && <PrivacySettings />}
          {activeTab === "danger" && <DangerZone />}
        </div>
      </div>
    </div>
  );
};

/* ═══════  SECURITY  ═══════ */
const SecuritySettings = () => {
  const [current, setCurrent] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    if (!current || !newPw || !confirm) {
      toast.error("Fill in all fields");
      return;
    }
    if (newPw !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPw.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/change-password", {
        currentPassword: current,
        newPassword: newPw,
      });
      toast.success("Password updated!");
      setCurrent("");
      setNewPw("");
      setConfirm("");
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 animate-slide-up">
      <SectionCard
        title="Change Password"
        desc="Update your account password">
        <div className="space-y-3">
          {[
            ["Current password", current, setCurrent],
            ["New password", newPw, setNewPw],
            ["Confirm new password", confirm, setConfirm],
          ].map(([label, val, set]) => (
            <div key={label as string}>
              <label className="label-dark">{label as string}</label>
              <input
                type="password"
                value={val as string}
                onChange={(e) => (set as (v: string) => void)(e.target.value)}
                placeholder="••••••••"
                className="input-dark"
              />
            </div>
          ))}
          <button
            onClick={handleUpdate}
            disabled={loading}
            className="btn btn-primary gap-2 mt-1">
            {loading ? (
              <>
                <Spinner size={14} /> Updating…
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Update Password
              </>
            )}
          </button>
        </div>
      </SectionCard>
      <SectionCard
        title="Two-Factor Authentication"
        desc="Add an extra layer of security">
        <SettingRow
          label="Authenticator App"
          desc="Use an app to generate time-based codes"
          last>
          <a
            href="/mfa/setup"
            className="btn btn-ghost text-sm">
            Set up
          </a>
        </SettingRow>
      </SectionCard>
      <SectionCard
        title="Active Sessions"
        desc="Devices currently signed in to your account">
        <SettingRow
          label="Manage Sessions"
          desc="View and revoke active sessions"
          last>
          <a
            href="/sessions"
            className="btn btn-ghost text-sm">
            View all
          </a>
        </SettingRow>
      </SectionCard>
    </div>
  );
};

/* ═══════  ORGANIZATION  ═══════ */
const OrganizationSettings = () => {
  const { currentOrganization } = useAppSelector((s) => s.organizations);
  const [name, setName] = useState(currentOrganization?.name || "");
  const [mfa, setMfa] = useState(false);
  const [verify, setVerify] = useState(true);
  const [signup, setSignup] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || name.trim().length < 2) {
      toast.error("Name must be at least 2 characters");
      return;
    }
    setLoading(true);
    try {
      await organizationService.updateOrganization({
        name: name.trim(),
        settings: {
          requireMFA: mfa,
          requireEmailVerification: verify,
          allowSignup: signup,
        },
      });
      toast.success("Organization settings saved!");
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || "Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 animate-slide-up">
      <SectionCard title="Organization Details">
        <div>
          <label className="label-dark">Organization name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-dark"
            placeholder="My Organization"
          />
        </div>
      </SectionCard>
      <SectionCard
        title="Security Policies"
        desc="Enforce requirements for all members">
        {[
          {
            checked: mfa,
            set: setMfa,
            label: "Require MFA",
            desc: "All members must enable two-factor authentication",
            last: false,
          },
          {
            checked: verify,
            set: setVerify,
            label: "Require Email Verification",
            desc: "New members must verify their email before joining",
            last: false,
          },
          {
            checked: signup,
            set: setSignup,
            label: "Allow Open Signup",
            desc: "Anyone can join this organization without an invite",
            last: true,
          },
        ].map((item) => (
          <SettingRow
            key={item.label}
            label={item.label}
            desc={item.desc}
            last={item.last}>
            <Toggle
              checked={item.checked}
              onChange={item.set}
            />
          </SettingRow>
        ))}
      </SectionCard>
      <button
        onClick={handleSave}
        disabled={loading}
        className="btn btn-primary gap-2">
        {loading ? (
          <>
            <Spinner size={14} /> Saving…
          </>
        ) : (
          <>
            <Save className="w-4 h-4" /> Save Settings
          </>
        )}
      </button>
    </div>
  );
};

/* ═══════  NOTIFICATIONS  ← Gap #1 ═══════ */
interface NotifPrefs {
  accountActivity: boolean;
  securityAlerts: boolean;
  productUpdates: boolean;
  marketingEmails: boolean;
}
const NOTIF_ITEMS: { key: keyof NotifPrefs; label: string; desc: string }[] = [
  {
    key: "accountActivity",
    label: "Account activity",
    desc: "Login alerts, profile changes, password updates",
  },
  {
    key: "securityAlerts",
    label: "Security alerts",
    desc: "MFA changes, suspicious activity, revoked sessions",
  },
  {
    key: "productUpdates",
    label: "Product updates",
    desc: "New features and changelog announcements",
  },
  {
    key: "marketingEmails",
    label: "Marketing emails",
    desc: "Promotional content and offers",
  },
];

const NotificationSettings = () => {
  const [prefs, setPrefs] = useState<NotifPrefs>({
    accountActivity: true,
    securityAlerts: true,
    productUpdates: true,
    marketingEmails: false,
  });
  const [fetchLoading, setFetch] = useState(true);
  const [saveLoading, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    api
      .get("/notifications/preferences")
      .then((res) => setPrefs(res.data.data.preferences))
      .catch(() => {})
      .finally(() => setFetch(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put("/notifications/preferences", prefs);
      toast.success("Notification preferences saved!");
      setDirty(false);
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  if (fetchLoading)
    return (
      <div className="flex justify-center py-16">
        <Spinner size={26} />
      </div>
    );

  return (
    <div className="space-y-5 animate-slide-up">
      <SectionCard
        title="Email Notifications"
        desc="Choose which emails you want to receive">
        {NOTIF_ITEMS.map((item, i, arr) => (
          <SettingRow
            key={item.key}
            label={item.label}
            desc={item.desc}
            last={i === arr.length - 1}>
            <Toggle
              checked={prefs[item.key]}
              onChange={() => {
                setPrefs((p) => ({ ...p, [item.key]: !p[item.key] }));
                setDirty(true);
              }}
            />
          </SettingRow>
        ))}
        {dirty && (
          <p
            className="text-xs mt-3"
            style={{ color: "var(--warning)" }}>
            Unsaved changes
          </p>
        )}
      </SectionCard>
      <button
        onClick={handleSave}
        disabled={saveLoading || !dirty}
        className="btn btn-primary gap-2 disabled:opacity-50">
        {saveLoading ? (
          <>
            <Spinner size={14} /> Saving…
          </>
        ) : (
          <>
            <Save className="w-4 h-4" /> Save Preferences
          </>
        )}
      </button>
    </div>
  );
};

/* ═══════  PRIVACY  ← Gaps #2 & #5 ═══════ */
interface ConnectedApp {
  provider: "google" | "github";
  name: string;
  description: string;
  connected: boolean;
  connectedEmail?: string | null;
  connectedUsername?: string | null;
}

const PROVIDER_ICONS: Record<string, JSX.Element> = {
  google: (
    <svg
      className="w-4 h-4"
      viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  ),
  github: (
    <svg
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill="currentColor"
      style={{ color: "var(--text-primary)" }}>
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  ),
};

const PrivacySettings = () => {
  const [downloading, setDownloading] = useState(false);
  const [apps, setApps] = useState<ConnectedApp[]>([]);
  const [appsLoading, setAppsLoading] = useState(true);

  useEffect(() => {
    api
      .get("/auth/connected-apps")
      .then((res) => setApps(res.data.data.apps))
      .catch(() => {})
      .finally(() => setAppsLoading(false));
  }, []);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || ""}/api/auth/data-export`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.message || "Export failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.download =
        res.headers
          .get("Content-Disposition")
          ?.match(/filename="(.+?)"/)?.[1] ?? "authflow-data.json";
      a.href = url;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Data exported successfully!");
    } catch (err) {
      const e = err as { message?: string };
      toast.error(e?.message || "Failed to download data");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-5 animate-slide-up">
      <SectionCard
        title="Data & Privacy"
        desc="Download your personal data or review account visibility">
        <SettingRow
          label="Download your data"
          desc="Export your sessions, organizations, and preferences as JSON"
          last>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="btn btn-ghost gap-2 text-sm">
            {downloading ? (
              <>
                <Spinner size={13} /> Exporting…
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" /> Download
              </>
            )}
          </button>
        </SettingRow>
      </SectionCard>

      <SectionCard
        title="Connected Apps"
        desc="OAuth providers linked to your account for sign-in">
        {appsLoading ? (
          <div className="flex justify-center py-8">
            <Spinner size={22} />
          </div>
        ) : apps.length === 0 ? (
          <div className="flex flex-col items-center py-8 gap-2">
            <Link2
              className="w-8 h-8"
              style={{ color: "var(--text-muted)" }}
            />
            <p
              className="text-sm"
              style={{ color: "var(--text-muted)" }}>
              No connected apps
            </p>
          </div>
        ) : (
          apps.map((app, i, arr) => (
            <SettingRow
              key={app.provider}
              label={app.name}
              desc={
                app.connected
                  ? app.connectedEmail
                    ? `Connected as ${app.connectedEmail}`
                    : app.connectedUsername
                      ? `Connected as @${app.connectedUsername}`
                      : "Connected"
                  : app.description
              }
              last={i === arr.length - 1}>
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid var(--border)",
                  }}>
                  {PROVIDER_ICONS[app.provider]}
                </div>
                <span
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-lg"
                  style={{
                    background: app.connected
                      ? "var(--success-dim)"
                      : "rgba(255,255,255,0.04)",
                    color: app.connected
                      ? "var(--success)"
                      : "var(--text-muted)",
                  }}>
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      background: app.connected
                        ? "var(--success)"
                        : "var(--text-muted)",
                    }}
                  />
                  {app.connected ? "Connected" : "Not connected"}
                </span>
              </div>
            </SettingRow>
          ))
        )}
      </SectionCard>
    </div>
  );
};

/* ═══════  DANGER ZONE  ← Gaps #3 & #4 ═══════ */
const DangerZone = () => {
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  return (
    <div className="space-y-4 animate-slide-up">
      {/* Deactivate */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid rgba(245,158,11,0.2)",
        }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h4
              className="text-sm font-semibold mb-1"
              style={{ color: "var(--text-primary)" }}>
              Deactivate Account
            </h4>
            <p
              className="text-xs leading-relaxed"
              style={{ color: "var(--text-muted)" }}>
              Temporarily disable your account. All sessions will be revoked.
              You can reactivate by logging in again or asking an admin.
            </p>
          </div>
          <button
            onClick={() => setShowDeactivate(true)}
            className="btn flex-shrink-0 gap-2 text-sm"
            style={{
              background: "var(--warning-dim)",
              color: "var(--warning)",
              border: "1px solid rgba(245,158,11,0.25)",
            }}>
            <UserX className="w-4 h-4" /> Deactivate
          </button>
        </div>
      </div>
      {/* Delete */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: "rgba(244,63,94,0.04)",
          border: "1px solid rgba(244,63,94,0.2)",
        }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h4
              className="text-sm font-semibold mb-1"
              style={{ color: "var(--danger)" }}>
              Delete Account
            </h4>
            <p
              className="text-xs leading-relaxed"
              style={{ color: "var(--text-muted)" }}>
              Permanently delete your account and all data — organization, API
              keys, webhooks, sessions, and audit logs. Cannot be undone.
            </p>
          </div>
          <button
            onClick={() => setShowDelete(true)}
            className="btn flex-shrink-0 gap-2 text-sm"
            style={{
              background: "var(--danger-dim)",
              color: "var(--danger)",
              border: "1px solid rgba(244,63,94,0.25)",
            }}>
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      </div>
      {showDeactivate && (
        <DeactivateModal onClose={() => setShowDeactivate(false)} />
      )}
      {showDelete && <DeleteModal onClose={() => setShowDelete(false)} />}
    </div>
  );
};

/* ─── Deactivate Modal ─── */
const DeactivateModal = ({ onClose }: { onClose: () => void }) => {
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const handle = async () => {
    setLoading(true);
    try {
      await api.post("/auth/deactivate");
      toast.success("Account deactivated. Log in again to reactivate.");
      localStorage.clear();
      dispatch(logout({} as never));
      window.location.href = "/login";
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || "Failed to deactivate");
      setLoading(false);
    }
  };
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && !loading && onClose()}>
      <div className="modal-box p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "var(--warning-dim)" }}>
              <AlertTriangle
                className="w-4 h-4"
                style={{ color: "var(--warning)" }}
              />
            </div>
            <h2
              className="text-base font-semibold"
              style={{ color: "var(--text-primary)" }}>
              Deactivate Account
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="btn btn-ghost p-1.5">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div
          className="rounded-xl p-4"
          style={{
            background: "var(--warning-dim)",
            border: "1px solid rgba(245,158,11,0.2)",
          }}>
          <p
            className="text-xs font-semibold mb-2"
            style={{ color: "var(--warning)" }}>
            What happens:
          </p>
          {[
            "You will be logged out immediately",
            "All active sessions will be revoked",
            "Your data and organization are preserved",
            "Log in again anytime to reactivate",
          ].map((item) => (
            <div
              key={item}
              className="flex items-center gap-2 mb-1">
              <CheckCircle
                className="w-3 h-3 flex-shrink-0"
                style={{ color: "var(--warning)" }}
              />
              <p
                className="text-xs"
                style={{ color: "var(--warning)" }}>
                {item}
              </p>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button
            className="btn btn-ghost flex-1"
            onClick={onClose}
            disabled={loading}>
            Cancel
          </button>
          <button
            onClick={handle}
            disabled={loading}
            className="btn flex-1 gap-2"
            style={{
              background: "var(--warning-dim)",
              color: "var(--warning)",
              border: "1px solid rgba(245,158,11,0.3)",
            }}>
            {loading ? (
              <>
                <Spinner size={14} /> Deactivating…
              </>
            ) : (
              <>
                <UserX className="w-4 h-4" /> Deactivate
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Delete Modal ─── */
const DeleteModal = ({ onClose }: { onClose: () => void }) => {
  const dispatch = useAppDispatch();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const CONFIRM_TEXT = "DELETE";
  const canSubmit =
    confirmation === CONFIRM_TEXT && password.length > 0 && !loading;

  const handle = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      await api.delete("/auth/account", { data: { password } });
      toast.success("Account deleted.");
      localStorage.clear();
      dispatch(logout({} as never));
      window.location.href = "/login";
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || "Failed to delete account");
      setLoading(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && !loading && onClose()}>
      <div className="modal-box p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "var(--danger-dim)" }}>
              <AlertTriangle
                className="w-4 h-4"
                style={{ color: "var(--danger)" }}
              />
            </div>
            <h2
              className="text-base font-semibold"
              style={{ color: "var(--text-primary)" }}>
              Delete Account
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="btn btn-ghost p-1.5">
            <X className="w-4 h-4" />
          </button>
        </div>
        <Alert variant="danger">
          <p className="font-semibold text-xs mb-1">
            Permanently deletes everything:
          </p>
          <p className="text-xs font-normal">
            Account, organization, all API keys, webhooks, sessions, and audit
            logs. Cannot be undone.
          </p>
        </Alert>
        <div className="space-y-3">
          <div>
            <label className="label-dark">Confirm your password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-dark"
              placeholder="••••••••"
              autoFocus
            />
          </div>
          <div>
            <label className="label-dark">
              Type{" "}
              <code
                className="font-mono font-bold"
                style={{ color: "var(--danger)" }}>
                {CONFIRM_TEXT}
              </code>{" "}
              to confirm
            </label>
            <input
              type="text"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value.toUpperCase())}
              className="input-dark"
              placeholder={CONFIRM_TEXT}
            />
          </div>
        </div>
        <div className="flex gap-3">
          <button
            className="btn btn-ghost flex-1"
            onClick={onClose}
            disabled={loading}>
            Cancel
          </button>
          <button
            onClick={handle}
            disabled={!canSubmit}
            className="btn flex-1 gap-2 disabled:opacity-40"
            style={{
              background: "var(--danger-dim)",
              color: "var(--danger)",
              border: "1px solid rgba(244,63,94,0.3)",
            }}>
            {loading ? (
              <>
                <Spinner size={14} /> Deleting…
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" /> Delete My Account
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
