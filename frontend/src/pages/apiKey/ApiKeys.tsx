import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Key,
  Copy,
  Check,
  Calendar,
  Activity,
} from "lucide-react";
import { apiKeyService } from "../../api/apiKeys.api";
import type { ApiKey } from "../../api/apiKeys.api";
import { EmptyState, Spinner, Alert } from "../../components/ui";

const CreateModal = ({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (key: ApiKey) => void;
}) => {
  const [name, setName] = useState("");
  const [permissions, setPermissions] = useState<string[]>(["read"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const PERMS = ["read", "write", "delete", "admin"];
  const togglePerm = (p: string) =>
    setPermissions((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await apiKeyService.createApiKey({
        name: name.trim(),
        permissions,
      });
      console.log("create response:", JSON.stringify(res, null, 2));
      onCreated(res.data!);
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message || "Failed to create key");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box p-6 space-y-5">
        <h2
          className="text-base font-semibold"
          style={{ color: "var(--text-primary)" }}>
          Create API Key
        </h2>
        {error && <Alert variant="danger">{error}</Alert>}
        <div>
          <label className="label-dark">Key name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Production Key"
            className="input-dark"
          />
        </div>
        <div>
          <label className="label-dark">Permissions</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {PERMS.map((p) => {
              const sel = permissions.includes(p);
              return (
                <button
                  key={p}
                  onClick={() => togglePerm(p)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize"
                  style={{
                    background: sel
                      ? "var(--accent-dim)"
                      : "rgba(255,255,255,0.04)",
                    border: `1px solid ${sel ? "rgba(99,102,241,0.3)" : "var(--border)"}`,
                    color: sel ? "var(--accent)" : "var(--text-secondary)",
                  }}>
                  {p}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
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
              "Create Key"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const KeyReveal = ({
  apiKey,
  onClose,
}: {
  apiKey: string;
  onClose: () => void;
}) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="modal-backdrop">
      <div className="modal-box p-6 space-y-4">
        <Alert variant="warning">
          <strong>Save this key now</strong> — it will not be shown again.
        </Alert>
        <div>
          <label className="label-dark">API Key</label>
          <div
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg"
            style={{
              background: "rgba(0,0,0,0.4)",
              border: "1px solid rgba(245,158,11,0.3)",
            }}>
            <code
              className="flex-1 text-xs font-mono break-all"
              style={{ color: "#fcd34d" }}>
              {apiKey}
            </code>
            <button
              onClick={copy}
              className="p-1 transition-colors"
              style={{
                color: copied ? "var(--success)" : "var(--text-muted)",
              }}>
              {copied ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
        <button
          className="btn btn-primary w-full"
          onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
};

export default function ApiKeys() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [revealKey, setRevealKey] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    apiKeyService
      .getApiKeys()
      .then((r) => setKeys(r.data?.apiKeys || []))
      .catch(() => toast.error("Failed to load API keys"))
      .finally(() => setLoading(false));
  }, []);

  const handleCreated = (key: ApiKey) => {
    setShowCreate(false);
    setKeys((prev) => [{ ...key, usageCount: key.usageCount ?? 0 }, ...prev]);
    if (key.key) setRevealKey(key.key);
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm("Delete this API key? Any services using it will lose access.")
    )
      return;
    setDeletingId(id);
    try {
      await apiKeyService.deleteApiKey(id);
      setKeys((prev) => prev.filter((k) => k.id !== id));
      toast.success("API key deleted");
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
          <h1 className="page-title">API Keys</h1>
          <p className="page-subtitle">
            Programmatic access to your AuthFlow resources
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="btn btn-primary gap-2">
          <Plus className="w-4 h-4" /> New Key
        </button>
      </div>

      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
        }}>
        {loading ? (
          <div className="p-8 text-center">
            <Spinner
              size={24}
              className="mx-auto"
            />
          </div>
        ) : keys.length === 0 ? (
          <EmptyState
            icon={Key}
            title="No API keys"
            description="Create an API key to access AuthFlow programmatically"
            action={
              <button
                onClick={() => setShowCreate(true)}
                className="btn btn-primary gap-2">
                <Plus className="w-4 h-4" /> Create API Key
              </button>
            }
          />
        ) : (
          <table className="table-dark">
            <thead>
              <tr>
                <th>Name</th>
                <th>Permissions</th>
                <th>Last used</th>
                <th>Usage</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {keys.map((key, i) => (
                <tr
                  key={key.id}
                  className="animate-slide-up"
                  style={{ animationDelay: `${i * 40}ms` }}>
                  <td>
                    <div className="flex items-center gap-2">
                      <Key
                        className="w-3.5 h-3.5 flex-shrink-0"
                        style={{ color: "var(--accent)" }}
                      />
                      <span
                        className="font-medium text-sm"
                        style={{ color: "var(--text-primary)" }}>
                        {key.name}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {(key.permissions || []).map((p) => (
                        <span
                          key={p}
                          className="badge badge-accent capitalize">
                          {p}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <Calendar
                        className="w-3.5 h-3.5"
                        style={{ color: "var(--text-muted)" }}
                      />
                      <span>
                        {key.lastUsedAt
                          ? new Date(key.lastUsedAt).toLocaleDateString()
                          : "Never"}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <Activity
                        className="w-3.5 h-3.5"
                        style={{ color: "var(--text-muted)" }}
                      />
                      <span>{(key.usageCount ?? 0).toLocaleString()}</span>
                    </div>
                  </td>
                  <td>{new Date(key.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button
                      onClick={() => handleDelete(key.id)}
                      disabled={deletingId === key.id}
                      className="btn btn-danger p-1.5">
                      {deletingId === key.id ? (
                        <Spinner size={13} />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
      {revealKey && (
        <KeyReveal
          apiKey={revealKey}
          onClose={() => setRevealKey(null)}
        />
      )}
    </div>
  );
}
