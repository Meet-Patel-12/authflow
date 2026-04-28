import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Monitor, Smartphone, Globe, Shield, LogOut } from "lucide-react";
import { authService } from "../../api/auth.api";
import { Spinner, EmptyState } from "../../components/ui";

interface Session {
  id: string;
  ipAddress: string;
  userAgent: string;
  lastActivity: string;
  createdAt: string;
}

/* ─── UA parser ─── */
const parseDevice = (userAgent: string) => {
  if (!userAgent)
    return {
      isMobile: false,
      label: "Unknown Device",
      browser: "Unknown",
      os: "Unknown",
    };
  const ua = userAgent.toLowerCase();

  const isMobile = /mobile|android|iphone|ipad/.test(ua);

  let os = "Unknown OS";
  if (ua.includes("windows")) os = "Windows";
  else if (ua.includes("mac os")) os = "macOS";
  else if (ua.includes("android")) os = "Android";
  else if (ua.includes("iphone") || ua.includes("ipad")) os = "iOS";
  else if (ua.includes("linux")) os = "Linux";

  let browser = "Unknown Browser";
  if (ua.includes("edg")) browser = "Edge";
  else if (ua.includes("chrome")) browser = "Chrome";
  else if (ua.includes("firefox")) browser = "Firefox";
  else if (ua.includes("safari") && !ua.includes("chrome")) browser = "Safari";
  else if (ua.includes("opera")) browser = "Opera";

  return { isMobile, label: `${browser} on ${os}`, browser, os };
};

