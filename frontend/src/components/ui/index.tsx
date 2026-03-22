import { type ReactNode, useState } from "react";
import {
  Copy,
  Check,
  Loader2,
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
} from "lucide-react";
import type { User as UserType } from "../../shared/types/global.types";

/* ─────────────────────────────────────────────────────────────────────────────
   AvatarBubble — declared at MODULE level, never inside a render function.
   Receives `user` as a prop so it doesn't close over stale values.
───────────────────────────────────────────────────────────────────────────── */
export const AvatarBubble = ({
  user,
  size,
}: {
  user: UserType;
  size: number;
}) => {
  const initials = user.name?.charAt(0).toUpperCase() ?? "?";

  return (
    <div
      className="rounded-full overflow-hidden flex items-center justify-center text-white font-bold flex-shrink-0"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: user.avatar
          ? "transparent"
          : "linear-gradient(135deg, #6366f1, #818cf8)",
        boxShadow: user.avatar ? "none" : "0 0 10px rgba(99,102,241,0.3)",
      }}>
      {user.avatar && (
        <img
          src={user.avatar}
          alt={user.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            /* If S3 URL fails, hide the img and reveal the initials span */
            (e.currentTarget as HTMLImageElement).style.display = "none";
            const next = e.currentTarget
              .nextElementSibling as HTMLElement | null;
            if (next) next.removeAttribute("hidden");
          }}
        />
      )}
      {/* Initials fallback — hidden when a real avatar is set */}
      <span hidden={!!user.avatar}>{initials}</span>
    </div>
  );
};

/* ─── Spinner ─── */
export const Spinner = ({
  size = 16,
  className = "",
}: {
  size?: number;
  className?: string;
}) => (
  <Loader2
    className={`animate-spin ${className}`}
    style={{ width: size, height: size, color: "var(--accent)" }}
  />
);

/* ─── Page skeleton loader ─── */
export const PageSkeleton = ({ rows = 4 }: { rows?: number }) => (
  <div className="space-y-4 animate-fade-in">
    <div className="skeleton h-8 w-48 mb-6" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="skeleton h-24 rounded-xl"
        />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <div
        key={i}
        className="skeleton h-14 rounded-xl"
      />
    ))}
  </div>
);

/* ─── Empty state ─── */
export const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  action?: ReactNode;
}) => (
  <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
    <div
      className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid var(--border)",
      }}>
      <Icon
        className="w-7 h-7"
        style={{ color: "var(--text-muted)" }}
      />
    </div>
    <p
      className="text-base font-semibold mb-1"
      style={{ color: "var(--text-primary)" }}>
      {title}
    </p>
    {description && (
      <p
        className="text-sm mb-4 max-w-xs"
        style={{ color: "var(--text-muted)" }}>
        {description}
      </p>
    )}
    {action}
  </div>
);

/* ─── Copy button ─── */
export const CopyButton = ({
  text,
  className = "",
  size = 14,
}: {
  text: string;
  className?: string;
  size?: number;
}) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className={`flex items-center justify-center rounded transition-colors ${className}`}
      style={{ color: copied ? "var(--success)" : "var(--text-muted)" }}
      onMouseOver={(e) =>
        !copied && (e.currentTarget.style.color = "var(--text-secondary)")
      }
      onMouseOut={(e) =>
        !copied && (e.currentTarget.style.color = "var(--text-muted)")
      }>
      {copied ? (
        <Check style={{ width: size, height: size }} />
      ) : (
        <Copy style={{ width: size, height: size }} />
      )}
    </button>
  );
};

/* ─── Code row (inline copy) ─── */
export const CodeRow = ({
  value,
  label,
}: {
  value: string;
  label?: string;
}) => (
  <div>
    {label && <p className="label-dark">{label}</p>}
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-lg"
      style={{
        background: "rgba(0,0,0,0.3)",
        border: "1px solid var(--border)",
      }}>
      <code
        className="flex-1 text-xs font-mono truncate"
        style={{ color: "#a5f3fc" }}>
        {value}
      </code>
      <CopyButton
        text={value}
        size={13}
      />
    </div>
  </div>
);

