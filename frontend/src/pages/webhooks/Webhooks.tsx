import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Webhook,
  X,
  Shield,
} from "lucide-react";
import {
  webhookService,
  ALL_EVENTS,
  type Webhook as IWebhook,
  type WebhookDelivery,
} from "../../api/webhooks.api";
import { EmptyState, Spinner, Alert, CopyButton } from "../../components/ui";

const statusBadge: Record<string, string> = {
  success: "badge-success",
  failed: "badge-danger",
  retrying: "badge-warning",
  pending: "badge-muted",
};

const StatusIcon = ({ status }: { status: string }) => {
  if (status === "success")
    return (
      <CheckCircle
        className="w-3.5 h-3.5"
        style={{ color: "var(--success)" }}
      />
    );
  if (status === "failed")
    return (
      <XCircle
        className="w-3.5 h-3.5"
        style={{ color: "var(--danger)" }}
      />
    );
  if (status === "retrying")
    return (
      <RefreshCw
        className="w-3.5 h-3.5"
        style={{ color: "var(--warning)" }}
      />
    );
  return (
    <Clock
      className="w-3.5 h-3.5"
      style={{ color: "var(--text-muted)" }}
    />
  );
};

const CreateModal = ({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (wh: IWebhook) => void;
}) => {
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>([]);
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toggle = (v: string) =>
    setEvents((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v],
    );

  const handleCreate = async () => {
    if (!url.trim()) {
      setError("URL is required");
      return;
    }
    if (events.length === 0) {
      setError("Select at least one event");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await webhookService.createWebhook({
        url: url.trim(),
        events,
        secret: secret || undefined,
      });
      onCreated(res.data!.webhook);
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message || "Failed to create webhook");
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
        style={{ maxWidth: 560 }}>
        <div
          className="flex items-center justify-between p-5"
          style={{ borderBottom: "1px solid var(--border)" }}>
          <h2
            className="text-base font-semibold"
            style={{ color: "var(--text-primary)" }}>
            Create Webhook
          </h2>
          <button
            onClick={onClose}
            className="btn btn-ghost p-1.5">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-5">
          {error && <Alert variant="danger">{error}</Alert>}
          <div>
            <label className="label-dark">Endpoint URL</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-app.com/webhooks"
              className="input-dark"
            />
          </div>
          <div>
            <label className="label-dark">Events to subscribe</label>
            <div className="flex flex-wrap gap-2 mt-1 max-h-40 overflow-y-auto pr-1">
              {ALL_EVENTS.map((ev) => {
                const sel = events.includes(ev.value);
                return (
                  <button
                    key={ev.value}
                    onClick={() => toggle(ev.value)}
                    className="px-2.5 py-1 rounded-lg text-xs font-mono transition-all"
                    style={{
                      background: sel
                        ? "var(--accent-dim)"
                        : "rgba(255,255,255,0.04)",
                      border: `1px solid ${sel ? "rgba(99,102,241,0.3)" : "var(--border)"}`,
                      color: sel ? "var(--accent)" : "var(--text-muted)",
                    }}>
                    {ev.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="label-dark">
              Signing secret{" "}
              <span
                style={{ color: "var(--text-muted)", textTransform: "none" }}>
                (optional)
              </span>
            </label>
            <div className="relative">
              <Shield
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: "var(--text-muted)" }}
              />
              <input
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="whsec_..."
                className="input-dark pl-9"
              />
            </div>
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
              "Create Webhook"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function Webhooks() {
  const [webhooks, setWebhooks] = useState<IWebhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<
    Record<string, WebhookDelivery[]>
  >({});
  const [deliveriesLoading, setDeliveriesLoading] = useState<string | null>(
    null,
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    webhookService
      .getWebhooks()
      .then((r) => setWebhooks(r.data?.webhooks || []))
      .catch(() => toast.error("Failed to load webhooks"))
      .finally(() => setLoading(false));
  }, []);

  const toggleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!deliveries[id]) {
      setDeliveriesLoading(id);
      try {
        const r = await webhookService.getDeliveries(id);
        setDeliveries((prev) => ({ ...prev, [id]: r.data?.deliveries || [] }));
      } catch {
        toast.error("Failed to load deliveries");
      } finally {
        setDeliveriesLoading(null);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this webhook? All delivery history will be lost."))
      return;
    setDeletingId(id);
    try {
      await webhookService.deleteWebhook(id);
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
      toast.success("Webhook deleted");
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
          <h1 className="page-title">Webhooks</h1>
          <p className="page-subtitle">
            Receive real-time event notifications via HTTP
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="btn btn-primary gap-2">
          <Plus className="w-4 h-4" /> New Webhook
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="skeleton h-16 rounded-xl"
            />
          ))}
        </div>
      ) : webhooks.length === 0 ? (
        <div
          className="rounded-2xl py-20"
          style={{
            background: "var(--bg-elevated)",
            border: "1px dashed var(--border)",
          }}>
          <EmptyState
            icon={Webhook}
            title="No webhooks configured"
            description="Subscribe to events and receive real-time HTTP callbacks"
            action={
              <button
                onClick={() => setShowCreate(true)}
                className="btn btn-primary gap-2">
                <Plus className="w-4 h-4" /> Create Webhook
              </button>
            }
          />
        </div>
      ) : (
        <div className="space-y-2">
          {webhooks.map((wh, i) => (
            <div
              key={wh.id}
              className="rounded-xl overflow-hidden animate-slide-up"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                animationDelay: `${i * 40}ms`,
              }}>
              {/* Main row */}
              <div className="flex items-center gap-4 p-4">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    background: wh.isActive
                      ? "var(--success-dim)"
                      : "rgba(255,255,255,0.04)",
                  }}>
                  <Webhook
                    className="w-4 h-4"
                    style={{
                      color: wh.isActive
                        ? "var(--success)"
                        : "var(--text-muted)",
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <code
                      className="text-xs font-mono truncate"
                      style={{ color: "var(--text-primary)" }}>
                      {wh.url}
                    </code>
                    <CopyButton
                      text={wh.url}
                      size={12}
                    />
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(wh.events || []).slice(0, 4).map((ev) => (
                      <span
                        key={ev}
                        className="badge badge-muted text-[10px] font-mono">
                        {ev}
                      </span>
                    ))}
                    {(wh.events || []).length > 4 && (
                      <span className="badge badge-muted text-[10px]">
                        +{wh.events.length - 4} more
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={`badge ${wh.isActive ? "badge-success" : "badge-muted"}`}>
                    {wh.isActive ? "Active" : "Inactive"}
                  </span>
                  <button
                    onClick={() => toggleExpand(wh.id)}
                    className="btn btn-ghost p-1.5 text-xs gap-1">
                    {expandedId === wh.id ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(wh.id)}
                    disabled={deletingId === wh.id}
                    className="btn btn-danger p-1.5">
                    {deletingId === wh.id ? (
                      <Spinner size={13} />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Deliveries */}
              {expandedId === wh.id && (
                <div style={{ borderTop: "1px solid var(--border)" }}>
                  {deliveriesLoading === wh.id ? (
                    <div className="p-6 text-center">
                      <Spinner
                        size={20}
                        className="mx-auto"
                      />
                    </div>
                  ) : (deliveries[wh.id] || []).length === 0 ? (
                    <div
                      className="p-6 text-center text-sm"
                      style={{ color: "var(--text-muted)" }}>
                      No deliveries yet
                    </div>
                  ) : (
                    <table className="table-dark">
                      <thead>
                        <tr>
                          <th>Status</th>
                          <th>Event</th>
                          <th>Response</th>
                          <th>Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(deliveries[wh.id] || []).map((d) => (
                          <tr key={d.id}>
                            <td>
                              <div className="flex items-center gap-1.5">
                                <StatusIcon status={d.status} />
                                <span
                                  className={`badge ${statusBadge[d.status] || "badge-muted"}`}>
                                  {d.status}
                                </span>
                              </div>
                            </td>
                            <td>
                              <code
                                className="text-xs font-mono"
                                style={{ color: "var(--cyan)" }}>
                                {d.event}
                              </code>
                            </td>
                            <td>
                              <span
                                className={`badge ${d.response?.statusCode && d.response.statusCode < 300 ? "badge-success" : "badge-danger"}`}>
                                {d.response?.statusCode ?? "—"}
                              </span>
                            </td>
                            <td>{new Date(d.createdAt).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreated={(wh) => {
            setWebhooks((p) => [wh, ...p]);
            setShowCreate(false);
            toast.success("Webhook created");
          }}
        />
      )}
    </div>
  );
}