/* ─── Session card ─── */
const SessionCard = ({
  session,
  isCurrent,
  revoking,
  onRevoke,
  delay = 0,
}: {
  session: Session;
  isCurrent: boolean;
  revoking: boolean;
  onRevoke: () => void;
  delay?: number;
}) => {
  const device = parseDevice(session.userAgent);
  const lastSeen = session.lastActivity
    ? new Date(session.lastActivity).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : new Date(session.createdAt).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

  return (
    <div
      className="flex items-center gap-4 px-5 py-4 rounded-2xl animate-slide-up transition-all"
      style={{
        background: isCurrent ? "rgba(99,102,241,0.06)" : "var(--bg-elevated)",
        border: `1px solid ${isCurrent ? "rgba(99,102,241,0.25)" : "var(--border)"}`,
        boxShadow: isCurrent ? "0 0 20px rgba(99,102,241,0.08)" : "none",
        animationDelay: `${delay}ms`,
      }}>
      {/* Device icon */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{
          background: isCurrent
            ? "var(--accent-dim)"
            : "rgba(255,255,255,0.05)",
          border: `1px solid ${isCurrent ? "rgba(99,102,241,0.2)" : "var(--border)"}`,
        }}>
        {device.isMobile ? (
          <Smartphone
            className="w-5 h-5"
            style={{ color: isCurrent ? "var(--accent)" : "var(--text-muted)" }}
          />
        ) : (
          <Monitor
            className="w-5 h-5"
            style={{ color: isCurrent ? "var(--accent)" : "var(--text-muted)" }}
          />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <p
            className="text-sm font-semibold"
            style={{ color: "var(--text-primary)" }}>
            {device.label}
          </p>
          {isCurrent && (
            <span className="badge badge-accent text-[10px]">
              Current Session
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1">
            <Globe
              className="w-3 h-3"
              style={{ color: "var(--text-muted)" }}
            />
            <span
              className="text-xs font-mono"
              style={{ color: "var(--text-muted)" }}>
              {session.ipAddress}
            </span>
          </div>
          <span style={{ color: "var(--border)" }}>·</span>
          <span
            className="text-xs"
            style={{ color: "var(--text-muted)" }}>
            Last active: {lastSeen}
          </span>
        </div>
      </div>

      {/* Revoke button */}
      <button
        onClick={onRevoke}
        disabled={revoking}
        className="btn flex-shrink-0 gap-1.5 text-xs"
        style={{
          background: "var(--danger-dim)",
          color: "var(--danger)",
          border: "1px solid rgba(244,63,94,0.2)",
        }}
        onMouseOver={(e) =>
          ((e.currentTarget as HTMLElement).style.background =
            "rgba(244,63,94,0.2)")
        }
        onMouseOut={(e) =>
          ((e.currentTarget as HTMLElement).style.background =
            "var(--danger-dim)")
        }>
        {revoking ? <Spinner size={13} /> : <LogOut className="w-3.5 h-3.5" />}
        {isCurrent ? "Logout" : "Revoke"}
      </button>
    </div>
  );
};

/* ═══════════════════════════════════════════
   MAIN
═══════════════════════════════════════════ */
const Sessions = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const res = await authService.getSessions();
      setSessions(res.data?.sessions || []);
      setCurrentSessionId(res.data?.currentSessionId || null);
    } catch {
      toast.error("Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  const revokeSession = async (id: string) => {
    if (id === currentSessionId) {
      if (!confirm("This will log you out of your current session. Continue?"))
        return;
    }
    setRevokingId(id);
    try {
      await authService.revokeSession(id);
      toast.success("Session revoked");
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch {
      toast.error("Failed to revoke session");
    } finally {
      setRevokingId(null);
    }
  };

  const revokeAllOthers = async () => {
    if (!confirm("Revoke all other sessions? You will stay logged in here."))
      return;
    setRevokingAll(true);
    try {
      await Promise.all(
        sessions
          .filter((s) => s.id !== currentSessionId)
          .map((s) => authService.revokeSession(s.id)),
      );
      toast.success("All other sessions revoked");
      setSessions((prev) => prev.filter((s) => s.id === currentSessionId));
    } catch {
      toast.error("Failed to revoke sessions");
    } finally {
      setRevokingAll(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const otherCount = sessions.filter((s) => s.id !== currentSessionId).length;

  /* Sort: current first */
  const sorted = [
    ...sessions.filter((s) => s.id === currentSessionId),
    ...sessions.filter((s) => s.id !== currentSessionId),
  ];

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="page-title">Active Sessions</h1>
          <p className="page-subtitle">
            Manage devices currently signed in to your account
            {sessions.length > 0 && (
              <span
                className="ml-2 font-semibold"
                style={{ color: "var(--accent)" }}>
                · {sessions.length}{" "}
                {sessions.length === 1 ? "session" : "sessions"}
              </span>
            )}
          </p>
        </div>

        {otherCount > 0 && (
          <button
            onClick={revokeAllOthers}
            disabled={revokingAll}
            className="btn gap-2 text-sm flex-shrink-0"
            style={{
              background: "var(--danger-dim)",
              color: "var(--danger)",
              border: "1px solid rgba(244,63,94,0.2)",
            }}
            onMouseOver={(e) =>
              ((e.currentTarget as HTMLElement).style.background =
                "rgba(244,63,94,0.2)")
            }
            onMouseOut={(e) =>
              ((e.currentTarget as HTMLElement).style.background =
                "var(--danger-dim)")
            }>
            {revokingAll ? (
              <>
                <Spinner size={13} /> Revoking…
              </>
            ) : (
              <>
                <LogOut className="w-4 h-4" /> Revoke others ({otherCount})
              </>
            )}
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Spinner size={26} />
          <p
            className="text-sm"
            style={{ color: "var(--text-muted)" }}>
            Loading sessions…
          </p>
        </div>
      )}

      {/* Empty */}
      {!loading && sessions.length === 0 && (
        <div
          className="rounded-2xl py-16"
          style={{
            background: "var(--bg-elevated)",
            border: "1px dashed var(--border)",
          }}>
          <EmptyState
            icon={Shield}
            title="No active sessions"
            description="You don't have any active sessions right now"
          />
        </div>
      )}

      {/* Sessions */}
      {!loading && sessions.length > 0 && (
        <div className="space-y-3">
          {sorted.map((session, i) => (
            <SessionCard
              key={session.id}
              session={session}
              isCurrent={session.id === currentSessionId}
              revoking={revokingId === session.id}
              onRevoke={() => revokeSession(session.id)}
              delay={i * 40}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Sessions;