/* ─── Alert ─── */
type AlertVariant = "info" | "success" | "warning" | "danger";
const alertStyles: Record<
  AlertVariant,
  { border: string; bg: string; icon: React.ElementType; color: string }
> = {
  info: {
    border: "rgba(99,102,241,0.3)",
    bg: "var(--accent-dim)",
    icon: Info,
    color: "var(--accent)",
  },
  success: {
    border: "rgba(16,185,129,0.3)",
    bg: "var(--success-dim)",
    icon: CheckCircle,
    color: "var(--success)",
  },
  warning: {
    border: "rgba(245,158,11,0.3)",
    bg: "var(--warning-dim)",
    icon: AlertTriangle,
    color: "var(--warning)",
  },
  danger: {
    border: "rgba(244,63,94,0.3)",
    bg: "var(--danger-dim)",
    icon: AlertCircle,
    color: "var(--danger)",
  },
};

export const Alert = ({
  variant = "info",
  children,
  className = "",
}: {
  variant?: AlertVariant;
  children: ReactNode;
  className?: string;
}) => {
  const s = alertStyles[variant];
  const Icon = s.icon;
  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-xl text-sm ${className}`}
      style={{
        background: s.bg,
        border: `1px solid ${s.border}`,
        color: s.color,
      }}>
      <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
};

/* ─── Toggle switch ─── */
export const Toggle = ({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => !disabled && onChange(!checked)}
    className="relative inline-flex h-5 w-9 rounded-full transition-colors duration-200 focus:outline-none"
    style={{
      background: checked ? "var(--accent)" : "rgba(255,255,255,0.1)",
      boxShadow: checked ? "0 0 10px var(--accent-glow)" : "none",
      opacity: disabled ? 0.5 : 1,
      cursor: disabled ? "not-allowed" : "pointer",
    }}>
    <span
      className="inline-block h-4 w-4 rounded-full bg-white transition-transform duration-200"
      style={{
        transform: checked ? "translateX(18px)" : "translateX(2px)",
        marginTop: 2,
        boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
      }}
    />
  </button>
);

/* ─── Section header ─── */
export const SectionHeader = ({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) => (
  <div className="flex items-start justify-between mb-6">
    <div>
      <h1 className="page-title">{title}</h1>
      {subtitle && <p className="page-subtitle">{subtitle}</p>}
    </div>
    {action && <div className="flex items-center gap-2">{action}</div>}
  </div>
);

/* ─── Confirm modal ─── */
export const ConfirmModal = ({
  title,
  description,
  confirmLabel = "Confirm",
  variant = "danger",
  onConfirm,
  onClose,
  loading = false,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: "danger" | "warning";
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
}) => (
  <div
    className="modal-backdrop"
    onClick={(e) => e.target === e.currentTarget && onClose()}>
    <div className="modal-box p-6 space-y-4">
      <h2
        className="text-base font-semibold"
        style={{ color: "var(--text-primary)" }}>
        {title}
      </h2>
      <p
        className="text-sm"
        style={{ color: "var(--text-secondary)" }}>
        {description}
      </p>
      <div className="flex justify-end gap-3 pt-2">
        <button
          className="btn btn-ghost"
          onClick={onClose}
          disabled={loading}>
          Cancel
        </button>
        <button
          className={`btn ${variant === "danger" ? "btn-danger" : "btn-primary"}`}
          onClick={onConfirm}
          disabled={loading}>
          {loading ? <Spinner size={14} /> : confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

/* ─── Input with icon ─── */
export const InputWithIcon = ({
  icon: Icon,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  icon?: React.ElementType;
  error?: string;
}) => (
  <div>
    <div className="relative">
      {Icon && (
        <Icon
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
          style={{ color: "var(--text-muted)" }}
        />
      )}
      <input
        {...props}
        className={`input-dark ${Icon ? "pl-9" : ""} ${props.className ?? ""}`}
      />
    </div>
    {error && (
      <p
        className="flex items-center gap-1 mt-1 text-xs"
        style={{ color: "var(--danger)" }}>
        <AlertCircle className="w-3 h-3" />
        {error}
      </p>
    )}
  </div>
);
